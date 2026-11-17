package cn.inkheap.module.digitallife.service;

import cn.inkheap.module.digitallife.entity.ChatMessage;

import java.util.List;
import java.util.function.BiConsumer;
import java.util.function.Consumer;

/**
 * 数字生命聊天服务（RAG + 流式生成）。
 */
public interface ChatService {

    /**
     * 历史消息（时间正序，最近 limit 条；sessionId 为空时仅查默认会话）。
     *
     * @param userId    用户 id
     * @param sessionId 会话 id
     * @param limit     条数
     * @return 消息列表
     */
    List<ChatMessage> getHistory(String userId, String sessionId, int limit);

    /**
     * 完整聊天流程：用户消息入库 → RAG 检索 → system prompt + 最近 10 轮 → 流式生成 → 回复入库。
     *
     * @param userId    用户 id
     * @param sessionId 会话 id
     * @param content   提问内容
     * @param options   模型、IP 与流式回调
     */
    void run(String userId, String sessionId, String content, ChatOptions options);

    /**
     * 聊天选项。
     *
     * @param modelId 指定模型（可为空）
     * @param ip      客户端 IP（明文存储，仅后台可见）
     * @param onDelta 增量文本回调
     * @param onDone  完成回调（messageId, 完整内容）
     * @param onError 失败回调（错误消息）
     */
    record ChatOptions(String modelId, String ip, Consumer<String> onDelta,
                       BiConsumer<String, String> onDone, Consumer<String> onError) {
    }
}
