import {
  ConflictException,
  Injectable,
  InternalServerErrorException,
  Logger,
  OnModuleInit,
} from '@nestjs/common';
import { ChatOpenAI, OpenAIEmbeddings } from '@langchain/openai';
import { HumanMessage } from '@langchain/core/messages';
import { PrismaService } from '../prisma/prisma.service';
import { decryptSecret, encryptSecret, ensureEncryptionKey, maskSecret } from './crypto.util';
import { EMBEDDING_DIMENSIONS, ZHIPU_BASE_URL } from './digital-life.defaults';
import { UpdateModelConfigDto } from './dto/digital-life.dto';

/**
 * 数字生命模型配置服务：
 * - 管理 DlModelConfig（chat 模型 / embedding 模型 / 加密 API Key）
 * - 提供 LLM 与 Embeddings 实例构造（智谱 OpenAI 兼容端点，chat 与 embedding 共用 Key）
 * - 未配置 Key 时聊天/训练接口返回 409 业务错误
 */
@Injectable()
export class ModelConfigService implements OnModuleInit {
  private readonly logger = new Logger(ModelConfigService.name);

  constructor(private prisma: PrismaService) {}

  /** 启动时校验加密密钥（fail-fast：缺失或格式错误直接启动失败） */
  onModuleInit() {
    ensureEncryptionKey();
  }

  /** 后台读取配置（Key 脱敏，不返回明文） */
  async getConfig() {
    const config = await this.ensureRow();
    const hasApiKey = !!config.apiKeyEnc;
    return {
      chatModel: config.chatModel,
      embeddingModel: config.embeddingModel,
      hasApiKey,
      apiKeyMasked: hasApiKey ? maskSecret(this.decrypt(config.apiKeyEnc!)) : '',
    };
  }

  /** 后台保存配置：apiKey 提供则更新密文（空串清除），未提供保留原值 */
  async updateConfig(dto: UpdateModelConfigDto) {
    await this.ensureRow();
    const data: { chatModel?: string; embeddingModel?: string; apiKeyEnc?: string | null } = {};
    if (dto.chatModel !== undefined) data.chatModel = dto.chatModel.trim();
    if (dto.embeddingModel !== undefined) data.embeddingModel = dto.embeddingModel.trim();
    if (dto.apiKey !== undefined) {
      const key = dto.apiKey.trim();
      data.apiKeyEnc = key ? encryptSecret(key) : null;
    }
    await this.prisma.dlModelConfig.update({ where: { id: 'default' }, data });
    return this.getConfig();
  }

  /** 测试连接：以当前配置发起一次最小 chat 调用，返回成败与耗时 */
  async testConnection() {
    const started = Date.now();
    try {
      const llm = await this.getLlm();
      const res = await llm.invoke([new HumanMessage('你好')]);
      return {
        success: true,
        latencyMs: Date.now() - started,
        reply: String(res.content).slice(0, 100),
      };
    } catch (e: any) {
      this.logger.warn(`测试连接失败: ${e?.message}`);
      return {
        success: false,
        latencyMs: Date.now() - started,
        error: e?.response?.data?.error?.message || e?.message || '连接失败',
      };
    }
  }

  /** 构造 GLM 聊天模型（流式）；未配置 Key 抛 409 */
  async getLlm(): Promise<ChatOpenAI> {
    const { apiKey, chatModel } = await this.requireApiKeyAndConfig();
    return new ChatOpenAI({
      model: chatModel,
      apiKey,
      configuration: { baseURL: ZHIPU_BASE_URL },
      streaming: true,
      temperature: 0.7,
      maxTokens: 2048,
    });
  }

  /** 构造智谱 embedding-3 客户端（1024 维）；未配置 Key 抛 409 */
  async getEmbeddings(): Promise<OpenAIEmbeddings> {
    const { apiKey, embeddingModel } = await this.requireApiKeyAndConfig();
    return new OpenAIEmbeddings({
      model: embeddingModel,
      apiKey,
      configuration: { baseURL: ZHIPU_BASE_URL },
      dimensions: EMBEDDING_DIMENSIONS,
    });
  }

  /** 未配置 Key 时抛出 409 业务异常（聊天 / 训练 / 测试前调用） */
  async ensureApiKey(): Promise<void> {
    const config = await this.ensureRow();
    if (!config.apiKeyEnc) {
      throw new ConflictException('后台未配置模型 API Key，请前往「数字生命 → 模型管理」填写并保存');
    }
  }

  // ==================== internal ====================

  private async ensureRow() {
    const row = await this.prisma.dlModelConfig.findUnique({ where: { id: 'default' } });
    if (row) return row;
    return this.prisma.dlModelConfig.create({ data: { id: 'default' } });
  }

  /** 解密密文 Key（脱敏展示用） */
  private decrypt(enc: string): string {
    try {
      return decryptSecret(enc);
    } catch {
      throw new InternalServerErrorException(
        'API Key 解密失败，请检查 APP_ENCRYPTION_KEY 是否与加密时一致',
      );
    }
  }

  private async requireApiKeyAndConfig(): Promise<{
    apiKey: string;
    chatModel: string;
    embeddingModel: string;
  }> {
    const config = await this.ensureRow();
    if (!config.apiKeyEnc) {
      throw new ConflictException('后台未配置模型 API Key，请前往「数字生命 → 模型管理」填写并保存');
    }
    try {
      return {
        apiKey: decryptSecret(config.apiKeyEnc),
        chatModel: config.chatModel,
        embeddingModel: config.embeddingModel,
      };
    } catch {
      throw new InternalServerErrorException(
        'API Key 解密失败，请检查 APP_ENCRYPTION_KEY 是否与加密时一致',
      );
    }
  }
}
