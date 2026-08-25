import { Injectable, Logger } from '@nestjs/common';
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
 * 用户消息入库 → RAG 检索 top-5 → system prompt（人格 + 称呼 + 资料 + 反编造规则）
 * + 最近 10 轮历史 → GLM 流式生成 → 完整回复入库。
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

  /** 历史消息（时间正序，最近 limit 条） */
  async getHistory(userId: string, limit = 100) {
    const desc = await this.prisma.chatMessage.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
    return desc.reverse();
  }

  /** 最近 20 条作为多轮上下文 */
  private async getContext(userId: string) {
    const desc = await this.prisma.chatMessage.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: CONTEXT_MESSAGE_LIMIT,
    });
    return desc.reverse();
  }

  /** 动态称呼：首页配置 siteName（与关于我署名同源） */
  private async getSiteName(): Promise<string> {
    const home = await this.prisma.homePage.findUnique({ where: { id: 'home' } });
    return home?.siteName || '慕士塔格猫';
  }

  /**
   * 组装 system prompt：人格 + 补充规则（称呼 / RAG 资料 / 反编造）。
   * personaOverride：人格编写页试聊时传入草稿人格。
   */
  private async buildSystemPrompt(personaOverride: string | undefined, chunksBlock: string): Promise<string> {
    const persona =
      personaOverride !== undefined ? personaOverride : await this.personaService.getContent();
    const siteName = await this.getSiteName();
    return `${persona}

【补充规则】
- 你的对外称呼是「${siteName}」，这是你在墨堆站点上的名字。
${chunksBlock}
- 资料未覆盖的信息，按你的人格规则诚实说明「这块我还没有告诉过你」，不要编造细节。`;
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
   * 流程：限流检查在 controller 层完成 → 用户消息入库 → 检索 → 流式生成 → 回复入库。
   */
  async run(userId: string, content: string, callbacks: ChatStreamCallbacks): Promise<void> {
    // 1. 用户消息先入库（生成失败也保留提问）
    await this.prisma.chatMessage.create({
      data: { userId, role: 'user', content },
    });

    // 2. RAG 检索（409 未配置 Key 时此处抛出，由 controller 转为 SSE error）
    const chunksBlock = await this.renderChunksBlock(content);

    // 3. 组装 messages（system + 最近 10 轮历史）
    const systemPrompt = await this.buildSystemPrompt(undefined, chunksBlock);
    const history = await this.getContext(userId);
    const messages: (SystemMessage | HumanMessage | AIMessage)[] = [
      new SystemMessage(systemPrompt),
      ...history.map((m) =>
        m.role === 'user' ? new HumanMessage(m.content) : new AIMessage(m.content),
      ),
    ];

    // 4. 流式生成
    const llm = await this.modelConfig.getLlm();
    let full = '';
    try {
      const stream = await llm.stream(messages);
      for await (const chunk of stream) {
        const text = this.extractText(chunk);
        if (text) {
          full += text;
          callbacks.onDelta(text);
        }
      }
    } catch (e: any) {
      // 已生成部分入库后发 error
      if (full) {
        await this.prisma.chatMessage.create({
          data: { userId, role: 'assistant', content: full },
        });
      }
      this.logger.error(`聊天生成失败: ${e?.message}`);
      callbacks.onError(e?.response?.data?.error?.message || e?.message || '生成回复失败，请稍后再试');
      return;
    }

    // 5. 完整回复入库
    const saved = await this.prisma.chatMessage.create({
      data: { userId, role: 'assistant', content: full },
    });
    callbacks.onDone(saved.id, full);
  }

  /**
   * 人格试聊（后台人格编写页）：草稿人格 + RAG + 称呼，一次性返回（不流式、不入库）。
   */
  async testChat(content: string, useDraft: boolean, draftPersona?: string): Promise<{ reply: string }> {
    const chunksBlock = await this.renderChunksBlock(content);
    const systemPrompt = await this.buildSystemPrompt(
      useDraft && draftPersona !== undefined ? draftPersona : undefined,
      chunksBlock,
    );

    const llm = await this.modelConfig.getLlm();
    const res = await llm.invoke([new SystemMessage(systemPrompt), new HumanMessage(content)]);
    return { reply: this.extractText(res) || String(res.content ?? '') };
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
