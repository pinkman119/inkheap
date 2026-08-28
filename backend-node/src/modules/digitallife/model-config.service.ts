import {
  ConflictException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import { ChatOpenAI, OpenAIEmbeddings } from '@langchain/openai';
import { HumanMessage } from '@langchain/core/messages';
import { PrismaService } from '../prisma/prisma.service';
import { decryptSecret, encryptSecret, ensureEncryptionKey, maskSecret } from './crypto.util';
import {
  DEFAULT_MODELS,
  EMBEDDING_DIMENSIONS,
  PROVIDER_BASE_URLS,
} from './digital-life.defaults';
import { UpdateDlModelDto } from './dto/digital-life.dto';

/**
 * 数字生命模型服务（多模型启停管理）：
 * - DlModel 列表 / 启停切换 / 单模型连通性测试 / 更新（含 API Key 加密）
 * - 聊天：启用的模型按 sortOrder 顺序构造 LLM，对话自动 fallback
 * - Embedding：固定智谱 embedding-3（1024 维），Key 取自配置了 Key 的智谱模型
 */
@Injectable()
export class ModelConfigService implements OnModuleInit {
  private readonly logger = new Logger(ModelConfigService.name);

  constructor(private prisma: PrismaService) {}

  /** 启动时校验加密密钥（fail-fast：缺失或格式错误直接启动失败） */
  onModuleInit() {
    ensureEncryptionKey();
  }

  /** 模型列表（含 hasApiKey 标记，不返回 Key 明文/密文） */
  async list() {
    const rows = await this.prisma.dlModel.findMany({ orderBy: { sortOrder: 'asc' } });
    return rows.map((m) => ({
      id: m.id,
      name: m.name,
      provider: m.provider,
      modelId: m.modelId,
      enabled: m.enabled,
      sortOrder: m.sortOrder,
      hasApiKey: !!m.apiKeyEnc,
      apiKeyMasked: m.apiKeyEnc ? maskSecret(this.decrypt(m.apiKeyEnc)) : '',
    }));
  }

  /** 启用 / 停用切换 */
  async toggle(id: string) {
    const model = await this.prisma.dlModel.findUnique({ where: { id } });
    if (!model) throw new NotFoundException('模型不存在');

    // 停用最后一个启用模型时给出提醒（允许操作，聊天接口会返回 409）
    if (model.enabled) {
      const enabledCount = await this.prisma.dlModel.count({ where: { enabled: true } });
      if (enabledCount <= 1) {
        // 仍允许停用，但返回警告信息供前端提示
        const updated = await this.prisma.dlModel.update({
          where: { id },
          data: { enabled: false },
        });
        return {
          id: updated.id,
          enabled: updated.enabled,
          warning: '已停用全部模型，数字生命对话将暂不可用，请至少启用一个模型',
        };
      }
    }

    const updated = await this.prisma.dlModel.update({
      where: { id },
      data: { enabled: !model.enabled },
    });
    return { id: updated.id, enabled: updated.enabled };
  }

  /** 更新模型（name / modelId / apiKey；apiKey 提供则更新密文，空串清除，未提供保留） */
  async update(id: string, dto: UpdateDlModelDto) {
    const model = await this.prisma.dlModel.findUnique({ where: { id } });
    if (!model) throw new NotFoundException('模型不存在');

    const data: { name?: string; modelId?: string; apiKeyEnc?: string | null } = {};
    if (dto.name !== undefined) data.name = dto.name.trim();
    if (dto.modelId !== undefined) data.modelId = dto.modelId.trim();
    if (dto.apiKey !== undefined) {
      const key = dto.apiKey.trim();
      data.apiKeyEnc = key ? encryptSecret(key) : null;
    }
    await this.prisma.dlModel.update({ where: { id }, data });
    return { success: true };
  }

  /** 单模型连通性测试：返回 { success, message } */
  async test(id: string) {
    const model = await this.prisma.dlModel.findUnique({ where: { id } });
    if (!model) throw new NotFoundException('模型不存在');

    if (!model.apiKeyEnc) {
      return { success: false, message: `「${model.name}」尚未配置 API Key，无法测试` };
    }

    const started = Date.now();
    try {
      const llm = this.buildLlm(model.modelId, model.provider, this.decrypt(model.apiKeyEnc));
      const res = await llm.invoke([new HumanMessage('你好')]);
      const reply = String(res.content ?? '').slice(0, 80);
      const latency = Date.now() - started;
      return {
        success: true,
        message: `连接成功（${latency}ms）：${reply || '（模型返回空）'}`,
        latencyMs: latency,
      };
    } catch (e: any) {
      this.logger.warn(`模型「${model.name}」测试失败: ${e?.message}`);
      return {
        success: false,
        message: `连接失败：${e?.response?.data?.error?.message || e?.message || '未知错误'}`,
      };
    }
  }

  /**
   * 构造启用的 LLM 列表（按 sortOrder，对话按顺序自动 fallback）。
   * 无启用模型或启用的模型均未配置 Key 时抛 409。
   */
  async getActiveLlms(): Promise<Array<{ llm: ChatOpenAI; modelName: string }>> {
    const models = await this.prisma.dlModel.findMany({
      where: { enabled: true },
      orderBy: { sortOrder: 'asc' },
    });
    if (!models.length) {
      throw new ConflictException('后台未启用任何模型，请前往「数字生命 → 模型管理」启用');
    }
    const withKey = models.filter((m) => m.apiKeyEnc);
    if (!withKey.length) {
      throw new ConflictException(
        '启用的模型均未配置 API Key，请前往「数字生命 → 模型管理」为模型配置 Key',
      );
    }
    return withKey.map((m) => ({
      llm: this.buildLlm(m.modelId, m.provider, this.decrypt(m.apiKeyEnc!)),
      modelName: m.name,
    }));
  }

  /** 聊天预检：至少存在一个「启用且有 Key」的模型 */
  async ensureActiveModel(): Promise<void> {
    const count = await this.prisma.dlModel.count({
      where: { enabled: true, apiKeyEnc: { not: null } },
    });
    if (count === 0) {
      throw new ConflictException(
        '后台未配置可用模型（需启用并填写 API Key），请前往「数字生命 → 模型管理」',
      );
    }
  }

  /**
   * 构造智谱 embedding-3 客户端（1024 维）。
   * Key 取自「provider=zhipu 且已配置 Key」的模型（启用优先）。
   */
  async getEmbeddings(): Promise<OpenAIEmbeddings> {
    const zhipu = await this.prisma.dlModel.findFirst({
      where: { provider: 'zhipu', apiKeyEnc: { not: null } },
      orderBy: [{ enabled: 'desc' }, { sortOrder: 'asc' }],
    });
    if (!zhipu) {
      throw new ConflictException(
        '训练需要智谱（GLM）模型的 API Key：请在「数字生命 → 模型管理」为任一 GLM 模型配置 Key',
      );
    }
    return new OpenAIEmbeddings({
      model: 'embedding-3',
      apiKey: this.decrypt(zhipu.apiKeyEnc!),
      configuration: { baseURL: PROVIDER_BASE_URLS.zhipu },
      dimensions: EMBEDDING_DIMENSIONS,
    });
  }

  /** 无模型数据时写入默认种子（幂等，已有记录不覆盖） */
  async seedIfEmpty() {
    const count = await this.prisma.dlModel.count();
    if (count > 0) return false;
    await this.prisma.dlModel.createMany({ data: DEFAULT_MODELS });
    return true;
  }

  // ==================== internal ====================

  private buildLlm(modelId: string, provider: string, apiKey: string): ChatOpenAI {
    const baseURL = PROVIDER_BASE_URLS[provider] || PROVIDER_BASE_URLS.zhipu;
    return new ChatOpenAI({
      model: modelId,
      apiKey,
      configuration: { baseURL },
      streaming: true,
      temperature: 0.7,
      maxTokens: 2048,
    });
  }

  /** 解密密文 Key */
  private decrypt(enc: string): string {
    try {
      return decryptSecret(enc);
    } catch {
      throw new InternalServerErrorException(
        'API Key 解密失败，请检查 APP_ENCRYPTION_KEY 是否与加密时一致',
      );
    }
  }
}
