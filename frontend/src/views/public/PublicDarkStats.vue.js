import { ref, nextTick, onMounted } from 'vue';
import headImg from '@/img/head.png';
// ==================== 响应式状态 ====================
const messages = ref([]);
const inputText = ref('');
const isSending = ref(false);
const chatContainerRef = ref(null);
const inputRef = ref(null);
const suggestions = [
    '什么是RAG？',
    '如何优化检索效果？',
    '向量数据库有哪些？',
    'RAG和微调的区别？'
];
// ==================== 模拟回答数据 ====================
const mockResponses = {
    '什么是RAG？': `**RAG（Retrieval-Augmented Generation）** 即检索增强生成，是一种将**信息检索**与**大语言模型生成**相结合的技术架构。\n\n核心流程：\n1. **检索阶段** — 将用户问题转化为向量，从知识库中检索最相关的文档片段\n2. **增强阶段** — 将检索到的上下文信息与用户问题一起组装为 Prompt\n3. **生成阶段** — LLM 基于增强后的 Prompt 生成最终回答\n\nRAG 的优势在于：\n- 减少 LLM 的幻觉问题\n- 回答可溯源、可验证\n- 知识库可动态更新，无需重新训练模型`,
    '如何优化检索效果？': `优化 RAG 检索效果可以从以下几个维度入手：\n\n**1. 文档分块策略**\n- 控制 chunk 大小（通常 256~1024 tokens）\n- 保持语义完整性，避免跨段落截断\n- 使用滑动窗口增加重叠区域\n\n**2. Embedding 模型选择**\n- 选用支持中文的模型（如 bge-large-zh）\n- 针对领域数据微调 Embedding 模型\n\n**3. 混合检索**\n- 结合向量检索与关键词检索（BM25）\n- 使用 Reranker 对检索结果重排序\n\n**4. Query 优化**\n- 查询改写（Query Rewriting）\n- 多路召回 + 融合排序`,
    '向量数据库有哪些？': `主流向量数据库对比：\n\n| 数据库 | 特点 | 适用场景 |\n|--------|------|----------|\n| **Milvus** | 分布式架构，高性能 | 大规模生产环境 |\n| **Pinecone** | 全托管，零运维 | 快速上线的项目 |\n| **Weaviate** | 支持混合搜索 | 需要结构化+向量检索 |\n| **Chroma** | 轻量开源 | 原型验证、小规模应用 |\n| **Qdrant** | Rust 实现，低延迟 | 对延迟敏感的场景 |\n| **pgvector** | PG 扩展，SQL 生态 | 已有 PostgreSQL 的项目 |\n\n选型建议：\n- **原型阶段** → Chroma，最快上手\n- **生产环境** → Milvus 或 Pinecone\n- **已有 PG 基础** → pgvector 无缝集成`,
    'RAG和微调的区别？': `RAG 和微调（Fine-tuning）是增强 LLM 能力的两种不同路线：\n\n**RAG**\n- 动态注入最新知识\n- 回答可溯源\n- 无需重新训练\n- 适合知识频繁更新的场景\n\n**微调**\n- 改变模型行为和风格\n- 推理时无需外部检索\n- 适合领域特定的推理模式\n- 知识固化在模型参数中\n\n**何时选择 RAG？**\n- 知识库需要频繁更新\n- 要求回答可引用来源\n- 不想承担训练成本\n\n**何时选择微调？**\n- 需要模型学习特定推理模式\n- 对推理延迟要求高\n- 有充足的领域训练数据\n\n**最佳实践**：两者可以结合——先用微调调整模型风格，再用 RAG 注入动态知识。`
};
// ==================== 方法 ====================
/** 简易 Markdown 渲染（粗体、换行、列表） */
const renderMarkdown = (text) => {
    return text
        .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
        .replace(/\n/g, '<br/>');
};
/** 自动调整输入框高度 */
const autoResize = () => {
    const el = inputRef.value;
    if (!el)
        return;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 150) + 'px';
};
/** 发送建议问题 */
const sendSuggestion = (text) => {
    inputText.value = text;
    handleSend();
};
/** 发送消息 */
const handleSend = (e) => {
    if (e && 'preventDefault' in e)
        e.preventDefault();
    const text = inputText.value.trim();
    if (!text || isSending.value)
        return;
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
    const aiMsg = { role: 'assistant', content: '', isTyping: true };
    messages.value.push(aiMsg);
    scrollToBottom();
    // 模拟延迟后开始流式输出
    setTimeout(() => {
        const response = mockResponses[text] || generateGenericResponse(text);
        aiMsg.isTyping = false;
        streamOutput(aiMsg, response);
        isSending.value = false;
    }, 800 + Math.random() * 600);
};
/** 流式输出 — 按语义 chunk 逐块追加，模拟后端 SSE 推送 */
const streamOutput = (msg, fullText) => {
    const chunks = splitIntoChunks(fullText);
    let chunkIdx = 0;
    const pump = () => {
        if (chunkIdx >= chunks.length)
            return;
        const chunk = chunks[chunkIdx];
        msg.content += chunk;
        chunkIdx++;
        scrollToBottom();
        // 根据chunk类型决定延迟：换行处停顿更久，模拟段落切换
        const delay = chunk.includes('\n')
            ? 120 + Math.random() * 180 // 段落停顿 120~300ms
            : 30 + Math.random() * 70; // 普通token 30~100ms
        setTimeout(pump, delay);
    };
    pump();
};
/** 将文本按语义拆分为 chunk，模拟 SSE token 推送粒度 */
const splitIntoChunks = (text) => {
    const chunks = [];
    let i = 0;
    while (i < text.length) {
        // 向前看是否即将遇到换行（2字符以内），如果是则合并到换行处
        const lookahead = text.slice(i, i + 6);
        const nearLineBreak = lookahead.indexOf('\n');
        if (nearLineBreak !== -1 && nearLineBreak <= 4) {
            const end = Math.min(i + nearLineBreak + 1, text.length);
            const end2 = end < text.length && text[end] === '\n' ? end + 1 : end;
            chunks.push(text.slice(i, end2));
            i = end2;
            continue;
        }
        const size = 4 + Math.floor(Math.random() * 7);
        const end = Math.min(i + size, text.length);
        chunks.push(text.slice(i, end));
        i = end;
    }
    return chunks;
};
/** 生成通用回答（无匹配时） */
const generateGenericResponse = (question) => {
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
debugger; /* PartiallyEnd: #3632/scriptSetup.vue */
const __VLS_ctx = {};
let __VLS_components;
let __VLS_directives;
/** @type {__VLS_StyleScopedClasses['rag-header__icon']} */ ;
/** @type {__VLS_StyleScopedClasses['rag-welcome__icon']} */ ;
/** @type {__VLS_StyleScopedClasses['rag-welcome__suggestion']} */ ;
/** @type {__VLS_StyleScopedClasses['rag-message__bubble--user']} */ ;
/** @type {__VLS_StyleScopedClasses['rag-message__ai-avatar']} */ ;
/** @type {__VLS_StyleScopedClasses['rag-message__ai-content']} */ ;
/** @type {__VLS_StyleScopedClasses['rag-message__text']} */ ;
/** @type {__VLS_StyleScopedClasses['rag-message__ai-content']} */ ;
/** @type {__VLS_StyleScopedClasses['rag-message__text']} */ ;
/** @type {__VLS_StyleScopedClasses['rag-message__typing-dot']} */ ;
/** @type {__VLS_StyleScopedClasses['rag-message__typing-dot']} */ ;
/** @type {__VLS_StyleScopedClasses['rag-input-box']} */ ;
/** @type {__VLS_StyleScopedClasses['rag-input-box__textarea']} */ ;
/** @type {__VLS_StyleScopedClasses['rag-input-box__send']} */ ;
/** @type {__VLS_StyleScopedClasses['rag-input-box__send--active']} */ ;
/** @type {__VLS_StyleScopedClasses['rag-page']} */ ;
/** @type {__VLS_StyleScopedClasses['rag-header']} */ ;
/** @type {__VLS_StyleScopedClasses['rag-chat']} */ ;
/** @type {__VLS_StyleScopedClasses['rag-input-area']} */ ;
/** @type {__VLS_StyleScopedClasses['rag-message__bubble--user']} */ ;
/** @type {__VLS_StyleScopedClasses['rag-welcome__suggestions']} */ ;
/** @type {__VLS_StyleScopedClasses['rag-welcome__suggestion']} */ ;
/** @type {__VLS_StyleScopedClasses['rag-chat']} */ ;
/** @type {__VLS_StyleScopedClasses['rag-chat']} */ ;
/** @type {__VLS_StyleScopedClasses['rag-chat']} */ ;
/** @type {__VLS_StyleScopedClasses['rag-chat']} */ ;
// CSS variable injection 
// CSS variable injection end 
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "rag-page" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.header, __VLS_intrinsicElements.header)({
    ...{ class: "rag-header" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "rag-header__info" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "rag-header__icon" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.img)({
    src: (__VLS_ctx.headImg),
    alt: "头像",
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.h1, __VLS_intrinsicElements.h1)({
    ...{ class: "rag-header__title" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
    ...{ class: "rag-header__subtitle" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "rag-chat" },
    ref: "chatContainerRef",
});
/** @type {typeof __VLS_ctx.chatContainerRef} */ ;
if (__VLS_ctx.messages.length === 0) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "rag-welcome" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "rag-welcome__icon" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.svg, __VLS_intrinsicElements.svg)({
        viewBox: "0 0 24 24",
        fill: "none",
        stroke: "currentColor",
        'stroke-width': "1.5",
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.path)({
        d: "M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z",
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.h2, __VLS_intrinsicElements.h2)({
        ...{ class: "rag-welcome__title" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
        ...{ class: "rag-welcome__desc" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "rag-welcome__suggestions" },
    });
    for (const [s] of __VLS_getVForSourceType((__VLS_ctx.suggestions))) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
            ...{ onClick: (...[$event]) => {
                    if (!(__VLS_ctx.messages.length === 0))
                        return;
                    __VLS_ctx.sendSuggestion(s);
                } },
            key: (s),
            ...{ class: "rag-welcome__suggestion" },
        });
        (s);
    }
}
for (const [msg, idx] of __VLS_getVForSourceType((__VLS_ctx.messages))) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        key: (idx),
        ...{ class: "rag-message" },
        ...{ class: (`rag-message--${msg.role}`) },
    });
    if (msg.role === 'user') {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "rag-message__bubble rag-message__bubble--user" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "rag-message__text" },
        });
        (msg.content);
    }
    else {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "rag-message__ai" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "rag-message__ai-avatar" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.img)({
            src: (__VLS_ctx.headImg),
            alt: "头像",
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "rag-message__ai-content" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "rag-message__text" },
        });
        __VLS_asFunctionalDirective(__VLS_directives.vHtml)(null, { ...__VLS_directiveBindingRestFields, value: (__VLS_ctx.renderMarkdown(msg.content)) }, null, null);
        if (msg.isTyping) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                ...{ class: "rag-message__typing" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                ...{ class: "rag-message__typing-dot" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                ...{ class: "rag-message__typing-dot" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                ...{ class: "rag-message__typing-dot" },
            });
        }
    }
}
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "rag-input-area" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "rag-input-box" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.textarea, __VLS_intrinsicElements.textarea)({
    ...{ onKeydown: (__VLS_ctx.handleSend) },
    ...{ onInput: (__VLS_ctx.autoResize) },
    ref: "inputRef",
    value: (__VLS_ctx.inputText),
    ...{ class: "rag-input-box__textarea" },
    placeholder: "输入你的问题...",
    rows: "1",
});
/** @type {typeof __VLS_ctx.inputRef} */ ;
__VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
    ...{ onClick: (...[$event]) => {
            __VLS_ctx.handleSend();
        } },
    ...{ class: "rag-input-box__send" },
    ...{ class: ({ 'rag-input-box__send--active': __VLS_ctx.inputText.trim() }) },
    disabled: (!__VLS_ctx.inputText.trim() || __VLS_ctx.isSending),
    'aria-label': "发送",
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.svg, __VLS_intrinsicElements.svg)({
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    'stroke-width': "2",
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.path)({
    d: "M22 2L11 13",
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.path)({
    d: "M22 2L15 22L11 13L2 9L22 2Z",
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
    ...{ class: "rag-input-area__hint" },
});
/** @type {__VLS_StyleScopedClasses['rag-page']} */ ;
/** @type {__VLS_StyleScopedClasses['rag-header']} */ ;
/** @type {__VLS_StyleScopedClasses['rag-header__info']} */ ;
/** @type {__VLS_StyleScopedClasses['rag-header__icon']} */ ;
/** @type {__VLS_StyleScopedClasses['rag-header__title']} */ ;
/** @type {__VLS_StyleScopedClasses['rag-header__subtitle']} */ ;
/** @type {__VLS_StyleScopedClasses['rag-chat']} */ ;
/** @type {__VLS_StyleScopedClasses['rag-welcome']} */ ;
/** @type {__VLS_StyleScopedClasses['rag-welcome__icon']} */ ;
/** @type {__VLS_StyleScopedClasses['rag-welcome__title']} */ ;
/** @type {__VLS_StyleScopedClasses['rag-welcome__desc']} */ ;
/** @type {__VLS_StyleScopedClasses['rag-welcome__suggestions']} */ ;
/** @type {__VLS_StyleScopedClasses['rag-welcome__suggestion']} */ ;
/** @type {__VLS_StyleScopedClasses['rag-message']} */ ;
/** @type {__VLS_StyleScopedClasses['rag-message__bubble']} */ ;
/** @type {__VLS_StyleScopedClasses['rag-message__bubble--user']} */ ;
/** @type {__VLS_StyleScopedClasses['rag-message__text']} */ ;
/** @type {__VLS_StyleScopedClasses['rag-message__ai']} */ ;
/** @type {__VLS_StyleScopedClasses['rag-message__ai-avatar']} */ ;
/** @type {__VLS_StyleScopedClasses['rag-message__ai-content']} */ ;
/** @type {__VLS_StyleScopedClasses['rag-message__text']} */ ;
/** @type {__VLS_StyleScopedClasses['rag-message__typing']} */ ;
/** @type {__VLS_StyleScopedClasses['rag-message__typing-dot']} */ ;
/** @type {__VLS_StyleScopedClasses['rag-message__typing-dot']} */ ;
/** @type {__VLS_StyleScopedClasses['rag-message__typing-dot']} */ ;
/** @type {__VLS_StyleScopedClasses['rag-input-area']} */ ;
/** @type {__VLS_StyleScopedClasses['rag-input-box']} */ ;
/** @type {__VLS_StyleScopedClasses['rag-input-box__textarea']} */ ;
/** @type {__VLS_StyleScopedClasses['rag-input-box__send']} */ ;
/** @type {__VLS_StyleScopedClasses['rag-input-area__hint']} */ ;
var __VLS_dollars;
const __VLS_self = (await import('vue')).defineComponent({
    setup() {
        return {
            headImg: headImg,
            messages: messages,
            inputText: inputText,
            isSending: isSending,
            chatContainerRef: chatContainerRef,
            inputRef: inputRef,
            suggestions: suggestions,
            renderMarkdown: renderMarkdown,
            autoResize: autoResize,
            sendSuggestion: sendSuggestion,
            handleSend: handleSend,
        };
    },
});
export default (await import('vue')).defineComponent({
    setup() {
        return {};
    },
});
; /* PartiallyEnd: #4569/main.vue */
