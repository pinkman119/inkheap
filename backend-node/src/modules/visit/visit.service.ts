import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class VisitService {
  constructor(private prisma: PrismaService) {}

  /**
   * 前台 PV 上报：按天（服务器本地时区零点）聚合计数。
   * 幂等写入：当天存在则 count+1，不存在则新建。
   */
  async report(_path?: string) {
    const day = new Date();
    day.setHours(0, 0, 0, 0);

    const visit = await this.prisma.siteVisit.upsert({
      where: { day },
      create: { day, count: 1 },
      update: { count: { increment: 1 } },
    });

    return { day: visit.day, count: visit.count };
  }
}
