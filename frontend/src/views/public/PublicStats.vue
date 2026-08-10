<template>
  <div class="rag-page">
    <!-- 页面头部 -->
    <header class="rag-header">
      <div class="rag-header__info">
        <div class="rag-header__icon">
          <img :src="headImg" alt="头像" />
        </div>
        <div>
          <h1 class="rag-header__title">慕士塔格猫</h1>
          <p class="rag-header__subtitle">你好，这是「慕士塔格猫」。如果你想了解我，你可以向我提问，我已经蒸馏了「慕士塔格猫」的全部习惯、爱好、表达方式、思想，同时RAG处理了「慕士塔格猫」掌握的知识库，希望可以和你聊的愉快。可以说我是一个全面的我，但不是全部的我！</p>
          <div class="rag-header__tags">
            <span class="rag-header__tag">💻 程序员</span>
            <span class="rag-header__tag">🗄️ 数据库工程师</span>
            <span class="rag-header__tag">📊 系统分析师</span>
            <span class="rag-header__tag">🎌 党员</span>
            <span class="rag-header__tag">🚑 急救员</span>
            <span class="rag-header__tag">📷 摄影师</span>
            <span class="rag-header__tag">🏔️ 登山爱好者</span>
            <span class="rag-header__tag">🕊️ 非暴力沟通</span>
          </div>
        </div>
      </div>
    </header>

    <!-- 对话区域 -->
    <div class="rag-chat" ref="chatContainerRef">
      <!-- 欢迎提示 -->
      <div v-if="messages.length === 0" class="rag-welcome">
        <div class="rag-welcome__icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
        </div>
        <h2 class="rag-welcome__title">开始对话</h2>
        <p class="rag-welcome__desc">在下方输入你的问题，我会基于知识库为你检索并生成回答</p>
        <div class="rag-welcome__suggestions">
          <button
            v-for="s in suggestions"
            :key="s"
            class="rag-welcome__suggestion"
            @click="sendSuggestion(s)"
          >
            {{ s }}
          </button>
        </div>
      </div>

      <!-- 消息列表 -->
      <div
        v-for="(msg, idx) in messages"
        :key="idx"
        class="rag-message"
        :class="`rag-message--${msg.role}`"
      >
        <!-- 用户消息：带对话框 -->
        <div v-if="msg.role === 'user'" class="rag-message__bubble rag-message__bubble--user">
          <span class="rag-message__text">{{ msg.content }}</span>
        </div>

        <!-- AI 消息：无对话框 -->
        <div v-else class="rag-message__ai">
          <div class="rag-message__ai-avatar">
            <img :src="headImg" alt="头像" />
          </div>
          <div class="rag-message__ai-content">
            <span class="rag-message__text" v-html="renderMarkdown(msg.content)"></span>
            <!-- 正在打字指示器 -->
            <span v-if="msg.isTyping" class="rag-message__typing">
              <span class="rag-message__typing-dot"></span>
              <span class="rag-message__typing-dot"></span>
              <span class="rag-message__typing-dot"></span>
            </span>
          </div>
        </div>
      </div>
    </div>

    <!-- 输入区域 -->
    <div class="rag-input-area">
      <div class="rag-input-box">
        <textarea
          ref="inputRef"
          v-model="inputText"
          class="rag-input-box__textarea"
          placeholder="输入你的问题..."
          rows="1"
          @keydown.enter.exact="handleSend"
          @input="autoResize"
        ></textarea>
        <button
          class="rag-input-box__send"
          :class="{ 'rag-input-box__send--active': inputText.trim() }"
          :disabled="!inputText.trim() || isSending"
          @click="handleSend()"
          aria-label="发送"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M22 2L11 13" />
            <path d="M22 2L15 22L11 13L2 9L22 2Z" />
          </svg>
        </button>
      </div>
      <p class="rag-input-area__hint">按 Enter 发送，Shift + Enter 换行</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, nextTick, onMounted } from 'vue';
import headImg from '@/img/head.jpg';

// ==================== 类型定义 ====================

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  isTyping?: boolean;
}

// ==================== 响应式状态 ====================

const messages = ref<ChatMessage[]>([]);
const inputText = ref('');
const isSending = ref(false);
const chatContainerRef = ref<HTMLElement | null>(null);
const inputRef = ref<HTMLTextAreaElement | null>(null);

const suggestions = [
  '什么是RAG？',
  '如何优化检索效果？',
  '向量数据库有哪些？',
  'RAG和微调的区别？'
];

