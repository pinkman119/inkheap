package cn.inkheap.module.digitallife.cache;

import cn.inkheap.module.digitallife.entity.ChatMessage;
import com.github.benmanes.caffeine.cache.Cache;
import com.github.benmanes.caffeine.cache.Caffeine;
import org.springframework.stereotype.Component;

import java.time.Duration;
import java.util.ArrayDeque;
import java.util.ArrayList;
import java.util.Deque;
import java.util.List;
import java.util.function.Function;

/**
 * AI 会话上下文窗口的进程内缓存（设计文档 4.1 方案 B1）。
 * - key = userId:sessionId，窗口固定 {@link #WINDOW_SIZE} 条
 * - 未命中时用 loader 从 chat_messages 回填，命中后只做追加，不再每轮查库
 * - 30 分钟无访问或超过会话数上限时淘汰，内存占用有界
 * - 多实例部署时各节点缓存互不可见，需粘性会话，否则会读到不完整的上下文
 */
@Component
public class ChatContextCache {

    /** 上下文窗口：最近 20 条消息（约 10 轮） */
    public static final int WINDOW_SIZE = 20;

    /** 最多缓存的会话数，防止内存无限增长 */
    private static final long MAX_SESSIONS = 2000;

    /** 会话无访问多久后淘汰 */
    private static final Duration EXPIRE_AFTER_ACCESS = Duration.ofMinutes(30);

    private final Cache<String, Deque<ChatMessage>> cache = Caffeine.newBuilder()
            .maximumSize(MAX_SESSIONS)
            .expireAfterAccess(EXPIRE_AFTER_ACCESS)
            .build();

    /**
     * 读取会话窗口快照；缓存未命中时调用 loader 回填。
     *
     * @param loader 入参为缓存 key（userId:sessionId），返回最近若干条历史消息（时间正序）
     * @return 窗口内消息快照（副本，调用方可自由修改）
     */
    public List<ChatMessage> window(String userId, String sessionId, Function<String, List<ChatMessage>> loader) {
        Deque<ChatMessage> messages = cache.get(key(userId, sessionId),
                cacheKey -> new ArrayDeque<>(loader.apply(cacheKey)));
        synchronized (messages) {
            return new ArrayList<>(messages);
        }
    }

    /**
     * 追加一条消息到窗口尾部，超出窗口长度时丢弃最旧的。
     * 缓存尚未回填时不做预热，避免把不完整的历史写入窗口。
     */
    public void append(String userId, String sessionId, ChatMessage message) {
        Deque<ChatMessage> messages = cache.getIfPresent(key(userId, sessionId));
        if (messages == null) {
            return;
        }
        synchronized (messages) {
            messages.addLast(message);
            while (messages.size() > WINDOW_SIZE) {
                messages.removeFirst();
            }
        }
    }

    /**
     * 让会话窗口失效：消息被删除或会话被清空后调用，下次访问会重新从库回填。
     */
    public void evict(String userId, String sessionId) {
        cache.invalidate(key(userId, sessionId));
    }

    private String key(String userId, String sessionId) {
        return userId + ":" + (sessionId == null ? "" : sessionId);
    }
}
