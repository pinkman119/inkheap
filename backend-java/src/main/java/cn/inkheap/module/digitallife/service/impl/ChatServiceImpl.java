package cn.inkheap.module.digitallife.service.impl;

import cn.hutool.core.util.IdUtil;
import cn.hutool.core.util.StrUtil;
import cn.inkheap.common.exception.BusinessException;
import cn.inkheap.module.digitallife.cache.ChatContextCache;
import cn.inkheap.module.digitallife.client.ModelClient;
import cn.inkheap.module.digitallife.constant.DigitalLifeDefaults;
import cn.inkheap.module.digitallife.entity.ChatMessage;
import cn.inkheap.module.digitallife.entity.DlPersona;
import cn.inkheap.module.digitallife.mapper.ChatMessageMapper;
import cn.inkheap.module.digitallife.service.ChatService;
import cn.inkheap.module.digitallife.service.ModelConfigService;
import cn.inkheap.module.digitallife.service.PersonaService;
import cn.inkheap.module.digitallife.service.VectorService;
import com.mybatisflex.core.query.QueryWrapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@Slf4j
@Service
@RequiredArgsConstructor
public class ChatServiceImpl implements ChatService {

    /** RAG 检索 top-K */
    private static final int RAG_TOP_K = 5;

    private final ChatMessageMapper chatMessageMapper;

    private final ModelConfigService modelConfigService;

    private final PersonaService personaService;

    private final VectorService vectorService;

    private final ModelClient modelClient;

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
        List<Map<String, String>> messages = new ArrayList<>(history.size() + 2);
        messages.add(Map.of("role", "system", "content", systemPrompt));
        for (ChatMessage item : history) {
            messages.add(Map.of("role", "user".equals(item.getRole()) ? "user" : "assistant",
                    "content", item.getContent()));
        }
        messages.add(Map.of("role", "user", "content", content));

        // 5、通用模型按顺序尝试（未指定则自动 fallback）
        List<ModelConfigService.ActiveModel> models = modelConfigService.getActiveModels(options.modelId());
        StringBuilder full = new StringBuilder();
        String lastError = "";

        for (ModelConfigService.ActiveModel model : models) {
            try {
                modelClient.streamChat(
                        DigitalLifeDefaults.baseUrlOf(model.model().getProvider()),
                        model.apiKey(),
                        model.model().getModelId(),
                        messages,
                        text -> {
                            full.append(text);
                            options.onDelta().accept(text);
                        });
                lastError = "";
                break;
            } catch (Exception e) {
                lastError = e.getMessage() == null ? "生成失败" : e.getMessage();
                log.warn("模型「{}」生成失败: {}", model.model().getName(), lastError);
                if (full.length() > 0) {
                    // 已有输出（流中断）：不再切换模型，保留已生成部分
                    break;
                }
            }
        }

        // 6、结果处理
        if (full.isEmpty()) {
            log.error("全部模型生成失败: {}", lastError);
            options.onError().accept(lastError.isEmpty() ? "生成回复失败，请稍后再试"
                    : "生成回复失败：" + lastError + "（已尝试 " + models.size() + " 个启用的模型）");
            return;
        }

        // 7、完整回复入库并并入上下文窗口
        ChatMessage assistantMessage = ChatMessage.builder()
                .id(IdUtil.randomUUID())
                .userId(userId)
                .sessionId(sessionId)
                .role("assistant")
                .content(full.toString())
                .ip(options.ip())
                .createdAt(Instant.now())
                .build();
        chatMessageMapper.insert(assistantMessage);
        chatContextCache.append(userId, sessionId, assistantMessage);

        options.onDone().accept(assistantMessage.getId(), full.toString());
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
            List<Map<String, Object>> chunks = vectorService.search(question, RAG_TOP_K);
            if (chunks.isEmpty()) {
                return "- 以下无检索到的资料片段，按你的人格与已知信息回答。";
            }
            List<String> lines = new ArrayList<>(chunks.size());
            for (Map<String, Object> chunk : chunks) {
                String label = DigitalLifeDefaults.refTypeLabel(String.valueOf(chunk.get("refType")));
                lines.add("- （来源：" + label + "）" + chunk.get("content"));
            }
            return "- 以下是从站长知识库/小记/简历/关于我中检索到的资料片段，回答时优先依据资料：\n"
                    + String.join("\n", lines);
        } catch (Exception e) {
            log.warn("RAG 检索失败，跳过资料注入: {}", e.getMessage());
            return "- （资料检索暂不可用，按你的人格与已知信息回答）";
        }
    }
}
