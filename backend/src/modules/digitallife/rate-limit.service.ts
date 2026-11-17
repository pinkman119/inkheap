import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import Redis from 'ioredis';

export interface RateLimitResult {
  allowed: boolean;
  /** 超限时距下次可用的等待秒数；放行时为 0 */
  retryAfterSeconds: number;
}

/**
 * Redis 令牌桶限流（Lua 原子执行）：
 * 容量 5，速率每分钟 5 个（按用户维度 key）。
 * Redis 不可用时降级放行（可用性优先，记 warn 日志）。
 */
@Injectable()
export class RateLimitService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RateLimitService.name);
  private redis: Redis | null = null;

  private static readonly CAPACITY = 5;
  /** tokens per second */
  private static readonly RATE = 5 / 60;
  private static readonly KEY_PREFIX = 'rl:dl:chat:';

  /** Lua 令牌桶：HMGET {tokens,ts} → 按时间差补充 → 判定扣减 → HMSET + EXPIRE */
  private static readonly LUA_SCRIPT = `
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
-- 时间统一毫秒；rate（每秒令牌数）换算为每毫秒
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
return {allowed, retry_ms}
`;

  private getRedis(): Redis | null {
    if (!process.env.REDIS_URL) {
      this.logger.warn('REDIS_URL 未配置，限流降级放行');
      return null;
    }
    if (!this.redis) {
      this.logger.log(`初始化 Redis 连接: ${process.env.REDIS_URL}`);
      this.redis = new Redis(process.env.REDIS_URL, {
        // 命令断连时少量重试后放弃，避免无限重连
        retryStrategy: (times) => (times > 5 ? null : Math.min(times * 500, 3000)),
        // 离线队列关闭：连接不可用时命令立即报错而非挂起
        enableOfflineQueue: false,
        lazyConnect: false,
        maxRetriesPerRequest: 1,
      });
      this.redis.on('error', (e) => {
        // 静默处理连接错误（降级逻辑在 consume 内）
        this.logger.warn(`Redis 连接异常（限流将降级）: ${e.message}`);
      });
      this.redis.on('ready', () => {
        this.logger.log('Redis 连接就绪，限流生效');
      });
    }
    return this.redis;
  }

  /** 消耗一个令牌；Redis 异常时降级放行 */
  async consume(userId: string): Promise<RateLimitResult> {
    const redis = this.getRedis();
    if (!redis) {
      return { allowed: true, retryAfterSeconds: 0 };
    }
    try {
      const now = Date.now();
      const result = (await redis.eval(
        RateLimitService.LUA_SCRIPT,
        1,
        RateLimitService.KEY_PREFIX + userId,
        RateLimitService.CAPACITY,
        RateLimitService.RATE,
        now,
      )) as [number, number];
      const allowed = Number(result[0]) === 1;
      const retryAfterSeconds = allowed ? 0 : Math.max(1, Math.ceil(Number(result[1]) / 1000));
      return { allowed, retryAfterSeconds };
    } catch (e: any) {
      // Redis 不可用：降级放行（可用性优先）
      this.logger.warn(`Redis 不可用，限流降级放行: ${e?.message ?? e}`);
      return { allowed: true, retryAfterSeconds: 0 };
    }
  }

  /** 启动时预热连接（消除首请求因连接未就绪的降级放行） */
  onModuleInit() {
    this.getRedis();
  }

  async onModuleDestroy() {
    if (this.redis) {
      await this.redis.quit().catch(() => this.redis?.disconnect());
    }
  }
}
