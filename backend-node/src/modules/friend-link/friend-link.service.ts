import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateFriendLinkDto } from './dto/create-friend-link.dto';
import { UpdateFriendLinkDto } from './dto/update-friend-link.dto';
import { CreateFriendApplicationDto } from './dto/create-friend-application.dto';
import { ApproveFriendApplicationDto } from './dto/review-friend-application.dto';

export interface FriendLinkQuery {
  keyword?: string;
  status?: string; // all | active | dormant
  mode?: string; // all | 0 | 1 | 2
}

export interface FriendApplicationQuery {
  keyword?: string;
  status?: string; // all | pending | approved | rejected
}

/** 模式取值：0 = 全模式；1 = 仅工作；2 = 仅生活 */
const MODE_ALL = 0;
const MODE_WORK = 1;
const MODE_LIFE = 2;

@Injectable()
export class FriendLinkService {
  constructor(private prisma: PrismaService) {}

  // ==================== 友链（后台 CRUD） ====================

  /** 后台列表：关键词 + 状态 + 模式筛选 */
  async findAll(query: FriendLinkQuery = {}) {
    const where: any = {};
    if (query.status && query.status !== 'all') where.status = query.status;
    if (query.mode && query.mode !== 'all') where.mode = Number(query.mode);
    if (query.keyword) {
      where.OR = [
        { name: { contains: query.keyword } },
        { url: { contains: query.keyword } },
        { desc: { contains: query.keyword } },
        { group: { contains: query.keyword } },
        { tag: { contains: query.keyword } },
      ];
    }
    return this.prisma.friendLink.findMany({
      where,
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    });
  }

  async findOne(id: string) {
    const link = await this.prisma.friendLink.findUnique({ where: { id } });
    if (!link) throw new NotFoundException('友链不存在');
    return link;
  }

  async create(dto: CreateFriendLinkDto) {
    let sortOrder = dto.sortOrder;
    if (sortOrder === undefined) {
      const last = await this.prisma.friendLink.findFirst({
        orderBy: { sortOrder: 'desc' },
        select: { sortOrder: true },
      });
      sortOrder = (last?.sortOrder ?? -1) + 1;
    }
    return this.prisma.friendLink.create({
      data: {
        name: dto.name,
        url: dto.url,
        avatar: dto.avatar || null,
        desc: dto.desc || null,
        tag: dto.tag || null,
        group: dto.group || null,
        message: dto.message || null,
        mode: dto.mode ?? MODE_ALL,
        status: dto.status ?? 'active',
        isSelf: dto.isSelf ?? false,
        applicationId: dto.applicationId || null,
        sortOrder,
      },
    });
  }

