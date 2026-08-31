import {
  BadRequestException,
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
  MODEL_TYPES,
  PROVIDER_BASE_URLS,
} from './digital-life.defaults';
import { UpdateDlModelDto } from './dto/digital-life.dto';

/**
 * 数字生命模型服务（多模型启停管理）：
 * - DlModel 列表 / 启停切换 / 单模型连通性测试 / 更新（含 API Key 加密）
 * - 模型类型：general 通用（对话）/ embedding 嵌入（训练与检索），预留扩展枚举
 * - 聊天：启用的「通用」模型按 sortOrder 顺序构造 LLM，对话自动 fallback，可指定模型
 * - Embedding：优先「启用的嵌入模型」→ 已配置 Key 的嵌入模型 → 兜底智谱 embedding-3（均 1024 维）
 */
@Injectable()
export class ModelConfigService implements OnModuleInit {
  private readonly logger = new Logger(ModelConfigService.name);

  constructor(private prisma: PrismaService) {}

  /** 启动时校验加密密钥（fail-fast：缺失或格式错误直接启动失败）、迁移旧数据、写入模型种子 */
  async onModuleInit() {
    ensureEncryptionKey();
    await this.migrateModelTypes();
    await this.seedModels();
  }

  /** 模型列表（含 hasApiKey 标记与 modelType，不返回 Key 明文/密文） */
  async list() {
    const rows = await this.prisma.dlModel.findMany({ orderBy: { sortOrder: 'asc' } });
    return rows.map((m) => ({
      id: m.id,
      name: m.name,
      provider: m.provider,
      modelId: m.modelId,
      modelType: m.modelType || 'general',
      enabled: m.enabled,
      sortOrder: m.sortOrder,
      hasApiKey: !!m.apiKeyEnc,
      apiKeyMasked: m.apiKeyEnc ? maskSecret(this.decrypt(m.apiKeyEnc)) : '',
    }));
  }

  /** 启用 / 停用切换（警告仅针对「通用」模型；嵌入模型启停不影响对话） */
  async toggle(id: string) {
    const model = await this.prisma.dlModel.findUnique({ where: { id } });
    if (!model) throw new NotFoundException('模型不存在');

    // 停用最后一个启用的「通用」模型时给出提醒（允许操作，聊天接口会返回 409）
    if (model.enabled && (model.modelType || 'general') === 'general') {
      const enabledCount = await this.prisma.dlModel.count({
        where: { enabled: true, modelType: 'general' },
      });
      if (enabledCount <= 1) {
        // 仍允许停用，但返回警告信息供前端提示
        const updated = await this.prisma.dlModel.update({
          where: { id },
          data: { enabled: false },
        });
        return {
          id: updated.id,
          enabled: updated.enabled,
          warning: '已停用全部通用模型，数字生命对话将暂不可用，请至少启用一个模型',
        };
      }
    }

    const updated = await this.prisma.dlModel.update({
      where: { id },
      data: { enabled: !model.enabled },
    });
    return { id: updated.id, enabled: updated.enabled };
  }

  /** 更新模型（name / modelId / modelType / apiKey；apiKey 提供则更新密文，空串清除，未提供保留） */
  async update(id: string, dto: UpdateDlModelDto) {
    const model = await this.prisma.dlModel.findUnique({ where: { id } });
    if (!model) throw new NotFoundException('模型不存在');

    const data: {
      name?: string;
      modelId?: string;
      modelType?: string;
      apiKeyEnc?: string | null;
    } = {};
    if (dto.name !== undefined) data.name = dto.name.trim();
    if (dto.modelId !== undefined) data.modelId = dto.modelId.trim();
    if (dto.modelType !== undefined) {
      if (!MODEL_TYPES.includes(dto.modelType as any)) {
        throw new BadRequestException(`不支持的模型类型：${dto.modelType}`);
      }
      data.modelType = dto.modelType;
    }
    if (dto.apiKey !== undefined) {
      const key = dto.apiKey.trim();
      data.apiKeyEnc = key ? encryptSecret(key) : null;
    }
    await this.prisma.dlModel.update({ where: { id }, data });
    return { success: true };
  }

