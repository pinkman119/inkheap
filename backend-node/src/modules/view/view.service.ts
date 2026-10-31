import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { normalizeClientIp, startOfViewDay } from './view.util';

/** 可统计阅读量的内容类型：article = 知识库文章，note = 小记 */
export type ViewTargetType = 'article' | 'note';

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * 阅读量统计：同一 IP 对同一内容每天最多计一次。
 *
 * 计数之所以依赖 content_views 的唯一索引而不是「先查再写」：
 * 并发请求下两次查询可能都判定「今天没记录」，从而双双写入，计数就会偏高。
 * createMany + skipDuplicates 在单条 SQL 内完成冲突判断，返回受影响行数，
 * 只有真正插入成功的那一次才做自增，因此天然无竞态。
 */
@Injectable()
export class ViewCountService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(ViewCountService.name);
  private timer?: NodeJS.Timeout;

  constructor(private readonly prisma: PrismaService) {}

  onModuleInit() {
    // Prisma Client 未重新生成时 contentView 是 undefined，计数会静默失效（每次都「没记上」）。
    // 这属于部署错误而非运行期异常：直接让应用启动失败，避免线上「不计数却无人知晓」。
    if (!this.prisma.contentView) {
      throw new Error(
        'Prisma Client 缺少 contentView 模型，请先执行 npx prisma generate 再重启服务',
      );
    }

    void this.purgeExpired();
    this.timer = setInterval(() => void this.purgeExpired(), DAY_MS);
    // 定时器不阻止进程退出
    this.timer.unref?.();
  }

  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
  }

  /**
   * 记录一次阅读。返回是否计入真实阅读量（false = 今天该 IP 已计过）。
   */
  async record(targetType: ViewTargetType, targetId: string, rawIp?: string): Promise<boolean> {
    const ip = normalizeClientIp(rawIp);
    const day = startOfViewDay();

    let inserted = 0;
    try {
      const res = await this.prisma.contentView.createMany({
        data: [{ targetType, targetId, ip, day }],
        skipDuplicates: true,
      });
      inserted = res.count;
    } catch (e) {
      // 计数失败不应影响详情页正常返回，但必须留下可见痕迹
      this.logger.error(
        `记录阅读明细失败 ${targetType}/${targetId}: ${e?.message ?? e}（若提示缺少模型，请先 npx prisma generate）`,
      );
      return false;
    }

    if (!inserted) return false;
    await this.bump(targetType, targetId);
    return true;
  }

  /** 清理超过保留期的明细（默认 90 天；CONTENT_VIEW_RETENTION_DAYS <= 0 表示永久保留） */
  async purgeExpired() {
    const days = Number(process.env.CONTENT_VIEW_RETENTION_DAYS ?? 90);
    if (!Number.isFinite(days) || days <= 0) return;

    try {
      const res = await this.prisma.contentView.deleteMany({
        where: { createdAt: { lt: new Date(Date.now() - days * DAY_MS) } },
      });
      if (res.count) this.logger.log(`已清理 ${res.count} 条超过 ${days} 天的阅读明细`);
    } catch (e) {
      this.logger.warn(`清理阅读明细失败: ${e?.message ?? e}`);
    }
  }

  private async bump(targetType: ViewTargetType, targetId: string) {
    try {
      if (targetType === 'article') {
        // Prisma @updatedAt：update 时未显式传值就会自动刷新时间戳。
        // 阅读量自增属于非内容变更，须先读原值再回写（与 article.service.reorder 同一约定），
        // 否则点开老文章会把 updatedAt 刷成今天，污染所有按更新时间排序/展示的场景。
        const article = await this.prisma.article.findUnique({
          where: { id: targetId },
          select: { updatedAt: true },
        });
        if (!article) return;
        await this.prisma.article.update({
          where: { id: targetId },
          data: { viewCount: { increment: 1 }, updatedAt: article.updatedAt },
        });
      } else {
        const note = await this.prisma.blog.findUnique({
          where: { id: targetId },
          select: { updatedAt: true },
        });
        if (!note) return;
        await this.prisma.blog.update({
          where: { id: targetId },
          data: { viewCount: { increment: 1 }, updatedAt: note.updatedAt },
        });
      }
    } catch (e) {
      // 内容可能已被删除
      this.logger.warn(`阅读量自增失败 ${targetType}/${targetId}: ${e?.message ?? e}`);
    }
  }
}