// ==================== 模拟回答数据 ====================

const mockResponses: Record<string, string> = {
  '什么是RAG？': `**RAG（Retrieval-Augmented Generation）** 即检索增强生成，是一种将**信息检索**与**大语言模型生成**相结合的技术架构。\n\n核心流程：\n1. **检索阶段** — 将用户问题转化为向量，从知识库中检索最相关的文档片段\n2. **增强阶段** — 将检索到的上下文信息与用户问题一起组装为 Prompt\n3. **生成阶段** — LLM 基于增强后的 Prompt 生成最终回答\n\nRAG 的优势在于：\n- 减少 LLM 的幻觉问题\n- 回答可溯源、可验证\n- 知识库可动态更新，无需重新训练模型`,

  '如何优化检索效果？': `优化 RAG 检索效果可以从以下几个维度入手：\n\n**1. 文档分块策略**\n- 控制 chunk 大小（通常 256~1024 tokens）\n- 保持语义完整性，避免跨段落截断\n- 使用滑动窗口增加重叠区域\n\n**2. Embedding 模型选择**\n- 选用支持中文的模型（如 bge-large-zh）\n- 针对领域数据微调 Embedding 模型\n\n**3. 混合检索**\n- 结合向量检索与关键词检索（BM25）\n- 使用 Reranker 对检索结果重排序\n\n**4. Query 优化**\n- 查询改写（Query Rewriting）\n- 多路召回 + 融合排序`,

  '向量数据库有哪些？': `主流向量数据库对比：\n\n| 数据库 | 特点 | 适用场景 |\n|--------|------|----------|\n| **Milvus** | 分布式架构，高性能 | 大规模生产环境 |\n| **Pinecone** | 全托管，零运维 | 快速上线的项目 |\n| **Weaviate** | 支持混合搜索 | 需要结构化+向量检索 |\n| **Chroma** | 轻量开源 | 原型验证、小规模应用 |\n| **Qdrant** | Rust 实现，低延迟 | 对延迟敏感的场景 |\n| **pgvector** | PG 扩展，SQL 生态 | 已有 PostgreSQL 的项目 |\n\n选型建议：\n- **原型阶段** → Chroma，最快上手\n- **生产环境** → Milvus 或 Pinecone\n- **已有 PG 基础** → pgvector 无缝集成`,

  'RAG和微调的区别？': `RAG 和微调（Fine-tuning）是增强 LLM 能力的两种不同路线：\n\n**RAG**\n- 动态注入最新知识\n- 回答可溯源\n- 无需重新训练\n- 适合知识频繁更新的场景\n\n**微调**\n- 改变模型行为和风格\n- 推理时无需外部检索\n- 适合领域特定的推理模式\n- 知识固化在模型参数中\n\n**何时选择 RAG？**\n- 知识库需要频繁更新\n- 要求回答可引用来源\n- 不想承担训练成本\n\n**何时选择微调？**\n- 需要模型学习特定推理模式\n- 对推理延迟要求高\n- 有充足的领域训练数据\n\n**最佳实践**：两者可以结合——先用微调调整模型风格，再用 RAG 注入动态知识。`
};

// ==================== 方法 ====================

/** 简易 Markdown 渲染（粗体、换行、列表） */
const renderMarkdown = (text: string): string => {
  return text
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\n/g, '<br/>');
};

/** 自动调整输入框高度 */
const autoResize = () => {
  const el = inputRef.value;
  if (!el) return;
  el.style.height = 'auto';
  el.style.height = Math.min(el.scrollHeight, 150) + 'px';
};

/** 发送建议问题 */
const sendSuggestion = (text: string) => {
  inputText.value = text;
  handleSend();
};

/** 发送消息 */
const handleSend = (e?: KeyboardEvent | Event) => {
  if (e && 'preventDefault' in e) e.preventDefault();
  const text = inputText.value.trim();
  if (!text || isSending.value) return;

  // 添加用户消息
  messages.value.push({ role: 'user', content: text });
  inputText.value = '';
  if (inputRef.value) {
    inputRef.value.style.height = 'auto';
  }

  scrollToBottom();

  // 模拟 AI 回复
  isSending.value = true;

  // 先显示打字指示器
  const aiMsg: ChatMessage = { role: 'assistant', content: '', isTyping: true };
  messages.value.push(aiMsg);
  scrollToBottom();

  // 模拟延迟后开始流式输出
  setTimeout(() => {
    const response = mockResponses[text] || generateGenericResponse(text);
    aiMsg.isTyping = false;
    streamOutput(aiMsg, response);
    isSending.value = false;
  }, 80 + Math.random() * 60);
};

