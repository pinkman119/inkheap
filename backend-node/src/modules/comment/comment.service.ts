import { BadRequestException, HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { MailService } from '../mail/mail.service';
import { CreateCommentDto, CommentTargetType, FRIENDS_BOARD_TARGET_ID } from './dto/comment.dto';

/** 评论展示态作者信息 */
export interface CommentAuthor {
  id: string;
  nickname: string;
  homepageUrl: string | null;
  avatarUrl: string | null;
}

/** 前台单条评论（二层评论内嵌在顶层 replies 中） */
export interface CommentItem {
  id: string;
  content: string;
  createdAt: Date;
  author: CommentAuthor;
  /** 二层评论：被回复人昵称（「回复 @xxx」） */
  replyToNickname?: string | null;
  replies?: CommentItem[];
}

/**
 * 评论服务：前台一层盖楼评论 + 后台管理（列表/删除）。
 * targetType 口径与 ContentView 一致：article = 知识库文章，note = 小记；
 * friends = 邻居留言板（/#/friends 页，固定 ID 的虚拟目标，无需校验数据库实体）。
 * 回复时向被回复人发送邮件通知（含双方原话与跳转链接，信件样式复用联系我模板）。
 */
@Injectable()
export class CommentService {
  private readonly logger = new Logger(CommentService.name);

  /** 发表评论频率限制：userId -> 最近一分钟内的提交时间戳 */
  private readonly submitLog = new Map<string, number[]>();
  private static readonly SUBMIT_WINDOW_MS = 60 * 1000;
  private static readonly SUBMIT_LIMIT = 5;

  constructor(
    private prisma: PrismaService,
    private mailService: MailService,
  ) {}

  /* ==================== 前台：公开读取 ==================== */

  /** 分页查询某内容下的评论：顶层倒序 + 回复正序，含作者昵称 */
  async list(targetType: CommentTargetType, targetId: string, page = 1, pageSize = 10) {
    page = Math.max(1, page);
    pageSize = Math.min(50, Math.max(1, pageSize));

    const where: Prisma.CommentWhereInput = { targetType, targetId, parentId: null };

    const [total, tops] = await this.prisma.$transaction([
      this.prisma.comment.count({ where }),
      this.prisma.comment.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);

    if (tops.length === 0) {
      return { items: [] as CommentItem[], total, page, pageSize };
    }

    // 批量取这些顶层下的全部回复（正序）
    const topIds = tops.map((t) => t.id);
    const replies = await this.prisma.comment.findMany({
      where: { parentId: { in: topIds } },
      orderBy: { createdAt: 'asc' },
    });

    return {
      items: await this.assemble(tops, replies),
      total,
      page,
      pageSize,
    };
  }

  /** 组装两层结构并批量解析作者昵称 */
  private async assemble(
    tops: Array<{ id: string; content: string; createdAt: Date; userId: string; replyToUserId: string | null }>,
    replies: Array<{
      id: string;
      content: string;
      createdAt: Date;
      userId: string;
      parentId: string | null;
      replyToUserId: string | null;
    }>,
  ): Promise<CommentItem[]> {
    // 收集所有需要解析的用户 id（评论人 + 被回复人）
    const userIds = new Set<string>();
    for (const c of [...tops, ...replies]) {
      userIds.add(c.userId);
      if (c.replyToUserId) userIds.add(c.replyToUserId);
    }
    const userRows = await this.prisma.emailUser.findMany({
      where: { id: { in: [...userIds] } },
      select: { id: true, nickname: true, homepageUrl: true, avatarUrl: true },
    });
    const userMap = new Map(userRows.map((u) => [u.id, u]));
    const authorOf = (id: string): CommentAuthor =>
      userMap.get(id) || { id, nickname: '未知用户', homepageUrl: null, avatarUrl: null };

    const replyMap = new Map<string, CommentItem[]>();
    for (const r of replies) {
      const item: CommentItem = {
        id: r.id,
        content: r.content,
        createdAt: r.createdAt,
        author: authorOf(r.userId),
        replyToNickname: r.replyToUserId ? authorOf(r.replyToUserId).nickname : null,
      };
      const list = replyMap.get(r.parentId || '') || [];
      list.push(item);
      replyMap.set(r.parentId || '', list);
    }

    return tops.map((t) => ({
      id: t.id,
      content: t.content,
      createdAt: t.createdAt,
      author: authorOf(t.userId),
      replies: replyMap.get(t.id) || [],
    }));
  }

  /* ==================== 前台：发表（登录） ==================== */

  /**
   * 发表评论 / 回复。
   * @param baseUrl 站点根地址（协议 + Host，用于回复通知邮件拼跳转链接的兜底）
   */
  async create(userId: string, dto: CreateCommentDto, baseUrl = '') {
    const content = dto.content.trim();
    if (!content) {
      throw new BadRequestException('评论内容不能为空');
    }

    // 频率限制：每用户每分钟最多 5 条
    this.checkSubmitLimit(userId);

    // 校验评论对象存在且已发布
    await this.ensureTarget(dto.targetType, dto.targetId);

    let parentId: string | null = null;
    let replyToUserId: string | null = null;
    // 被回复的评论（通知邮件里要引用其原话）
    let repliedComment: { content: string } | null = null;

    if (dto.parentId) {
      const parent = await this.prisma.comment.findUnique({ where: { id: dto.parentId } });
      if (!parent) {
        throw new BadRequestException('父评论不存在');
      }
      // 只能挂顶层评论下（一层盖楼，禁止三层）
      if (parent.parentId !== null) {
        throw new BadRequestException('不支持多层回复');
      }
      if (parent.targetType !== dto.targetType || parent.targetId !== dto.targetId) {
        throw new BadRequestException('父评论与评论目标不一致');
      }
      parentId = parent.id;

      // 被回复人：显式 replyToId 优先（回复某条二层评论的场景），否则为父评论作者
      let replied = parent;
      if (dto.replyToId && dto.replyToId !== parent.id) {
        const target = await this.prisma.comment.findUnique({ where: { id: dto.replyToId } });
        if (
          !target ||
          target.targetType !== dto.targetType ||
          target.targetId !== dto.targetId ||
          // 必须属于同一顶层（顶层自身，或其下回复）
          (target.parentId !== null && target.parentId !== parent.id)
        ) {
          throw new BadRequestException('被回复评论不合法');
        }
        replied = target;
      }
      replyToUserId = replied.userId;
      repliedComment = { content: replied.content };
    }

    const created = await this.prisma.comment.create({
      data: {
        targetType: dto.targetType,
        targetId: dto.targetId,
        userId,
        content,
        parentId,
        replyToUserId,
      },
    });

    // 返回完整作者信息，前端发表后无需二次拉取即可渲染
    const author = await this.prisma.emailUser.findUnique({
      where: { id: userId },
      select: { id: true, nickname: true, homepageUrl: true, avatarUrl: true },
    });

    // 回复他人（不含回复自己）时，向被回复人发送邮件通知；
    // 邮件失败只记日志，不影响评论发表结果
    if (replyToUserId && replyToUserId !== userId && repliedComment) {
      void this.notifyReplyByEmail({
        replierNickname: author?.nickname || '未知用户',
        replyContent: content,
        originalContent: repliedComment.content,
        replyToUserId,
        targetType: dto.targetType,
        targetId: dto.targetId,
        baseUrl,
      });
    }
    const replyToNickname = replyToUserId
      ? (
          await this.prisma.emailUser.findUnique({
            where: { id: replyToUserId },
            select: { nickname: true },
          })
        )?.nickname || null
      : null;

    const item: CommentItem = {
      id: created.id,
      content: created.content,
      createdAt: created.createdAt,
      author: author || { id: userId, nickname: '未知用户', homepageUrl: null, avatarUrl: null },
      replyToNickname,
    };
    return item;
  }

  /** 发表频率限制（内存，单实例部署） */
  private checkSubmitLimit(userId: string) {
    const now = Date.now();
    const log = (this.submitLog.get(userId) || []).filter(
      (ts) => now - ts < CommentService.SUBMIT_WINDOW_MS,
    );
    if (log.length >= CommentService.SUBMIT_LIMIT) {
      throw new HttpException('评论过于频繁，请稍后再试', HttpStatus.TOO_MANY_REQUESTS);
    }
    log.push(now);
    this.submitLog.set(userId, log);
  }

  /** 校验评论目标存在且已发布 */
  private async ensureTarget(targetType: CommentTargetType, targetId: string) {
    if (targetType === 'friends') {
      // 邻居留言板：页面级虚拟目标，只认固定 ID，无数据库实体
      if (targetId !== FRIENDS_BOARD_TARGET_ID) {
        throw new BadRequestException('评论目标类型不合法');
      }
      return;
    }
    if (targetType === 'article') {
      const article = await this.prisma.article.findUnique({
        where: { id: targetId },
        select: { id: true, published: true },
      });
      if (!article || !article.published) {
        throw new BadRequestException('评论对象不存在或未发布');
      }
    } else {
      const note = await this.prisma.blog.findUnique({
        where: { id: targetId },
        select: { id: true, published: true },
      });
      if (!note || !note.published) {
        throw new BadRequestException('评论对象不存在或未发布');
      }
    }
  }

  /* ==================== 回复邮件通知 ==================== */

  /**
   * 回复通知：向被回复人发送邮件（信件样式复用联系我模板），
   * 内含被回复人原话、回复内容与跳转对应页面的链接。任何失败只记日志。
   */
  private async notifyReplyByEmail(params: {
    replierNickname: string;
    replyContent: string;
    originalContent: string;
    replyToUserId: string;
    targetType: CommentTargetType;
    targetId: string;
    baseUrl: string;
  }): Promise<void> {
    try {
      const recipient = await this.prisma.emailUser.findUnique({
        where: { id: params.replyToUserId },
        select: { email: true, nickname: true },
      });
      if (!recipient) return;

      const page = await this.resolveTargetPage(params.targetType, params.targetId, params.baseUrl);
      if (!page) return;

      await this.mailService.sendCommentReply({
        toEmail: recipient.email,
        toNickname: recipient.nickname,
        replierNickname: params.replierNickname,
        originalContent: params.originalContent,
        replyContent: params.replyContent,
        pageDesc: page.desc,
        pageUrl: page.url,
      });
      this.logger.log(`评论回复通知已发送 -> ${recipient.email}`);
    } catch (e: any) {
      // SMTP 未配置 / 发送失败等：不阻断评论流程
      this.logger.warn(`评论回复通知发送失败（评论流程不受影响）: ${e?.message ?? e}`);
    }
  }

  /** 解析评论所在页面的跳转链接与描述（siteUrl 优先，回退请求 Host） */
  private async resolveTargetPage(
    targetType: CommentTargetType,
    targetId: string,
    baseUrl: string,
  ): Promise<{ url: string; desc: string } | null> {
    const siteConfig = await this.prisma.siteConfig.findUnique({ where: { id: 'site' } });
    const site = (siteConfig?.siteUrl || baseUrl).replace(/\/+$/, '');

    if (targetType === 'friends') {
      return { url: `${site}/#/friends`, desc: '邻居留言板' };
    }
    if (targetType === 'article') {
      const article = await this.prisma.article.findUnique({
        where: { id: targetId },
        select: { slug: true, title: true },
      });
      if (!article) return null;
      return { url: `${site}/#/articles/${article.slug}`, desc: `知识库《${article.title}》` };
    }
    const note = await this.prisma.blog.findUnique({
      where: { id: targetId },
      select: { slug: true, title: true },
    });
    if (!note) return null;
    return { url: `${site}/#/xiaoji/${note.slug}`, desc: `小记《${note.title}》` };
  }

  /* ==================== 后台管理 ==================== */

  /** 后台评论列表：分页 + 来源/用户筛选，联查来源标题/slug 与评论人信息 */
  async adminList(page = 1, pageSize = 20, targetType?: CommentTargetType, userId?: string) {
    page = Math.max(1, page);
    pageSize = Math.min(100, Math.max(1, pageSize));

    const where: Prisma.CommentWhereInput = {};
    if (targetType) where.targetType = targetType;
    if (userId) where.userId = userId;

    const [total, comments] = await this.prisma.$transaction([
      this.prisma.comment.count({ where }),
      this.prisma.comment.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);

    // 批量解析评论人
    const userIds = [...new Set(comments.map((c) => c.userId))];
    const users = await this.prisma.emailUser.findMany({
      where: { id: { in: userIds } },
      select: { id: true, nickname: true, email: true, avatarUrl: true },
    });
    const userMap = new Map(users.map((u) => [u.id, u]));

    // 批量解析来源标题（article → articles，note → blogs）
    const articleIds = comments.filter((c) => c.targetType === 'article').map((c) => c.targetId);
    const noteIds = comments.filter((c) => c.targetType === 'note').map((c) => c.targetId);
    const [articleRows, noteRows] = await Promise.all([
      articleIds.length
        ? this.prisma.article.findMany({
            where: { id: { in: articleIds } },
            select: { id: true, title: true, slug: true },
          })
        : Promise.resolve([]),
      noteIds.length
        ? this.prisma.blog.findMany({
            where: { id: { in: noteIds } },
            select: { id: true, title: true, slug: true },
          })
        : Promise.resolve([]),
    ]);
    const sourceMap = new Map<string, { title: string; slug: string }>();
    for (const a of articleRows) sourceMap.set(`article:${a.id}`, { title: a.title, slug: a.slug });
    for (const n of noteRows) sourceMap.set(`note:${n.id}`, { title: n.title, slug: n.slug });

    const items = comments.map((c) => {
      // friends = 邻居留言板（虚拟来源）：固定标题与 slug，前端据此跳转 #/friends；
      // article/note 来源已删除时为 null，前端显示「已删除」且不可跳转
      const source =
        c.targetType === 'friends'
          ? { title: '邻居留言板', slug: 'friends' }
          : sourceMap.get(`${c.targetType}:${c.targetId}`);
      const user = userMap.get(c.userId);
      return {
        id: c.id,
        content: c.content,
        targetType: c.targetType,
        targetId: c.targetId,
        // 来源已删除时为 null，前端显示「已删除」且不可跳转
        sourceTitle: source?.title || null,
        sourceSlug: source?.slug || null,
        nickname: user?.nickname || '未知用户',
        email: user?.email || '',
        avatarUrl: user?.avatarUrl || null,
        isReply: c.parentId !== null,
        replyToUserId: c.replyToUserId,
        createdAt: c.createdAt,
      };
    });

    return { items, total, page, pageSize };
  }

  /** 删除评论：顶层评论事务内连带删除全部回复 */
  async adminDelete(id: string) {
    const comment = await this.prisma.comment.findUnique({ where: { id } });
    if (!comment) {
      throw new BadRequestException('评论不存在');
    }

    if (comment.parentId === null) {
      // 顶层：连带删除其下全部回复
      const result = await this.prisma.$transaction([
        this.prisma.comment.deleteMany({ where: { parentId: id } }),
        this.prisma.comment.delete({ where: { id } }),
      ]);
      this.logger.log(`删除顶层评论 ${id}（连带 ${result[0].count} 条回复）`);
      return { deleted: true, cascaded: result[0].count };
    }

    await this.prisma.comment.delete({ where: { id } });
    this.logger.log(`删除回复评论 ${id}`);
    return { deleted: true, cascaded: 0 };
  }
}
