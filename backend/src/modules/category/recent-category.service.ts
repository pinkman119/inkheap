import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import Redis from 'ioredis';
import { PrismaService } from '../prisma/prisma.service';

/** 「最近使用」回显条数（新建文章分类下拉顶部） */
export const RECENT_CATEGORY_LIMIT = 5;

/**
 * 全站「最近使用的分类」（Redis 列表，所有管理员共享一份）：
 * - 文章创建/更新成功后 push 该文章的 categoryKey（去重后置顶，保留 RECENT_CATEGORY_LIMIT 条）；
 * - list() 返回按最近使用排序的分类对象（过滤已被删除的分类）；
 * - Redis 不可用时降级：push 记 warn 后跳过，list() 回退为按文章创建时间推导（最新文章的分类在最前），
 *   降级行为与 Redis 主路径语义一致（可用性优先，参照 RateLimitService 的降级策略）。
 */
@Injectable()
export class RecentCategoryService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RecentCategoryService.name);
  private redis: Redis | null = null;

  private static readonly KEY = 'article:recent-cats';

  constructor(private prisma: PrismaService) {}

  private getRedis(): Redis | null {
    if (!process.env.REDIS_URL) {
      this.logger.warn('REDIS_URL 未配置，最近使用分类将按文章数据推导');
      return null;
    }
    if (!this.redis) {
      this.logger.log(`初始化 Redis 连接: ${process.env.REDIS_URL}`);
      this.redis = new Redis(process.env.REDIS_URL, {
        // 命令断连时少量重试后放弃，避免无限重连
        retryStrategy: (times) => (times > 5 ? null : Math.min(times * 500, 3000)),
        // 离线队列关闭：连接不可用时命令立即报错而非挂起
        lazyConnect: false,
        maxRetriesPerRequest: 1,
      });
      this.redis.on('error', (e) => {
        // 静默处理连接错误（降级逻辑在 push/list 内）
        this.logger.warn(`Redis 连接异常（最近使用分类降级）: ${e.message}`);
      });
      this.redis.on('ready', () => {
        this.logger.log('Redis 连接就绪，最近使用分类生效');
      });
    }
    return this.redis;
  }

  /** 记录一次分类使用：去重后置顶，裁剪到 RECENT_CATEGORY_LIMIT 条；Redis 异常时降级跳过 */
  async push(categoryKey: string): Promise<void> {
    if (!categoryKey) return;
    const redis = this.getRedis();
    if (!redis) return;
    try {
      await redis
        .multi()
        .lrem(RecentCategoryService.KEY, 0, categoryKey)
        .lpush(RecentCategoryService.KEY, categoryKey)
        .ltrim(RecentCategoryService.KEY, 0, RECENT_CATEGORY_LIMIT - 1)
        .exec();
    } catch (e: any) {
      this.logger.warn(`Redis 不可用，本次使用记录跳过: ${e?.message ?? e}`);
    }
  }

  /** 最近的分类（按使用时间倒序，已过滤删除的分类）；Redis 不可用或列表为空时按文章数据推导 */
  async list(): Promise<any[]> {
    const keys = await this.readKeys();
    return this.resolveCategories(keys.length ? keys : await this.fallbackKeys());
  }

  private async readKeys(): Promise<string[]> {
    const redis = this.getRedis();
    if (!redis) return [];
    try {
      const keys = await redis.lrange(RecentCategoryService.KEY, 0, RECENT_CATEGORY_LIMIT - 1);
      return (keys || []).filter(Boolean);
    } catch (e: any) {
      this.logger.warn(`Redis 不可用，最近使用分类按文章数据推导: ${e?.message ?? e}`);
      return [];
    }
  }

  /** 降级推导：取最新创建的文章所属分类去重后的前几条（不含小记） */
  private async fallbackKeys(): Promise<string[]> {
    const articles = await this.prisma.article.findMany({
      // categoryKey 为非空字段，无需 null 过滤（此前的 { not: null } 是类型错误）
      where: { type: 'article' },
      orderBy: { createdAt: 'desc' },
      select: { categoryKey: true },
      take: 100,
    });
    const keys: string[] = [];
    for (const a of articles) {
      const key = a.categoryKey as string;
      if (key && !keys.includes(key)) keys.push(key);
      if (keys.length >= RECENT_CATEGORY_LIMIT) break;
    }
    return keys;
  }

  /** key 列表 -> 分类对象（保持顺序，丢弃不存在的 key） */
  private async resolveCategories(keys: string[]): Promise<any[]> {
    if (!keys.length) return [];
    const cats = await this.prisma.category.findMany({
      where: { key: { in: keys } },
    });
    const map = new Map(cats.map((c) => [c.key, c]));
    return keys.map((k) => map.get(k)).filter(Boolean);
  }

  /** 启动时预热连接（消除首请求因连接未就绪的降级） */
  onModuleInit() {
    this.getRedis();
  }

  async onModuleDestroy() {
    if (this.redis) {
      await this.redis.quit().catch(() => this.redis?.disconnect());
    }
  }
}
