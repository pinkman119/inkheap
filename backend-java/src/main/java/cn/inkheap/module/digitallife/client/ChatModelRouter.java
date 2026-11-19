package cn.inkheap.module.digitallife.client;

import cn.inkheap.module.digitallife.constant.DigitalLifeDefaults;
import cn.inkheap.module.digitallife.service.ModelConfigService.ActiveModel;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.ai.chat.messages.Message;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.function.Consumer;
import java.util.function.Function;

/**
 * 多模型顺序路由（设计文档 4.3）。
 * - 按 sortOrder 依次尝试候选模型，前一个失败才换下一个
 * - 流式：一旦本次调用已产出内容，就不再切换模型，保留已生成的部分
 * - 非流式：由调用方传入提取函数判定结果是否有效（例如摘要需要归一化后再判空）
 * - 全部失败时抛 {@link ModelClient.ModelException}，由调用方决定错误文案
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class ChatModelRouter {

    private final ModelClient modelClient;

    /**
     * 流式生成：逐段回调文本，遇到可用模型即返回。
     *
     * @param candidates 候选模型（已按优先级排序）
     * @param messages   Spring AI 消息列表
     * @param onDelta    文本增量回调
     * @return 累积内容与最后一个错误；content 为空表示全部失败
     */
    public StreamResult stream(List<ActiveModel> candidates, List<Message> messages,
                               Consumer<String> onDelta) {
        StringBuilder content = new StringBuilder();
        String lastError = "";
        for (ActiveModel candidate : candidates) {
            try {
                modelClient.streamChat(
                        DigitalLifeDefaults.baseUrlOf(candidate.model().getProvider()),
                        candidate.apiKey(),
                        candidate.model().getModelId(),
                        messages,
                        text -> {
                            content.append(text);
                            onDelta.accept(text);
                        });
                return new StreamResult(content.toString(), "");
            } catch (Exception e) {
                lastError = messageOf(e);
                log.warn("模型「{}」生成失败: {}", candidate.model().getName(), lastError);
                if (!content.isEmpty()) {
                    // 已产出部分内容（流中断）：保留已生成部分，不再切换模型
                    break;
                }
            }
        }
        return new StreamResult(content.toString(), lastError);
    }

    /**
     * 非流式生成：返回第一个通过 {@code extractor} 校验的回复。
     *
     * @param extractor 从原始回复中提取有效结果，返回空表示该模型结果不可用，继续尝试下一个
     * @throws ModelClient.ModelException 全部模型失败或结果为空
     */
    public String chat(List<ActiveModel> candidates, List<Message> messages,
                       Function<String, String> extractor) {
        String lastError = "";
        for (ActiveModel candidate : candidates) {
            try {
                String reply = modelClient.chat(DigitalLifeDefaults.baseUrlOf(candidate.model().getProvider()),
                        candidate.apiKey(), candidate.model().getModelId(), messages);
                String value = extractor.apply(reply);
                if (value != null && !value.isEmpty()) {
                    return value;
                }
                lastError = "模型返回内容为空";
            } catch (Exception e) {
                lastError = messageOf(e);
                log.warn("模型「{}」生成失败: {}", candidate.model().getName(), lastError);
            }
        }
        throw new ModelClient.ModelException(lastError.isEmpty() ? "没有可用的模型" : lastError);
    }

    private String messageOf(Exception e) {
        return e.getMessage() == null ? "生成失败" : e.getMessage();
    }

    /**
     * 流式结果：content 为空即视为全部失败，此时 lastError 为最后一个模型的原因。
     */
    public record StreamResult(String content, String lastError) {

        public boolean success() {
            return !content.isEmpty();
        }
    }
}