  async update(id: string, dto: UpdateFriendLinkDto) {
    await this.findOne(id);
    return this.prisma.friendLink.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.url !== undefined && { url: dto.url }),
        ...(dto.avatar !== undefined && { avatar: dto.avatar || null }),
        ...(dto.desc !== undefined && { desc: dto.desc || null }),
        ...(dto.tag !== undefined && { tag: dto.tag || null }),
        ...(dto.group !== undefined && { group: dto.group || null }),
        ...(dto.message !== undefined && { message: dto.message || null }),
        ...(dto.mode !== undefined && { mode: dto.mode }),
        ...(dto.status !== undefined && { status: dto.status }),
        ...(dto.isSelf !== undefined && { isSelf: dto.isSelf }),
        ...(dto.sortOrder !== undefined && { sortOrder: dto.sortOrder }),
      },
    });
  }

  /**
   * 删除友链：若该友链来自某条申请，把申请退回待审核，允许重新通过。
   */
  async remove(id: string) {
    const link = await this.findOne(id);
    await this.prisma.$transaction([
      this.prisma.friendLink.delete({ where: { id } }),
      ...(link.applicationId
        ? [
            this.prisma.friendApplication.update({
              where: { id: link.applicationId },
              data: { status: 'pending', linkId: null, handledAt: null },
            }),
          ]
        : []),
    ]);
    return { message: '删除成功' };
  }

  /** 上移 / 下移：与相邻记录交换 sortOrder（后台列表排序用） */
  async move(id: string, direction: 'up' | 'down') {
    const current = await this.findOne(id);
    const sibling = await this.prisma.friendLink.findFirst({
      where: {
        sortOrder:
          direction === 'up' ? { lt: current.sortOrder } : { gt: current.sortOrder },
      },
      orderBy: { sortOrder: direction === 'up' ? 'desc' : 'asc' },
    });
    if (!sibling) {
      throw new BadRequestException(direction === 'up' ? '已经是最前面了' : '已经是最后面了');
    }
    const [, , updated] = await this.prisma.$transaction([
      this.prisma.friendLink.update({
        where: { id: current.id },
        data: { sortOrder: sibling.sortOrder },
      }),
      this.prisma.friendLink.update({
        where: { id: sibling.id },
        data: { sortOrder: current.sortOrder },
      }),
      this.prisma.friendLink.findUnique({ where: { id: current.id } }),
    ]);
    return updated;
  }

  // ==================== 前台公开 ====================

  /**
   * 前台「邻居」页数据：只返回已通过审核（落库）的友链，并按模式过滤。
   * mode = work → 取 mode 为 0 / 1；mode = life → 取 mode 为 0 / 2。
   */
  async findPublic(mode?: string) {
    const where: any = {};
    if (mode === 'work') where.mode = { in: [MODE_ALL, MODE_WORK] };
    else if (mode === 'life') where.mode = { in: [MODE_ALL, MODE_LIFE] };
    return this.prisma.friendLink.findMany({
      where,
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    });
  }

  // ==================== 加入申请 ====================

  /** 前台提交：一律生成一条「待审核」申请，不会直接出现在前台 */
  async apply(dto: CreateFriendApplicationDto) {
    return this.prisma.friendApplication.create({
      data: {
        name: dto.name,
        email: dto.email,
        url: dto.url,
        avatar: dto.avatar || null,
        type: dto.type || '其他',
        message: dto.message || null,
        status: 'pending',
      },
    });
  }

  /**
   * 前台「邻居留言」：全部申请，无论通过与否都展示。
   * 只返回公开字段（邮箱、后台备注等不外泄）。
   */
  async findPublicApplications() {
    return this.prisma.friendApplication.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        url: true,
        avatar: true,
        type: true,
        message: true,
        status: true,
        linkId: true,
        createdAt: true,
      },
    });
  }

  /** 后台申请列表 */
  async findApplications(query: FriendApplicationQuery = {}) {
    const where: any = {};
    if (query.status && query.status !== 'all') where.status = query.status;
    if (query.keyword) {
      where.OR = [
        { name: { contains: query.keyword } },
        { email: { contains: query.keyword } },
        { url: { contains: query.keyword } },
        { message: { contains: query.keyword } },
      ];
    }
    return this.prisma.friendApplication.findMany({
      where,
      orderBy: [{ createdAt: 'desc' }],
    });
  }

  async findApplication(id: string) {
    const app = await this.prisma.friendApplication.findUnique({ where: { id } });
    if (!app) throw new NotFoundException('申请不存在');
    return app;
  }

  /** 后台仪表盘 / 侧栏未处理数量 */
  async applicationStats() {
    const [total, pending, approved] = await Promise.all([
      this.prisma.friendApplication.count(),
      this.prisma.friendApplication.count({ where: { status: 'pending' } }),
      this.prisma.friendApplication.count({ where: { status: 'approved' } }),
    ]);
    return { total, pending, approved };
  }

  /**
   * 审核通过：以申请内容为基础生成（或更新）一条友链。
   * 用 applicationId 做唯一键 upsert，保证同一申请不会被重复建链。
   */
  async approve(id: string, dto: ApproveFriendApplicationDto = {}) {
    const app = await this.findApplication(id);
    let sortOrder = dto.sortOrder;
    if (sortOrder === undefined) {
      const last = await this.prisma.friendLink.findFirst({
        orderBy: { sortOrder: 'desc' },
        select: { sortOrder: true },
      });
      sortOrder = (last?.sortOrder ?? -1) + 1;
    }

    const data = {
      name: dto.name || app.name,
      url: dto.url || app.url,
      // 头像：后台可覆盖，未填则沿用申请时提交的地址
      avatar: dto.avatar || app.avatar || null,
      desc: dto.desc || null,
      tag: dto.tag || app.type || null,
      group: dto.group || app.type || null,
      message: app.message || null,
      mode: dto.mode ?? MODE_ALL,
      status: 'active',
      sortOrder,
    };

    const [, link] = await this.prisma.$transaction([
      this.prisma.friendApplication.update({
        where: { id: app.id },
        data: { status: 'approved', handledAt: new Date(), remark: null },
      }),
      this.prisma.friendLink.upsert({
        where: { applicationId: app.id },
        update: data,
        create: { ...data, applicationId: app.id },
      }),
    ]);
    // 回写 linkId，方便后台看出「这条申请生成了哪条友链」
    await this.prisma.friendApplication.update({
      where: { id: app.id },
      data: { linkId: link.id },
    });
    return this.findApplication(app.id);
  }

  /** 审核拒绝：保留记录，可填写原因 */
  async reject(id: string, remark?: string) {
    await this.findApplication(id);
    return this.prisma.friendApplication.update({
      where: { id },
      data: { status: 'rejected', remark: remark || null, handledAt: new Date() },
    });
  }

  /** 删除申请（同时清掉来源标记，避免友链仍指向已删除申请） */
  async removeApplication(id: string) {
    await this.findApplication(id);
    await this.prisma.friendApplication.delete({ where: { id } });
    return { message: '删除成功' };
  }
}
