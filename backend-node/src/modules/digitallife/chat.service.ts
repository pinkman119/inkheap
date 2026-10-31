import { ConflictException, Injectable, Logger } from '@nestjs/common';
import { AIMessage, AIMessageChunk, HumanMessage, SystemMessage } from '@langchain/core/messages';
import { PrismaService } from '../prisma/prisma.service';
import { ModelConfigService } from './model-config.service';
import { PersonaService } from './persona.service';
import { VectorService } from './vector.service';
import { REF_TYPE_LABELS, RefType } from './training.service';

export interface ChatStreamCallbacks {
  onDelta: (text: string) => void;
  onDone: (messageId: string, content: string) => void;
  onError: (message: string) => void;
}

/** 上下文窗口：最近 20 条消息（约 10 轮） */
const CONTEXT_MESSAGE_LIMIT = 20;
/** RAG 检索 top-K */
const RAG_TOP_K = 5;

/**
 * 数字生命聊天服务：
 * 用户消息入库 → RAG 检索 top-5 → system prompt（结构化人格 + 资料 + 反编造规则）
 * + 最近 10 轮历史 → 启用模型按顺序流式生成（失败自动切换下一个）→ 完整回复入库。
 */
@Injectable()
export class ChatService {
  private readonly logger = new Logger(ChatService.name);

  constructor(
    private prisma: PrismaService,
    private modelConfig: ModelConfigService,
    private personaService: PersonaService,
    private vectorService: VectorService,
  ) {}

