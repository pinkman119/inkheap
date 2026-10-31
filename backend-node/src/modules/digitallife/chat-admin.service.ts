import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface SessionListQuery {
  page?: string;
  pageSize?: string;
  /** 按 IP 模糊搜索（命中会话内任意一条消息即视为匹配） */
  ip?: string;
}

/** 会话唯一键：userId + sessionId（sessionId 为空表示「默认/旧会话」） */
const keyOf = (userId: string, sessionId: string | null) => `${userId}|${sessionId ?? ''}`;

/**
 * 数字生命后台会话管理服务：
 * - 会话列表：按 (userId, sessionId) 聚合，展示最近对话时间 / 消息数 / 展示 IP / 首条提问预览
 * - 会话详情：按会话取出全部消息（时间正序），用于后台抽屉复原对话
 */
@Injectable()
export class ChatAdminService {
  constructor(private prisma: PrismaService) {}

  /** 会话列表（按最近对话时间倒序，分页） */
  async listSessions(query: SessionListQuery) {
    const page = Math.max(1, Number(query.page) || 1);
    const pageSize = Math.min(100, Math.max(1, Number(query.pageSize) || 20));
    const ipKeyword = (query.ip || '').trim().toLowerCase();

    let groupWhere: Record<string, unknown> = {};
    if (ipKeyword) {
      // 1. 先找出 IP 命中的 (userId, sessionId) 组合
      const matched = await this.prisma.chatMessage.findMany({
        where: { ip: { contains: ipKeyword } },
        select: { userId: true, sessionId: true },
        distinct: ['userId', 'sessionId'],
      });
      if (!matched.length) {
        return { items: [], total: 0, page, pageSize };
      }
      // 2. 聚合时统计这些会话的全部消息（而非仅命中 IP 的那几条）
      groupWhere = {
        OR: matched.map((r) => ({ userId: r.userId, sessionId: r.sessionId })),
      };
    }

    // 3. 按 (userId, sessionId) 聚合
    const groups = await this.prisma.chatMessage.groupBy({
      by: ['userId', 'sessionId'],
      where: groupWhere,
      _count: { _all: true },
      _max: { createdAt: true },
    });
    groups.sort(
      (a, b) =>
        (b._max.createdAt?.getTime() ?? 0) - (a._max.createdAt?.getTime() ?? 0),
    );

    const total = groups.length;
    const pageGroups = groups.slice((page - 1) * pageSize, page * pageSize);
    if (!pageGroups.length) {
      return { items: [], total, page, pageSize };
    }

    // 4. 展示 IP：每个会话最早一条带 IP 的消息（该会话发起时的来源地址）
    const ipRows = await this.prisma.chatMessage.findMany({
      where: {
        ip: { not: null },
        OR: pageGroups.map((g) => ({ userId: g.userId, sessionId: g.sessionId })),
      },
      select: { userId: true, sessionId: true, ip: true, createdAt: true },
      orderBy: { createdAt: 'asc' },
    });
    const ipMap = new Map<string, string>();
    for (const r of ipRows) {
      const key = keyOf(r.userId, r.sessionId);
      if (!ipMap.has(key)) ipMap.set(key, r.ip as string);
    }

    // 5. 首条用户消息作为预览
    const previewRows = await this.prisma.chatMessage.findMany({
      where: {
        role: 'user',
        OR: pageGroups.map((g) => ({ userId: g.userId, sessionId: g.sessionId })),
      },
      select: { userId: true, sessionId: true, content: true, createdAt: true },
      orderBy: { createdAt: 'asc' },
    });
    const previewMap = new Map<string, string>();
    for (const r of previewRows) {
      const key = keyOf(r.userId, r.sessionId);
      if (!previewMap.has(key)) previewMap.set(key, r.content);
    }

    return {
      items: pageGroups.map((g) => {
        const key = keyOf(g.userId, g.sessionId);
        return {
          userId: g.userId,
          sessionId: g.sessionId,
          ip: ipMap.get(key) ?? null,
          messageCount: g._count._all,
          lastMessageAt: g._max.createdAt,
          firstMessage: previewMap.get(key) ?? null,
        };
      }),
      total,
      page,
      pageSize,
    };
  }

  /** 会话详情：全部消息（时间正序，最多 500 条） */
  async getSessionMessages(userId: string, sessionId?: string) {
    const items = await this.prisma.chatMessage.findMany({
      where: { userId, sessionId: sessionId || null },
      orderBy: { createdAt: 'asc' },
      take: 500,
      select: { id: true, role: true, content: true, createdAt: true },
    });
    return { items };
  }
}