  /** 单模型连通性测试：通用模型测对话、嵌入模型测向量，返回 { success, message } */
  async test(id: string) {
    const model = await this.prisma.dlModel.findUnique({ where: { id } });
    if (!model) throw new NotFoundException('模型不存在');

    if (!model.apiKeyEnc) {
      return { success: false, message: `「${model.name}」尚未配置 API Key，无法测试` };
    }

    const started = Date.now();
    try {
      const isEmbedding = (model.modelType || 'general') === 'embedding';
      if (isEmbedding) {
        const embeddings = this.buildEmbeddings(
          model.modelId,
          model.provider,
          this.decrypt(model.apiKeyEnc),
        );
        const vec = await embeddings.embedQuery('你好');
        const latency = Date.now() - started;
        return {
          success: true,
          message: `连接成功（${latency}ms）：向量维度 ${vec.length}`,
          latencyMs: latency,
        };
      }
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
   * 构造启用的「通用」LLM 列表（按 sortOrder，对话按顺序自动 fallback）。
   * 可选仅返回指定模型（前台聊天页指定模型时使用）。
   * 无启用模型或启用的模型均未配置 Key 时抛 409。
   */
  async getActiveLlms(
    modelId?: string,
  ): Promise<Array<{ llm: ChatOpenAI; modelName: string }>> {
    const models = await this.prisma.dlModel.findMany({
      where: {
        enabled: true,
        modelType: 'general',
        ...(modelId ? { id: modelId } : {}),
      },
      orderBy: { sortOrder: 'asc' },
    });
    if (!models.length) {
      throw new ConflictException('后台未启用任何通用模型，请前往「数字生命 → 模型管理」启用');
    }
    const withKey = models.filter((m) => m.apiKeyEnc);
    if (!withKey.length) {
      throw new ConflictException(
        '启用的通用模型均未配置 API Key，请前往「数字生命 → 模型管理」为模型配置 Key',
      );
    }
    return withKey.map((m) => ({
      llm: this.buildLlm(m.modelId, m.provider, this.decrypt(m.apiKeyEnc!)),
      modelName: m.name,
    }));
  }

  /** 聊天预检：至少存在一个「启用且有 Key」的通用模型（可指定模型 ID） */
  async ensureActiveModel(modelId?: string): Promise<void> {
    const where: any = {
      enabled: true,
      modelType: 'general',
      apiKeyEnc: { not: null },
    };
    if (modelId) where.id = modelId;
    const count = await this.prisma.dlModel.count({ where });
    if (count === 0) {
      throw new ConflictException(
        '后台未配置可用模型（需启用并填写 API Key），请前往「数字生命 → 模型管理」',
      );
    }
  }

  /** 前台聊天页可选的「通用」模型列表（启用且有 Key） */
  async listGeneralModels(): Promise<
    Array<{ id: string; name: string; provider: string; modelId: string }>
  > {
    const rows = await this.prisma.dlModel.findMany({
      where: { enabled: true, modelType: 'general', apiKeyEnc: { not: null } },
      orderBy: { sortOrder: 'asc' },
    });
    return rows.map((m) => ({ id: m.id, name: m.name, provider: m.provider, modelId: m.modelId }));
  }

  /** 训练页可选的「嵌入」模型列表（已配置 Key 的优先展示，未配置的也列出供配置后选择） */
  async listEmbeddingModels(): Promise<
    Array<{ id: string; name: string; provider: string; modelId: string; hasApiKey: boolean }>
  > {
    const rows = await this.prisma.dlModel.findMany({
      where: { modelType: 'embedding' },
      orderBy: [{ enabled: 'desc' }, { sortOrder: 'asc' }],
    });
    return rows.map((m) => ({
      id: m.id,
      name: m.name,
      provider: m.provider,
      modelId: m.modelId,
      hasApiKey: !!m.apiKeyEnc,
    }));
  }

  /** 将指定嵌入模型设为「当前唯一启用」的嵌入模型（保证训练与检索使用同一模型） */
  async setActiveEmbeddingModel(embeddingModelId: string) {
    const model = await this.prisma.dlModel.findUnique({ where: { id: embeddingModelId } });
    if (!model) throw new NotFoundException('指定的嵌入模型不存在');
    if ((model.modelType || 'general') !== 'embedding') {
      throw new BadRequestException('所选模型不是「嵌入」类型，无法作为嵌入模型');
    }
    await this.prisma.$transaction([
      this.prisma.dlModel.updateMany({
        where: { modelType: 'embedding', id: { not: embeddingModelId } },
        data: { enabled: false },
      }),
      this.prisma.dlModel.update({
        where: { id: embeddingModelId },
        data: { enabled: true },
      }),
    ]);
  }

  /**
   * 构造 embedding 客户端（1024 维）。
   * 指定 embeddingModelId 时使用该模型（须为「嵌入」类型且已配置 Key）；
   * 未指定时优先「启用的嵌入模型」→「已配置 Key 的嵌入模型」→ 兜底智谱 embedding-3。
   */
  async getEmbeddings(embeddingModelId?: string): Promise<OpenAIEmbeddings> {
    if (embeddingModelId) {
      const model = await this.prisma.dlModel.findUnique({ where: { id: embeddingModelId } });
      if (!model) throw new NotFoundException('指定的嵌入模型不存在');
      if ((model.modelType || 'general') !== 'embedding') {
        throw new BadRequestException('所选模型不是「嵌入」类型，无法用于训练');
      }
      if (!model.apiKeyEnc) {
        throw new ConflictException(
          `嵌入模型「${model.name}」尚未配置 API Key：请在「数字生命 → 模型管理」配置`,
        );
      }
      return this.buildEmbeddings(model.modelId, model.provider, this.decrypt(model.apiKeyEnc));
    }

    // 1. 当前启用中的嵌入模型（训练后由 setActiveEmbeddingModel 维护唯一启用）
    const enabled = await this.prisma.dlModel.findFirst({
      where: { modelType: 'embedding', enabled: true, apiKeyEnc: { not: null } },
      orderBy: { sortOrder: 'asc' },
    });
    if (enabled) {
      return this.buildEmbeddings(
        enabled.modelId,
        enabled.provider,
        this.decrypt(enabled.apiKeyEnc!),
      );
    }

    // 2. 任意已配置 Key 的嵌入模型
    const withKey = await this.prisma.dlModel.findFirst({
      where: { modelType: 'embedding', apiKeyEnc: { not: null } },
      orderBy: { sortOrder: 'asc' },
    });
    if (withKey) {
      return this.buildEmbeddings(
        withKey.modelId,
        withKey.provider,
        this.decrypt(withKey.apiKeyEnc!),
      );
    }

    // 3. 兜底：无「嵌入」类型模型时，用智谱 Key + embedding-3
    const zhipu = await this.prisma.dlModel.findFirst({
      where: { provider: 'zhipu', apiKeyEnc: { not: null } },
      orderBy: [{ enabled: 'desc' }, { sortOrder: 'asc' }],
    });
    if (!zhipu) {
      throw new ConflictException(
        '训练需要嵌入模型的 API Key：请在「数字生命 → 模型管理」为任一嵌入模型（或 GLM 模型）配置 Key',
      );
    }
    return new OpenAIEmbeddings({
      model: 'embedding-3',
      apiKey: this.decrypt(zhipu.apiKeyEnc!),
      configuration: { baseURL: PROVIDER_BASE_URLS.zhipu },
      dimensions: EMBEDDING_DIMENSIONS,
    });
  }

  /**
   * 兼容迁移：
   * 1) 旧数据中「通用」类型但 modelId 含 embedding 的模型 → 归类为「嵌入」类型，modelId 标准化为小写；
   * 2) 清理重复的嵌入模型记录（同 modelId 忽略大小写），保留有 Key / 启用 / sortOrder 较小者。
   */
  private async migrateModelTypes() {
    // 1) 旧嵌入模型归类
    const stale = await this.prisma.dlModel.findMany({
      where: {
        modelType: { in: ['general'] },
        modelId: { contains: 'embedding', mode: 'insensitive' },
      },
    });
    for (const m of stale) {
      await this.prisma.dlModel.update({
        where: { id: m.id },
        data: { modelType: 'embedding', modelId: m.modelId.toLowerCase() },
      });
    }
    if (stale.length) {
      this.logger.log(
        `已将 ${stale.length} 个旧嵌入模型自动归类为「嵌入」类型：${stale.map((m) => m.modelId).join(', ')}`,
      );
    }

    // 2) 清理重复嵌入模型（同 modelId 忽略大小写）
    const embeds = await this.prisma.dlModel.findMany({ where: { modelType: 'embedding' } });
    const groups = new Map<string, typeof embeds>();
    for (const e of embeds) {
      const k = e.modelId.toLowerCase();
      if (!groups.has(k)) groups.set(k, []);
      groups.get(k)!.push(e);
    }
    let removed = 0;
    for (const group of groups.values()) {
      if (group.length < 2) continue;
      const sorted = [...group].sort((a, b) => {
        const ka = a.apiKeyEnc ? 1 : 0;
        const kb = b.apiKeyEnc ? 1 : 0;
        if (ka !== kb) return kb - ka;
        const ea = a.enabled ? 1 : 0;
        const eb = b.enabled ? 1 : 0;
        if (ea !== eb) return eb - ea;
        return a.sortOrder - b.sortOrder;
      });
      for (const dup of sorted.slice(1)) {
        await this.prisma.dlModel.delete({ where: { id: dup.id } });
        removed++;
      }
    }
    if (removed) {
      this.logger.log(`已清理 ${removed} 条重复的嵌入模型记录`);
    }
  }

  /**
   * 模型种子（幂等）：空表全量写入默认模型；非空表补种缺失的默认模型
   * （按 modelId 判重，不覆盖已有记录的名称 / Key / 启停状态）。
   * 补种模型排在现有列表末尾（sortOrder 取现有最大值递增），避免排序冲突。
   */
  async seedModels() {
    const existing = await this.prisma.dlModel.findMany({
      select: { modelId: true, sortOrder: true },
    });
    const existingIds = new Set(existing.map((m) => m.modelId));
    const missing = DEFAULT_MODELS.filter((m) => !existingIds.has(m.modelId));
    if (!missing.length) return false;

    let nextOrder = existing.reduce((max, m) => Math.max(max, m.sortOrder), -1);
    await this.prisma.dlModel.createMany({
      data: missing.map((m) => ({ ...m, sortOrder: ++nextOrder })),
    });
    this.logger.log(
      `已写入默认模型种子 ${missing.length} 条：${missing.map((m) => m.modelId).join(', ')}`,
    );
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

  /** 按 provider 构造 OpenAI 兼容 embedding 客户端（固定 1024 维） */
  private buildEmbeddings(modelId: string, provider: string, apiKey: string): OpenAIEmbeddings {
    const baseURL = PROVIDER_BASE_URLS[provider] || PROVIDER_BASE_URLS.zhipu;
    return new OpenAIEmbeddings({
      model: modelId,
      apiKey,
      configuration: { baseURL },
      dimensions: EMBEDDING_DIMENSIONS,
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