  /** 历史消息（时间正序，最近 limit 条；sessionId 为空时仅查默认/旧会话） */
  async getHistory(userId: string, sessionId?: string, limit = 100) {
    const desc = await this.prisma.chatMessage.findMany({
      where: { userId, sessionId: sessionId || null },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
    return desc.reverse();
  }

  /** 最近 20 条作为多轮上下文（按会话隔离） */
  private async getContext(userId: string, sessionId?: string) {
    const desc = await this.prisma.chatMessage.findMany({
      where: { userId, sessionId: sessionId || null },
      orderBy: { createdAt: 'desc' },
      take: CONTEXT_MESSAGE_LIMIT,
    });
    return desc.reverse();
  }

  /**
   * 组装 system prompt：结构化人格（description 为核心）+ 补充规则（自称 / RAG 资料 / 反编造）。
   */
  private async buildSystemPrompt(chunksBlock: string): Promise<string> {
    const persona = await this.personaService.getActivePersona();
    if (!persona) {
      throw new ConflictException('尚未配置数字生命人格，请前往「数字生命 → 人格编写」');
    }

    const sections: string[] = [];
    // 核心人格（description 可承载完整人格文本）
    if (persona.description.trim()) {
      sections.push(persona.description.trim());
    }
    // 人格设定摘要
    const settings: string[] = [`- 你的名字：「${persona.name}」，对话中以此自称`];
    if (persona.personalityType.trim()) settings.push(`- 人格类型：${persona.personalityType}`);
    if (persona.styleHint.trim()) settings.push(`- 回复风格：${persona.styleHint}`);
    if (persona.greeting.trim()) settings.push(`- 你的问候语参考：${persona.greeting}`);
    sections.push(`【人格设定】\n${settings.join('\n')}`);

    // 基本信息（站主填写的事实性资料，回答相关内容时必须优先依据，不得编造）
    if (persona.basicInfo.trim()) {
      sections.push(
        `【基本信息】\n以下是站主提供的事实性基本信息，当对方的问题涉及这些内容时，必须优先依据其回答，不要编造或更改：\n${persona.basicInfo.trim()}`,
      );
    }

    // RAG 资料与反编造规则
    sections.push(`【补充规则】\n${chunksBlock}\n- 资料未覆盖的信息，按你的人格规则诚实说明「这块我还没有告诉过你」，不要编造细节。`);

    return sections.join('\n\n');
  }

  /** RAG 检索并渲染资料片段块（检索异常时返回空资料占位） */
  private async renderChunksBlock(question: string): Promise<string> {
    try {
      const chunks = await this.vectorService.search(question, RAG_TOP_K);
      if (!chunks.length) {
        return '- 以下无检索到的资料片段，按你的人格与已知信息回答。';
      }
      const lines = chunks.map((c) => {
        const label = REF_TYPE_LABELS[c.refType as RefType] ?? c.refType;
        return `- （来源：${label}）${c.content}`;
      });
      return `- 以下是从站长知识库/小记/简历/关于我中检索到的资料片段，回答时优先依据资料：\n${lines.join('\n')}`;
    } catch (e: any) {
      // 未配置 Key（409）等情况直接向上抛
      if (e?.status === 409) throw e;
      this.logger.warn(`RAG 检索失败，跳过资料注入: ${e?.message}`);
      return '- （资料检索暂不可用，按你的人格与已知信息回答）';
    }
  }

  /**
   * 完整聊天流程（SSE 回调驱动）。
   * 流程：限流/模型预检在 controller 层完成 → 用户消息入库 → 检索 →
   * 通用模型按顺序流式生成（可指定模型；首个 chunk 前失败自动切换下一个，已输出后失败则终止）→ 回复入库。
   */
  async run(
    userId: string,
    sessionId: string | undefined,
    content: string,
    callbacks: ChatStreamCallbacks & { modelId?: string; clientIp?: string },
  ): Promise<void> {
    // 1. 用户消息先入库（生成失败也保留提问；ip 为明文存储，仅后台可见）
    await this.prisma.chatMessage.create({
      data: {
        userId,
        sessionId: sessionId || null,
        role: 'user',
        content,
        ip: callbacks.clientIp ?? null,
      },
    });

    // 2. RAG 检索（409 未配置 Key 时此处抛出，由 controller 转为 SSE error）
    const chunksBlock = await this.renderChunksBlock(content);

    // 3. 组装 messages（system + 最近 10 轮历史）
    const systemPrompt = await this.buildSystemPrompt(chunksBlock);
    const history = await this.getContext(userId, sessionId);
    const messages: (SystemMessage | HumanMessage | AIMessage)[] = [
      new SystemMessage(systemPrompt),
      ...history.map((m) =>
        m.role === 'user' ? new HumanMessage(m.content) : new AIMessage(m.content),
      ),
    ];

    // 4. 通用模型按顺序尝试（可指定模型，未指定则全部启用模型自动 fallback）
    const llms = await this.modelConfig.getActiveLlms(callbacks.modelId);
    let full = '';
    let lastError = '';

    for (const { llm, modelName } of llms) {
      try {
        const stream = await llm.stream(messages);
        for await (const chunk of stream) {
          const text = this.extractText(chunk);
          if (text) {
            full += text;
            callbacks.onDelta(text);
          }
        }
        // 本模型完整输出 → 结束
        lastError = '';
        break;
      } catch (e: any) {
        lastError = e?.response?.data?.error?.message || e?.message || '生成失败';
        this.logger.warn(`模型「${modelName}」生成失败: ${lastError}`);
        if (full) {
          // 已有输出（流中断）：不再切换模型，保留已生成部分
          break;
        }
        // 尚无输出：切换下一个模型重试
        continue;
      }
    }

    // 5. 结果处理
    if (!full) {
      this.logger.error(`全部模型生成失败: ${lastError}`);
      callbacks.onError(
        lastError
          ? `生成回复失败：${lastError}（已尝试 ${llms.length} 个启用的模型）`
          : '生成回复失败，请稍后再试',
      );
      return;
    }

    const saved = await this.prisma.chatMessage.create({
      data: {
        userId,
        sessionId: sessionId || null,
        role: 'assistant',
        content: full,
        ip: callbacks.clientIp ?? null,
      },
    });
    callbacks.onDone(saved.id, full);
  }

  /** 从 AIMessageChunk / AIMessage 提取文本（content 可能为 string 或 parts 数组） */
  private extractText(chunk: AIMessageChunk | any): string {
    const c = chunk?.content;
    if (typeof c === 'string') return c;
    if (Array.isArray(c)) {
      return c
        .map((p: any) => (typeof p === 'string' ? p : p?.text ?? ''))
        .join('');
    }
    return '';
  }
}
