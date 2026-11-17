package cn.inkheap.module.digitallife.service.impl;

import cn.inkheap.module.digitallife.service.RateLimitService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.script.DefaultRedisScript;
import org.springframework.stereotype.Service;

import java.util.List;

/**
 * Redis 令牌桶（Lua 原子执行）；Redis 不可用时降级放行（可用性优先）。
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class RateLimitServiceImpl implements RateLimitService {

    private static final int CAPACITY = 5;

    /** tokens per second */
    private static final double RATE = 5.0 / 60;

    private static final String KEY_PREFIX = "rl:dl:chat:";

    /** Redis 不可用后的冷却时间：期间直接放行，避免每次请求都等连接超时 */
    private static final long UNAVAILABLE_COOLDOWN_MS = 60_000L;

    private static final DefaultRedisScript<String> SCRIPT = new DefaultRedisScript<>("""
            local key = KEYS[1]
            local capacity = tonumber(ARGV[1])
            local rate = tonumber(ARGV[2])
            local now_ms = tonumber(ARGV[3])
            local data = redis.call('HMGET', key, 'tokens', 'ts')
            local tokens = tonumber(data[1])
            local ts = tonumber(data[2])
            if tokens == nil then
              tokens = capacity
              ts = now_ms
            end
            local rate_ms = rate / 1000
            local elapsed_ms = math.max(0, now_ms - ts)
            tokens = math.min(capacity, tokens + elapsed_ms * rate_ms)
            local allowed = 0
            if tokens >= 1 then
              tokens = tokens - 1
              allowed = 1
            end
            redis.call('HMSET', key, 'tokens', tokens, 'ts', now_ms)
            redis.call('EXPIRE', key, 120)
            local retry_ms = 0
            if allowed == 0 then
              retry_ms = math.ceil((1 - tokens) / rate_ms)
            end
            return tostring(allowed) .. '|' .. tostring(retry_ms)
            """, String.class);

    private final StringRedisTemplate redisTemplate;

    private volatile long unavailableUntil = 0L;

    @Override
    public RateLimitResult consume(String userId) {
        // 1、Redis 刚失败过：冷却期内直接放行
        if (System.currentTimeMillis() < unavailableUntil) {
            return new RateLimitResult(true, 0);
        }

        try {
            // 2、Lua 令牌桶
            String result = redisTemplate.execute(SCRIPT, List.of(KEY_PREFIX + userId),
                    String.valueOf(CAPACITY), String.valueOf(RATE), String.valueOf(System.currentTimeMillis()));
            if (result == null || !result.contains("|")) {
                return new RateLimitResult(true, 0);
            }
            String[] parts = result.split("\\|");
            boolean allowed = "1".equals(parts[0]);
            int retryAfterSeconds = allowed ? 0
                    : Math.max(1, (int) Math.ceil(Double.parseDouble(parts[1]) / 1000));
            return new RateLimitResult(allowed, retryAfterSeconds);
        } catch (Exception e) {
            // 3、Redis 不可用：降级放行并进入冷却期
            unavailableUntil = System.currentTimeMillis() + UNAVAILABLE_COOLDOWN_MS;
            log.warn("Redis 不可用，限流降级放行: {}", e.getMessage());
            return new RateLimitResult(true, 0);
        }
    }
}
