import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SiteConfigService } from '../site-config/site-config.service';

/** feed 最多输出的条目数（写死，不暴露分页参数，减少被遍历抓取的面） */
const FEED_ITEM_LIMIT = 50;

/** summary 为空时从正文截取的摘要长度（按 Unicode 码点截取，避免截断中文出错） */
const SUMMARY_FALLBACK_LENGTH = 150;

/** RSS 规范要求 language 用 zh-CN 这类形式 */
const FEED_LANGUAGE = 'zh-CN';

const FEED_GENERATOR = 'INKHEAP';

/** feed 内存缓存时长：收录站爬虫抓取频繁，避免每次都打数据库 */
const FEED_CACHE_TTL_MS = 5 * 60 * 1000;

/** feed 条目（内部中间结构） */
interface FeedItem {
  title: string;
  link: string;
  description: string;
  pubDate: Date;
  categories: string[];
}

@Injectable()
export class FeedService {
  private readonly logger = new Logger(FeedService.name);
  private cache: { xml: string; expiresAt: number } | null = null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly siteConfig: SiteConfigService,
  ) {}

  /**
   * 生成 RSS 2.0 feed。
   * @param requestBaseUrl 回退用的站点根地址（来自请求 Host），配置了 siteUrl 时不使用
   * @param feedSelfUrl feed 自身的完整地址，用于 atom:link rel="self"
   */
  async generateRss(requestBaseUrl: string, feedSelfUrl: string) {
    if (this.cache && this.cache.expiresAt > Date.now()) {
      return { xml: this.cache.xml, siteUrlSource: 'cache' as const };
    }

    const config = await this.siteConfig.findOne();
    const siteUrl = config.siteUrl || requestBaseUrl;
    const siteUrlSource = config.siteUrl ? ('config' as const) : ('fallback' as const);
    if (siteUrlSource === 'fallback') {
      this.logger.warn(
        'SiteConfig.siteUrl 未配置，feed 链接回退到请求 Host；请在后台「站点设置」中填写站点地址',
      );
    }

    const items = await this.collectItems(siteUrl);
    const xml = this.buildXml(config, siteUrl, feedSelfUrl, items);

    this.cache = { xml, expiresAt: Date.now() + FEED_CACHE_TTL_MS };
    return { xml, siteUrlSource };
  }

  /** 后台保存站点配置后调用，让 feed 立即反映新配置 */
  invalidateCache() {
    this.cache = null;
  }

  // ==================== 数据收集 ====================

  /**
   * 收集 feed 条目：已发布知识库文章（type=article）+ 全部已发布小记（含图集）。
   * 各取最近 LIMIT 条后合并排序再截断，避免全表扫描。
   */
  private async collectItems(siteUrl: string): Promise<FeedItem[]> {
    const [articles, blogs] = await Promise.all([
      this.prisma.article.findMany({
        where: { published: true, type: 'article' },
        orderBy: { createdAt: 'desc' },
        take: FEED_ITEM_LIMIT,
      }),
      this.prisma.blog.findMany({
        where: { published: true },
        orderBy: { createdAt: 'desc' },
        take: FEED_ITEM_LIMIT,
      }),
    ]);

    const articleItems: FeedItem[] = articles.map((a) => ({
      title: a.title,
      link: `${siteUrl}/#/articles/${a.slug}`,
      description: a.summary || this.truncate(this.stripMarkdown(a.content)),
      pubDate: a.createdAt,
      categories: this.parseTags(a.tags),
    }));

    const blogItems: FeedItem[] = blogs.map((b) => {
      let description = b.summary || b.quote || this.truncate(this.stripMarkdown(b.content));
      if (b.type === 'album') {
        const photoCount = this.parsePhotos(b.photos).length;
        description = this.appendPhotoHint(description, photoCount);
      }
      return {
        title: b.title,
        link: `${siteUrl}/#/xiaoji/${b.slug}`,
        description,
        pubDate: b.createdAt,
        categories: this.parseTags(b.tags),
      };
    });

    return [...articleItems, ...blogItems]
      .sort((a, b) => b.pubDate.getTime() - a.pubDate.getTime())
      .slice(0, FEED_ITEM_LIMIT);
  }

  // ==================== XML 组装 ====================

  private buildXml(
    config: { siteTitle: string; siteDescription: string; author: string },
    siteUrl: string,
    feedSelfUrl: string,
    items: FeedItem[],
  ): string {
    const title = config.siteTitle || '墨堆';
    const lastBuildDate = items.length > 0 ? items[0].pubDate : new Date();

    const channelLines = [
      '  <channel>',
      `    <title>${this.escapeXml(title)}</title>`,
      `    <link>${this.escapeXml(siteUrl)}</link>`,
      `    <description>${this.escapeXml(config.siteDescription)}</description>`,
      `    <language>${FEED_LANGUAGE}</language>`,
      config.author
        ? `    <managingEditor>${this.escapeXml(config.author)}</managingEditor>`
        : null,
      `    <lastBuildDate>${this.toRfc822(lastBuildDate)}</lastBuildDate>`,
      `    <generator>${FEED_GENERATOR}</generator>`,
      `    <atom:link href="${this.escapeXml(feedSelfUrl)}" rel="self" type="application/rss+xml"/>`,
      ...items.map((item) => this.buildItemXml(item)),
      '  </channel>',
    ];

    return [
      '<?xml version="1.0" encoding="UTF-8"?>',
      '<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">',
      ...channelLines.filter((line): line is string => line !== null),
      '</rss>',
      '',
    ].join('\n');
  }

  private buildItemXml(item: FeedItem): string {
    const lines = [
      '    <item>',
      `      <title>${this.escapeXml(item.title)}</title>`,
      `      <link>${this.escapeXml(item.link)}</link>`,
      // guid 直接用文章链接（isPermaLink），聚合器可据此去重
      `      <guid isPermaLink="true">${this.escapeXml(item.link)}</guid>`,
      `      <pubDate>${this.toRfc822(item.pubDate)}</pubDate>`,
      `      <description>${this.escapeXml(item.description)}</description>`,
      ...item.categories.map(
        (c) => `      <category>${this.escapeXml(c)}</category>`,
      ),
      '    </item>',
    ];
    return lines.join('\n');
  }

  // ==================== 文本处理 ====================

  /** XML 特殊字符转义：所有入库字段进 XML 前必须经过这里 */
  private escapeXml(s: string): string {
    return String(s ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }

  /** RFC 822 日期（RSS 2.0 要求），如 Sat, 17 Oct 2026 08:00:00 GMT */
  private toRfc822(date: Date): string {
    return date.toUTCString();
  }

  /**
   * 剥除 Markdown 语法，得到可读的纯文本摘要。
   * 只做「够用」的清洗（图片/链接/代码块/标题/强调等），不追求完美渲染。
   */
  private stripMarkdown(raw: string): string {
    return String(raw ?? '')
      .replace(/```[\s\S]*?```/g, ' ') // 围栏代码块
      .replace(/`([^`]*)`/g, '$1') // 行内代码，保留内容
      .replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1') // 图片 → alt 文本
      .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1') // 链接 → 链接文字
      .replace(/<[^>]+>/g, ' ') // 内嵌 HTML 标签
      .replace(/^[ \t]{0,3}#{1,6}[ \t]+/gm, '') // 标题井号
      .replace(/^[ \t]*>[ \t]?/gm, '') // 引用符
      .replace(/^[ \t]*[-*+][ \t]+/gm, '') // 无序列表符
      .replace(/[*_~]+/g, '') // 加粗/斜体/删除线标记
      .replace(/\s+/g, ' ')
      .trim();
  }

  /** 按 Unicode 码点截断，附省略号 */
  private truncate(text: string, limit = SUMMARY_FALLBACK_LENGTH): string {
    const chars = Array.from(text ?? '');
    if (chars.length <= limit) return text;
    return chars.slice(0, limit).join('') + '…';
  }

  /** 解析 tags JSON 字符串，异常时返回空数组 */
  private parseTags(raw: string | null): string[] {
    try {
      const parsed = JSON.parse(raw || '[]');
      return Array.isArray(parsed) ? parsed.filter((t) => typeof t === 'string' && t) : [];
    } catch {
      return [];
    }
  }

  /** 解析 photos JSON 字符串（对象数组），异常时返回空数组 */
  private parsePhotos(raw: string | null): { url?: string }[] {
    try {
      const parsed = JSON.parse(raw || '[]');
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  /** 图集条目：摘要末尾追加图片数提示 */
  private appendPhotoHint(description: string, photoCount: number): string {
    if (photoCount <= 0) return description;
    const hint = `（含 ${photoCount} 张图片）`;
    return description ? `${description}${hint}` : hint;
  }
}