/** 流式输出 — 按语义 chunk 逐块追加，模拟后端 SSE 推送 */
const streamOutput = (msg: ChatMessage, fullText: string) => {
  const chunks = splitIntoChunks(fullText);
  let chunkIdx = 0;

  const pump = () => {
    if (chunkIdx >= chunks.length) return;

    const chunk = chunks[chunkIdx];
    msg.content += chunk;
    chunkIdx++;
    scrollToBottom();

    // 根据chunk类型决定延迟：换行处停顿更久，模拟段落切换
    const delay = chunk.includes('\n')
      ? 120 + Math.random() * 180   // 段落停顿 120~300ms
      : 30 + Math.random() * 70;    // 普通token 30~100ms
    setTimeout(pump, delay);
  };

  pump();
};

/** 将文本按语义拆分为 chunk，模拟 SSE token 推送粒度 */
const splitIntoChunks = (text: string): string[] => {
  const chunks: string[] = [];
  let i = 0;

  while (i < text.length) {
    // 向前看是否即将遇到换行（2字符以内），如果是则合并到换行处
    const lookahead = text.slice(i, i + 6);
    const nearLineBreak = lookahead.indexOf('\n');

    if (nearLineBreak !== -1 && nearLineBreak <= 4) {
      // 即将遇到换行，直接取到换行符后一位
      const end = Math.min(i + nearLineBreak + 1, text.length);
      // 如果是连续换行（\n\n），一起取走
      const end2 = end < text.length && text[end] === '\n' ? end + 1 : end;
      chunks.push(text.slice(i, end2));
      i = end2;
      continue;
    }

    // 随机 chunk 大小 4~10 字符，模拟一个 token/词组
    const size = 4 + Math.floor(Math.random() * 7);
    const end = Math.min(i + size, text.length);
    chunks.push(text.slice(i, end));
    i = end;
  }

  return chunks;
};

/** 生成通用回答（无匹配时） */
const generateGenericResponse = (question: string): string => {
  return `关于「${question}」这个问题，我正在基于知识库进行检索和分析。\n\n这是一个示例回答，实际应用中会接入 RAG 后端服务，通过向量检索从知识库中获取相关文档片段，再由 LLM 生成精准的答案。\n\n你可以尝试左侧的推荐问题来体验完整的效果。`;
};

/** 滚动到底部 */
const scrollToBottom = () => {
  nextTick(() => {
    const el = chatContainerRef.value;
    if (el) {
      el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
    }
  });
};

onMounted(() => {
  inputRef.value?.focus();
});
</script>

<style scoped>
/* ==================== 页面容器 ==================== */
.rag-page {
  display: flex;
  flex-direction: column;
  height: calc(100vh - 4rem);
  max-width: 860px;
  margin: 0 auto;
  background: #fff;
  border-radius: 20px;
  overflow: hidden;
}

/* ==================== 头部 ==================== */
.rag-header {
  flex-shrink: 0;
  padding: 1.25rem 1.75rem;
  border-bottom: 1.5px solid #f1f5f9;
  background: #fff;
}

.rag-header__info {
  display: flex;
  align-items: center;
  gap: 0.9rem;
}

.rag-header__icon {
  width: 60px;
  height: 60px;
  border-radius: 12px;
  overflow: hidden;
  flex-shrink: 0;
  margin-right:10px;
}

.rag-header__icon img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.rag-header__title {
  font-size: 1.2rem;
  font-weight: 700;
  color: #0f172a;
  margin: 0;
  line-height: 1.35;
}

.rag-header__subtitle {
  font-size: 0.85rem;
  color: #94a3b8;
  margin: 0.15rem 0 0;
}

.rag-header__tags {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
  margin-top: 0.55rem;
}

.rag-header__tag {
  display: inline-flex;
  align-items: center;
  padding: 0.2rem 0.6rem;
  font-size: 0.78rem;
  border-radius: 6px;
  background: #f1f5f9;
  color: #475569;
  line-height: 1.5;
  white-space: nowrap;
  transition: background 0.2s ease, color 0.2s ease;
}

/* ==================== 对话区域 ==================== */
.rag-chat {
  flex: 1;
  overflow-y: auto;
  padding: 1.5rem 1.75rem;
  scroll-behavior: smooth;
}

/* ==================== 欢迎提示 ==================== */
.rag-welcome {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  text-align: center;
  padding: 2rem 0;
}

