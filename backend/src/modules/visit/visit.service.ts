import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { GeoService } from './geo.service';
import { normalizeClientIp, startOfViewDay } from '../view/view.util';

const DAY_MS = 24 * 60 * 60 * 1000;

@Injectable()
export class VisitService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(VisitService.name);
  private timer?: NodeJS.Timeout;

  constructor(
    private prisma: PrismaService,
    private readonly geo: GeoService,
  ) {}

  onModuleInit() {
    void this.purgeExpired();
    this.timer = setInterval(() => void this.purgeExpired(), DAY_MS);
    // 定时器不阻止进程退出
    this.timer.unref?.();
  }

  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
  }

  /**
   * 前台 PV 上报：按自然日聚合计数 + 落一条访客明细（时间 / IP / 地区）。
   * 自然日与阅读统计口径保持一致（Asia/Shanghai），
   * 否则服务器跑在 UTC 时，中国用户的「一天」要到早上 8 点才翻篇。
   * 幂等写入：当天存在则 count+1，不存在则新建。
   */
  async report(path?: string, rawIp?: string) {
    const day = startOfViewDay();
    const ip = normalizeClientIp(rawIp);

    const visit = await this.prisma.siteVisit.upsert({
      where: { day },
      create: { day, count: 1 },
      update: { count: { increment: 1 } },
    });

    // 明细落库失败不影响聚合计数（地区解析在线程内完成，正常无感）
    try {
      const region = await this.geo.lookup(ip);
      await this.prisma.visitLog.create({
        data: { day, ip, region, path: path ?? '/' },
      });
    } catch (e) {
      this.logger.warn(
        `访问明细落库失败: ${e?.message ?? e}（若提示缺少模型，请先 npx prisma generate）`,
      );
    }

    return { day: visit.day, count: visit.count };
  }

  /** 后台「最近访问」列表：按时间倒序分页 */
  async getLogs(page = 1, pageSize = 20) {
    const p = Math.max(1, Number(page) || 1);
    const size = Math.min(100, Math.max(1, Number(pageSize) || 20));

    const [items, total] = await Promise.all([
      this.prisma.visitLog.findMany({
        orderBy: { createdAt: 'desc' },
        skip: (p - 1) * size,
        take: size,
        select: { id: true, ip: true, region: true, path: true, createdAt: true },
      }),
      this.prisma.visitLog.count(),
    ]);

    return { items, total, page: p, pageSize: size };
  }

  /** 清理超过保留期的明细（默认 180 天；VISIT_LOG_RETENTION_DAYS <= 0 表示永久保留） */
  private async purgeExpired() {
    const days = Number(process.env.VISIT_LOG_RETENTION_DAYS ?? 180);
    if (!Number.isFinite(days) || days <= 0) return;

    try {
      const res = await this.prisma.visitLog.deleteMany({
        where: { createdAt: { lt: new Date(Date.now() - days * DAY_MS) } },
      });
      if (res.count) this.logger.log(`已清理 ${res.count} 条超过 ${days} 天的访问明细`);
    } catch (e) {
      this.logger.warn(`清理访问明细失败: ${e?.message ?? e}`);
    }
  }
}
