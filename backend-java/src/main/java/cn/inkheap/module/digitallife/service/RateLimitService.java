package cn.inkheap.module.digitallife.service;

/**
 * 数字生命聊天限流（Redis 令牌桶，容量 5、速率 5/min；Redis 不可用时降级放行）。
 */
public interface RateLimitService {

    /**
     * 消耗一个令牌。
     *
     * @param userId 用户 id
     * @return 限流结果
     */
    RateLimitResult consume(String userId);

    /**
     * 限流结果。
     *
     * @param allowed           是否放行
     * @param retryAfterSeconds 超限时距下次可用的秒数（放行时为 0）
     */
    record RateLimitResult(boolean allowed, int retryAfterSeconds) {
    }
}