.rag-welcome__icon {
  width: 56px;
  height: 56px;
  border-radius: 16px;
  background: linear-gradient(135deg, #eff6ff, #eef2ff);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 1rem;
}

.rag-welcome__icon svg {
  width: 28px;
  height: 28px;
  color: #3b82f6;
}

.rag-welcome__title {
  font-size: 1.35rem;
  font-weight: 700;
  color: #0f172a;
  margin: 0 0 0.5rem;
}

.rag-welcome__desc {
  font-size: 0.92rem;
  color: #94a3b8;
  margin: 0 0 1.5rem;
  max-width: 380px;
  line-height: 1.6;
}

.rag-welcome__suggestions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.6rem;
  justify-content: center;
}

.rag-welcome__suggestion {
  padding: 0.55rem 1.1rem;
  border: 1.5px solid #e8ecf1;
  border-radius: 10px;
  background: #fff;
  font-size: 0.88rem;
  color: #475569;
  cursor: pointer;
  transition: all 0.2s ease;
  font-family: inherit;
}

.rag-welcome__suggestion:hover {
  border-color: #3b82f6;
  color: #3b82f6;
  background: #eff6ff;
}

/* ==================== 消息 ==================== */
.rag-message {
  margin-bottom: 1.25rem;
  animation: msgIn 0.25s ease-out;
}

