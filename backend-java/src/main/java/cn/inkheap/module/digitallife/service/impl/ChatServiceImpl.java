package cn.inkheap.module.digitallife.service.impl;

import cn.hutool.core.util.IdUtil;
import cn.hutool.core.util.StrUtil;
import cn.inkheap.common.exception.BusinessException;
import cn.inkheap.module.digitallife.cache.ChatContextCache;
import cn.inkheap.module.digitallife.client.ChatModelRouter;
import cn.inkheap.module.digitallife.constant.DigitalLifeDefaults;
import cn.inkheap.module.digitallife.entity.ChatMessage;
import cn.inkheap.module.digitallife.entity.DlPersona;
import cn.inkheap.module.digitallife.mapper.ChatMessageMapper;
import cn.inkheap.module.digitallife.service.ChatService;
import cn.inkheap.module.digitallife.service.ModelConfigService;
import cn.inkheap.module.digitallife.service.PersonaService;
import com.mybatisflex.core.query.QueryWrapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.ai.chat.messages.AssistantMessage;
import org.springframework.ai.chat.messages.Message;
import org.springframework.ai.chat.messages.SystemMessage;
import org.springframework.ai.chat.messages.UserMessage;
import org.springframework.ai.document.Document;
import org.springframework.ai.vectorstore.SearchRequest;
import org.springframework.ai.vectorstore.VectorStore;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class ChatServiceImpl implements ChatService {

    /** RAG 检索 top-K */
    private static final int RAG_TOP_K = 5;

    /** RAG 相似度阈值：pgvector 余弦距离转相似度（1 - distance），低于该值的片段丢弃 */
    private static final double RAG_SIMILARITY_THRESHOLD = 0.5;

    private final ChatMessageMapper chatMessageMapper;

    private final ModelConfigService modelConfigService;

    private final PersonaService personaService;

    private final VectorStore vectorStore;

    private final ChatModelRouter chatModelRouter;

    private final ChatContextCache chatContextCache;

    @Override
    public List<ChatMessage> getHistory(String userId, String sessionId, int limit) {
        List<ChatMessage> messages = chatMessageMapper.selectListByQuery(QueryWrapper.create()
                .eq(ChatMessage::getUserId, userId)
                .eq(ChatMessage::getSessionId, sessionId)
                .orderBy(ChatMessage::getCreatedAt, false)
                .limit(limit));
        List<ChatMessage> result = new ArrayList<>(messages);
        java.util.Collections.reverse(result);
        return result;
    }

    @Override
    public void run(String userId, String sessionId, String content, ChatOptions options) {
        // 1、取会话上下文窗口：首次访问从库回填，之后只做追加，不再每轮查库
        List<ChatMessage> history = chatContextCache.window(userId, sessionId,
                ignored -> getHistory(userId, sessionId, ChatContextCache.WINDOW_SIZE));

        // 2、用户消息入库（生成失败也保留提问），成功后并入上下文窗口
        ChatMessage userMessage = ChatMessage.builder()
                .id(IdUtil.randomUUID())
                .userId(userId)
                .sessionId(sessionId)
                .role("user")
                .content(content)
                .ip(options.ip())
                .createdAt(Instant.now())
                .build();
        chatMessageMapper.insert(userMessage);
        chatContextCache.append(userId, sessionId, userMessage);

        // 3、RAG 检索并渲染资料片段块
        String chunksBlock = renderChunksBlock(content);

        // 4、组装 messages：system + 窗口内历史 + 本轮提问
        String systemPrompt = buildSystemPrompt(chunksBlock);
        List<Message> messages = new ArrayList<>(history.size() + 2);
        messages.add(new SystemMessage(systemPrompt));
        for (ChatMessage item : history) {
            messages.add(toMessage(item));
        }
        messages.add(new UserMessage(content));

        // 5、通用模型按顺序尝试（未指定则自动 fallback，已出字不再切换）
        List<ModelConfigService.ActiveModel> models = modelConfigService.getActiveModels(options.modelId());
        ChatModelRouter.StreamResult result = chatModelRouter.stream(models, messages, options.onDelta());

        // 6、结果处理
        if (!result.success()) {
            log.error("全部模型生成失败: {}", result.lastError());
            options.onError().accept(result.lastError().isEmpty() ? "生成回复失败，请稍后再试"
                    : "生成回复失败：" + result.lastError() + "（已尝试 " + models.size() + " 个启用的模型）");
            return;
        }

        // 7、完整回复入库并并入上下文窗口
        ChatMessage assistantMessage = ChatMessage.builder()
                .id(IdUtil.randomUUID())
                .userId(userId)
                .sessionId(sessionId)
                .role("assistant")
                .content(result.content())
                .ip(options.ip())
                .createdAt(Instant.now())
                .build();
        chatMessageMapper.insert(assistantMessage);
        chatContextCache.append(userId, sessionId, assistantMessage);

        options.onDone().accept(assistantMessage.getId(), result.content());
    }

    /**
     * 组装 system prompt：结构化人格 + 基本信息 + RAG 资料 + 反编造规则。
     */
    private String buildSystemPrompt(String chunksBlock) {
        DlPersona persona = personaService.getActivePersona();
        if (persona == null) {
            throw BusinessException.conflict("尚未配置数字生命人格，请前往「数字生命 → 人格编写」");
        }

        List<String> sections = new ArrayList<>();
        if (StrUtil.isNotBlank(persona.getDescription())) {
            sections.add(persona.getDescription().trim());
        }

        List<String> settings = new ArrayList<>();
        settings.add("- 你的名字：「" + persona.getName() + "」，对话中以此自称");
        if (StrUtil.isNotBlank(persona.getPersonalityType())) {
            settings.add("- 人格类型：" + persona.getPersonalityType());
        }
        if (StrUtil.isNotBlank(persona.getStyleHint())) {
            settings.add("- 回复风格：" + persona.getStyleHint());
        }
        if (StrUtil.isNotBlank(persona.getGreeting())) {
            settings.add("- 你的问候语参考：" + persona.getGreeting());
        }
        sections.add("【人格设定】\n" + String.join("\n", settings));

        if (StrUtil.isNotBlank(persona.getBasicInfo())) {
            sections.add("【基本信息】\n以下是站主提供的事实性基本信息，当对方的问题涉及这些内容时，"
                    + "必须优先依据其回答，不要编造或更改：\n" + persona.getBasicInfo().trim());
        }

        sections.add("【补充规则】\n" + chunksBlock
                + "\n- 资料未覆盖的信息，按你的人格规则诚实说明「这块我还没有告诉过你」，不要编造细节。");
        return String.join("\n\n", sections);
    }

    /**
     * RAG 检索并渲染资料片段块（检索异常时返回空资料占位）。
     */
    private String renderChunksBlock(String question) {
        try {
            List<Document> chunks = vectorStore.similaritySearch(
                    SearchRequest.builder()
                            .query(question)
                            .topK(RAG_TOP_K)
                            .similarityThreshold(RAG_SIMILARITY_THRESHOLD)
                            .build());
            if (chunks.isEmpty()) {
                return "- 以下无检索到的资料片段，按你的人格与已知信息回答。";
            }
            List<String> lines = new ArrayList<>(chunks.size());
            for (Document chunk : chunks) {
                Object refType = chunk.getMetadata().get("refType");
                String label = DigitalLifeDefaults.refTypeLabel(refType == null ? "" : refType.toString());
                lines.add("- （来源：" + label + "）" + chunk.getText());
            }
            return "- 以下是从站长知识库/小记/简历/关于我中检索到的资料片段，回答时优先依据资料：\n"
                    + String.join("\n", lines);
        } catch (Exception e) {
            log.warn("RAG 检索失败，跳过资料注入: {}", e.getMessage());
            return "- （资料检索暂不可用，按你的人格与已知信息回答）";
        }
    }

    /**
     * 历史消息转 Spring AI 消息：用户侧为 UserMessage，其余（助手）按 AssistantMessage 处理。
     */
    private Message toMessage(ChatMessage message) {
        return "user".equals(message.getRole())
                ? new UserMessage(message.getContent())
                : new AssistantMessage(message.getContent());
    }
}
