import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface ContactQuery {
  page?: number;
  pageSize?: number;
  read?: string; // 'all' | 'read' | 'unread'
  keyword?: string;
}

@Injectable()
export class ContactService {
  constructor(private prisma: PrismaService) {}

  /** 前台提交一条来信（无需鉴权） */
  async create(dto: {
    name?: string;
    email?: string;
    phone?: string;
    subject?: string;
    contact?: string;
    message: string;
  }) {
    return this.prisma.contactMessage.create({
      data: {
        name: dto.name ?? null,
        email: dto.email ?? null,
        phone: dto.phone ?? null,
        subject: dto.subject ?? null,
        contact: dto.contact ?? null,
        message: dto.message,
      },
    });
  }

  /** 后台：分页查询来信 */
  async findAll(query: ContactQuery) {
    const page = Math.max(1, Number(query.page) || 1);
    const pageSize = Math.min(100, Math.max(1, Number(query.pageSize) || 10));
    const skip = (page - 1) * pageSize;

    const where: any = {};
    if (query.read === 'read') where.read = true;
    else if (query.read === 'unread') where.read = false;

    if (query.keyword) {
      where.OR = [
        { name: { contains: query.keyword } },
        { email: { contains: query.keyword } },
        { subject: { contains: query.keyword } },
        { message: { contains: query.keyword } },
      ];
    }

    const [items, total] = await Promise.all([
      this.prisma.contactMessage.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: pageSize,
      }),
      this.prisma.contactMessage.count({ where }),
    ]);

    return { items, total, page, pageSize };
  }

  async findOne(id: string) {
    const msg = await this.prisma.contactMessage.findUnique({ where: { id } });
    if (!msg) throw new NotFoundException('来信不存在');
    return msg;
  }

  /** 标记已读（也可用于标记未读） */
  async setRead(id: string, read: boolean) {
    await this.findOne(id);
    return this.prisma.contactMessage.update({ where: { id }, data: { read } });
  }

  /** 批量标记已读 */
  async setReadMany(ids: string[], read: boolean) {
    return this.prisma.contactMessage.updateMany({
      where: { id: { in: ids } },
      data: { read },
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.contactMessage.delete({ where: { id } });
  }

  /** 后台仪表盘统计：总数 / 未读数 */
  async stats() {
    const [total, unread] = await Promise.all([
      this.prisma.contactMessage.count(),
      this.prisma.contactMessage.count({ where: { read: false } }),
    ]);
    return { total, unread };
  }
}
