import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class DashboardService {
  constructor(private prisma: PrismaService) {}

  /**
   * 仪表盘四项指标（对应原型统计卡）：
   * - messages：用户来信（总数 / 未读数）
   * - reads：总阅读量（全部知识库文章 viewCount 之和）
   * - visits：总访问量（SiteVisit 每日 PV 之和）
   * - users：总用户量（微信访客数）
   */
  async getStats() {
    const [msgTotal, msgUnread, readsAgg, visitsAgg, userTotal] =
      await Promise.all([
        this.prisma.contactMessage.count(),
        this.prisma.contactMessage.count({ where: { read: false } }),
        this.prisma.article.aggregate({
          where: { type: 'article' },
          _sum: { viewCount: true },
        }),
        this.prisma.siteVisit.aggregate({ _sum: { count: true } }),
        this.prisma.wechatUser.count(),
      ]);

    return {
      messages: { total: msgTotal, unread: msgUnread },
      reads: { total: readsAgg._sum.viewCount ?? 0 },
      visits: { total: visitsAgg._sum.count ?? 0 },
      users: { total: userTotal },
    };
  }

  /**
   * 文章阅读量排行（抽屉明细）：全部知识库文章按阅读量降序。
   */
  async getArticleRanking() {
    const [items, totalArticles, readsAgg] = await Promise.all([
      this.prisma.article.findMany({
        where: { type: 'article' },
        orderBy: { viewCount: 'desc' },
        select: { id: true, title: true, slug: true, viewCount: true },
        take: 100,
      }),
      this.prisma.article.count({ where: { type: 'article' } }),
      this.prisma.article.aggregate({
        where: { type: 'article' },
        _sum: { viewCount: true },
      }),
    ]);

    return {
      items,
      totalArticles,
      totalReads: readsAgg._sum.viewCount ?? 0,
    };
  }

  /**
   * 访问量趋势（抽屉明细）：
   * - period = 7 | 30 | 90：按天聚合，label 为 M/D
   * - period = all：近 12 个月按月聚合，label 为 M月
   */
  async getVisitsTrend(period: string) {
    const valid = ['7', '30', '90', 'all'];
    if (!valid.includes(period)) {
      throw new BadRequestException('period 仅支持 7 / 30 / 90 / all');
    }

    if (period === 'all') {
      return this.getVisitsTrendMonthly();
    }
    return this.getVisitsTrendDaily(Number(period));
  }

  private async getVisitsTrendDaily(days: number) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const start = new Date(today);
    start.setDate(today.getDate() - (days - 1));

    const visits = await this.prisma.siteVisit.findMany({
      where: { day: { gte: start } },
      select: { day: true, count: true },
    });

    const byDay = new Map<string, number>();
    for (const v of visits) {
      byDay.set(this.dayKey(v.day), v.count);
    }

    const series: { label: string; value: number }[] = [];
    for (let i = 0; i < days; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      series.push({
        label: `${d.getMonth() + 1}/${d.getDate()}`,
        value: byDay.get(this.dayKey(d)) ?? 0,
      });
    }

    return this.summarize(series);
  }

  private async getVisitsTrendMonthly() {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth() - 11, 1);

    const visits = await this.prisma.siteVisit.findMany({
      where: { day: { gte: start } },
      select: { day: true, count: true },
    });

    const byMonth = new Map<string, number>();
    for (const v of visits) {
      const d = new Date(v.day);
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      byMonth.set(key, (byMonth.get(key) ?? 0) + v.count);
    }

    const series: { label: string; value: number }[] = [];
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      series.push({
        label: `${d.getMonth() + 1}月`,
        value: byMonth.get(`${d.getFullYear()}-${d.getMonth()}`) ?? 0,
      });
    }

    return this.summarize(series);
  }

  /**
   * 注册用户列表（抽屉明细）：微信访客按注册时间倒序，
   * 附带每人与数字生命的消息条数（ChatMessage 计数）。
   */
  async getUsers() {
    const [users, msgGroups, total] = await Promise.all([
      this.prisma.wechatUser.findMany({
        orderBy: { createdAt: 'desc' },
        take: 100,
        select: {
          id: true,
          openid: true,
          nickname: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
      this.prisma.chatMessage.groupBy({
        by: ['userId'],
        _count: { _all: true },
      }),
      this.prisma.wechatUser.count(),
    ]);

    const countByUser = new Map<string, number>();
    for (const g of msgGroups) {
      countByUser.set(g.userId, g._count._all);
    }

    const items = users.map((u) => ({
      id: u.id,
      nickname: u.nickname,
      openid: u.openid,
      createdAt: u.createdAt,
      lastActiveAt: u.updatedAt,
      messageCount: countByUser.get(u.id) ?? 0,
    }));

    return { items, total };
  }

  /** 统一计算区间总量与单点峰值 */
  private summarize(series: { label: string; value: number }[]) {
    const sum = series.reduce((s, d) => s + d.value, 0);
    const peak = series.reduce((m, d) => Math.max(m, d.value), 0);
    return { series, sum, peak };
  }

  /** Date → 本地时区 YYYY-MM-DD key */
  private dayKey(d: Date): string {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }
}
