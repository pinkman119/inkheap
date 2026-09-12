import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { startOfViewDay } from '../view/view.util';

@Injectable()
export class VisitService {
  constructor(private prisma: PrismaService) {}

  /**
   * 前台 PV 上报：按自然日聚合计数。
   * 自然日与阅读统计口径保持一致（Asia/Shanghai），
   * 否则服务器跑在 UTC 时，中国用户的「一天」要到早上 8 点才翻篇。
   * 幂等写入：当天存在则 count+1，不存在则新建。
   */
  async report(_path?: string) {
    const day = startOfViewDay();

    const visit = await this.prisma.siteVisit.upsert({
      where: { day },
      create: { day, count: 1 },
      update: { count: { increment: 1 } },
    });

    return { day: visit.day, count: visit.count };
  }
}