@keyframes msgIn {
  from {
    opacity: 0;
    transform: translateY(8px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* 用户消息 — 右对齐对话框 */
.rag-message--user {
  display: flex;
  justify-content: flex-end;
}

.rag-message__bubble--user {
  max-width: 75%;
  padding: 0.75rem 1.1rem;
  border-radius: 16px 16px 4px 16px;
  background: #3b82f6;
  color: #fff;
  box-shadow: 0 2px 8px rgba(59, 130, 246, 0.18);
}

.rag-message__bubble--user .rag-message__text {
  font-size: 0.95rem;
  line-height: 1.6;
  word-break: break-word;
}

/* AI 消息 — 左对齐无对话框 */
.rag-message--assistant {
  display: flex;
  justify-content: flex-start;
}

.rag-message__ai {
  display: flex;
  align-items: flex-start;
  gap: 0.7rem;
  max-width: 85%;
}

.rag-message__ai-avatar {
  width: 32px;
  height: 32px;
  border-radius: 10px;
  overflow: hidden;
  flex-shrink: 0;
  margin-top: 2px;
}

.rag-message__ai-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.rag-message__ai-content {
  min-width: 0;
}

.rag-message__ai-content .rag-message__text {
  font-size: 0.95rem;
  line-height: 1.75;
  color: #334155;
  word-break: break-word;
}

.rag-message__ai-content .rag-message__text :deep(strong) {
  color: #0f172a;
  font-weight: 600;
}

/* 打字指示器 */
.rag-message__typing {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  margin-left: 2px;
  padding-top: 4px;
}

.rag-message__typing-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #94a3b8;
  animation: typingBounce 1.2s ease-in-out infinite;
}

.rag-message__typing-dot:nth-child(2) {
  animation-delay: 0.2s;
}

.rag-message__typing-dot:nth-child(3) {
  animation-delay: 0.4s;
}

@keyframes typingBounce {
  0%, 60%, 100% {
    transform: translateY(0);
    opacity: 0.4;
  }
  30% {
    transform: translateY(-6px);
    opacity: 1;
  }
}

/* ==================== 输入区域 ==================== */
.rag-input-area {
  flex-shrink: 0;
  padding: 0.75rem 1.75rem 1rem;
  border-top: 1.5px solid #f1f5f9;
  background: #fff;
}

.rag-input-box {
  display: flex;
  align-items: flex-end;
  gap: 0.6rem;
  background: #f4f4f5;
  border: 1.5px solid #e8ecf1;
  border-radius: 14px;
  padding: 0.6rem 0.8rem;
  transition: all 0.25s ease;
}

.rag-input-box:focus-within {
  border-color: #3b82f6;
  box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.08);
  background: #fff;
}

.rag-input-box__textarea {
  flex: 1;
  border: none;
  outline: none;
  background: transparent;
  font-size: 0.95rem;
  color: #1e293b;
  font-family: inherit;
  line-height: 1.5;
  resize: none;
  min-height: 24px;
  max-height: 150px;
}

.rag-input-box__textarea::placeholder {
  color: #94a3b8;
}

.rag-input-box__send {
  width: 36px;
  height: 36px;
  border-radius: 10px;
  border: none;
  background: #e2e8f0;
  color: #94a3b8;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s ease;
  flex-shrink: 0;
}

.rag-input-box__send svg {
  width: 18px;
  height: 18px;
}

.rag-input-box__send--active {
  background: #3b82f6;
  color: #fff;
  box-shadow: 0 2px 8px rgba(59, 130, 246, 0.25);
}

.rag-input-box__send--active:hover {
  background: #2563eb;
}

.rag-input-area__hint {
  font-size: 0.78rem;
  color: #cbd5e1;
  text-align: center;
  margin: 0.45rem 0 0;
}

/* ==================== 响应式 ==================== */
@media (max-width: 640px) {
  .rag-page {
    border-radius: 0;
    height: calc(100vh - 2rem);
  }

  .rag-header {
    padding: 1rem 1.25rem;
  }

  .rag-chat {
    padding: 1rem 1.25rem;
  }

  .rag-input-area {
    padding: 0.6rem 1.25rem 0.85rem;
  }

  .rag-message__bubble--user {
    max-width: 85%;
  }

  .rag-welcome__suggestions {
    flex-direction: column;
    width: 100%;
  }

  .rag-welcome__suggestion {
    width: 100%;
  }
}
</style>
<style>
/* ==================== 暗色模式 ==================== */
.dark-mode .rag-page {
  background: #22272e;
}

.dark-mode .rag-header {
  border-bottom-color: #2d333b;
  background: #22272e;
}


.dark-mode .rag-header__title {
  color: #c9d1d9;
}

.dark-mode .rag-header__subtitle {
  color: #6e7681;
}

.dark-mode .rag-header__tag {
  background: #2d333b;
  color: #8b949e;
}

/* 欢迎提示 */
.dark-mode .rag-welcome__icon {
  background: linear-gradient(135deg, rgba(88, 166, 255, 0.12), rgba(139, 92, 246, 0.12));
}

.dark-mode .rag-welcome__icon svg {
  color: #58a6ff;
}

.dark-mode .rag-welcome__title {
  color: #c9d1d9;
}

.dark-mode .rag-welcome__desc {
  color: #6e7681;
}

.dark-mode .rag-welcome__suggestion {
  border-color: #373e47;
  background: #2d333b;
  color: #8b949e;
}

.dark-mode .rag-welcome__suggestion:hover {
  border-color: #58a6ff;
  color: #58a6ff;
  background: rgba(88, 166, 255, 0.08);
}

/* 用户消息 */
.dark-mode .rag-message__bubble--user {
  background: #2563eb;
  box-shadow: 0 2px 8px rgba(37, 99, 235, 0.25);
}

/* AI 消息 */

.dark-mode .rag-message__ai-content .rag-message__text {
  color: #c9d1d9;
}

.dark-mode .rag-message__ai-content .rag-message__text :deep(strong) {
  color: #e6edf3;
}

.dark-mode .rag-message__typing-dot {
  background: #6e7681;
}

/* 输入区域 */
.dark-mode .rag-input-area {
  border-top-color: #2d333b;
  background: #22272e;
}

.dark-mode .rag-input-box {
  background: #2d333b;
  border-color: #373e47;
}

.dark-mode .rag-input-box:focus-within {
  border-color: #58a6ff;
  box-shadow: 0 0 0 4px rgba(88, 166, 255, 0.1);
  background: #22272e;
}

.dark-mode .rag-input-box__textarea {
  color: #c9d1d9;
}

.dark-mode .rag-input-box__textarea::placeholder {
  color: #6e7681;
}

.dark-mode .rag-input-box__send {
  background: #373e47;
  color: #6e7681;
}

.dark-mode .rag-input-box__send--active {
  background: #58a6ff;
  color: #fff;
  box-shadow: 0 2px 8px rgba(88, 166, 255, 0.25);
}

.dark-mode .rag-input-box__send--active:hover {
  background: #79b8ff;
}

.dark-mode .rag-input-area__hint {
  color: #373e47;
}

/* 滚动条 */
.dark-mode .rag-chat::-webkit-scrollbar {
  width: 6px;
}

.dark-mode .rag-chat::-webkit-scrollbar-track {
  background: transparent;
}

.dark-mode .rag-chat::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.1);
  border-radius: 3px;
}

.dark-mode .rag-chat::-webkit-scrollbar-thumb:hover {
  background: rgba(255, 255, 255, 0.2);
}
</style>
