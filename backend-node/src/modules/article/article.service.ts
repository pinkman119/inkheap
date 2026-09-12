import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import { PrismaService } from '../prisma/prisma.service';
import { TrainingService } from '../digitallife/training.service';
import { ModelConfigService } from '../digitallife/model-config.service';
import { ViewCountService } from '../view/view.service';
import { resolveDisplayViews } from '../view/view.util';
import { CreateArticleDto } from './dto/create-article.dto';
import { UpdateArticleDto } from './dto/update-article.dto';
import { QueryArticleDto } from './dto/query-article.dto';

// 自动生成摘要的系统提示词：约束为单段中文纯文本，直接可用作列表摘要
const SUMMARY_SYSTEM_PROMPT = [
  '你是一名资深中文编辑，擅长为技术博客撰写摘要。',
  '请阅读用户提供的文章正文（Markdown 格式），生成一段简洁、准确的摘要。',
  '要求：',
  '1. 使用中文，长度控制在 80~150 字；',
  '2. 概括文章的核心主题与关键结论，不要逐段复述，也不要加入正文没有的信息；',
  '3. 输出为一段纯文本：不要换行、不要 Markdown 标记、不要引号，',
  '   也不要出现「摘要」「本文」「总结」等标题式前缀；',
  '4. 只输出摘要本身，不要任何解释或额外说明。',
].join('\n');

// 正文过长时截断后再送入模型，控制 token 消耗（超长文章取开头即可覆盖主题）
const SUMMARY_CONTENT_LIMIT = 8000;

@Injectable()
export class ArticleService {
  private readonly logger = new Logger(ArticleService.name);

  constructor(
    private prisma: PrismaService,
    private trainingService: TrainingService,
    private viewCountService: ViewCountService,
    private modelConfig: ModelConfigService,
  ) {}

  async findAll(query: QueryArticleDto) {
    const { page = 1, pageSize = 20, search, categoryKey, status } = query;
    const skip = (page - 1) * pageSize;

    const where: any = {};

    if (search) {
      where.OR = [
        { title: { contains: search } },
        { summary: { contains: search } },
        { tags: { contains: search } },
      ];
    }

    if (categoryKey) {
      // 分类为层级结构，文章的 categoryKey 通常落在叶子分类上。
      // 选中父分类时应同时匹配其所有后代分类，因此展开为「自身 + 全部后代」的 key 集合。
      const keys = categoryKey.split(',').map((k) => k.trim()).filter(Boolean);
      const resolved: string[] = [];
      for (const k of keys) {
        resolved.push(...(await this.collectDescendantKeys(k)));
      }
      const unique = Array.from(new Set(resolved));
      where.categoryKey = { in: unique };
    }

    // 公开接口仅返回知识库文章（type=article）；小记（type=note）不进入知识库列表
    where.type = 'article';

    // 公开接口仅允许查询已发布文章；即便传入 status=draft 也强制已发布，防止越权读取草稿
    if (status === 'draft') {
      where.published = false;
    } else {
      where.published = true;
    }

    const [items, total] = await Promise.all([
      this.prisma.article.findMany({
        where,
        skip,
        take: pageSize,
        // 顺序与前台保持一致：优先按后台拖拽调整的 sortOrder 升序，其次按创建时间倒序
        orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
      }),
      this.prisma.article.count({ where }),
    ]);

    return {
      items: items.map(this.transformArticle),
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  // 收集某个分类自身及其所有后代分类的 key（基于 parentKey 自关联递归），
  // 用于文章列表按「父分类 + 子孙分类」匹配文章的 categoryKey。
  private async collectDescendantKeys(rootKey: string): Promise<string[]> {
    const keys: string[] = [rootKey];
    let frontier = [rootKey];
    // 防环：最多递归 20 层（分类层级极浅，远超实际需求）
    for (let depth = 0; depth < 20 && frontier.length; depth++) {
      const children = await this.prisma.category.findMany({
        where: { parentKey: { in: frontier } },
        select: { key: true },
      });
      const next = children.map((c) => c.key).filter((k) => !keys.includes(k));
      if (!next.length) break;
      keys.push(...next);
      frontier = next;
    }
    return keys;
  }

  async findOne(id: string) {
    const article = await this.prisma.article.findUnique({ where: { id } });
    if (!article) throw new NotFoundException('文章不存在');
    return this.transformArticle(article);
  }

  // 按 slug 获取单篇已发布知识库文章详情（前台详情页使用）
  // ip 用于按天去重：同一 IP 每天最多贡献一次真实阅读量
  async findOneBySlug(slug: string, ip?: string) {
    const article = await this.prisma.article.findUnique({
      where: { slug, type: 'article' },
    });
    if (!article || !article.published) {
      throw new NotFoundException('文章不存在或未发布');
    }
    await this.viewCountService.record('article', article.id, ip);
    return this.transformArticle(article);
  }

  async create(dto: CreateArticleDto) {
    const slug = dto.slug || this.generateSlug(dto.title);
    // 新文章默认排在最前（sortOrder 取当前最小值 - 1），与既有「最新在最前」的展示习惯一致；
    // 之后可在后台列表中拖拽调整其位置。
    const first = await this.prisma.article.findFirst({
      orderBy: { sortOrder: 'asc' },
      select: { sortOrder: true },
    });
    const sortOrder = (first?.sortOrder ?? 1) - 1;
    const article = await this.prisma.article.create({
      data: {
        ...dto,
        slug,
        // 未设置封面图时保持为空（前台回退为标题文字封面），不自动补占位图
        coverImage: this.normalizeCover(dto.coverImage) ?? null,
        tags: JSON.stringify(dto.tags || []),
        published: dto.published ?? false,
        featured: dto.featured ?? false,
        sortOrder,
      } as any,
    });
    return this.transformArticle(article);
  }

  async update(id: string, dto: UpdateArticleDto) {
    const current = await this.prisma.article.findUnique({ where: { id } });
    if (!current) throw new NotFoundException('文章不存在');

    const data: any = { ...dto };
    if (dto.title && !dto.slug) {
      data.slug = this.generateSlug(dto.title);
    }
    if (dto.tags) {
      data.tags = JSON.stringify(dto.tags);
    }
    // 封面图：本次传入时覆盖（空值 = 显式移除，落库为 null）；
    // 未传入则保持原有。不自动补占位图，前台无图时回退为标题文字封面。
    if (dto.coverImage !== undefined) {
      data.coverImage = this.normalizeCover(dto.coverImage) ?? null;
    }
    const article = await this.prisma.article.update({ where: { id }, data });
    // 数字生命：已训练数据被编辑 → 删向量 + trainType 重置 0（需重新训练）
    await this.trainingService.invalidateIfTrained('article', id);
    return this.transformArticle(article);
  }

  async remove(id: string) {
    await this.findOne(id);
    // 数字生命：删除源数据时同步清除其向量
    await this.trainingService.invalidateByRef('article', id);
    await this.prisma.article.delete({ where: { id } });
    return { message: '删除成功' };
  }

  /**
   * 批量调整文章顺序（后台列表拖拽排序）。
   * ids 为「当前列表可见文章」拖拽后的目标顺序。
   * 实现：取出这些文章当前的 sortOrder 作为「排序槽位」，按升序重新分配给新的顺序，
   * 从而只改变可见文章之间的相对顺序，不影响列表外文章（如其他分页）的排序位置。
   * 排序不改变 updatedAt（避免拖拽顺序把文章顶到首页「动态」时间线）。
   */
  async reorder(ids: string[]) {
    const orderedIds = Array.from(new Set((ids || []).filter(Boolean)));
    if (orderedIds.length <= 1) {
      return { message: '顺序已更新' };
    }

    // 历史数据（新增 sortOrder 字段之前）全部为默认值 0，槽位重复会导致排序不生效，先整体归一化
    await this.ensureSortOrderNormalized();

    const rows = await this.prisma.article.findMany({
      where: { id: { in: orderedIds } },
      select: { id: true, sortOrder: true, updatedAt: true },
    });
    const byId = new Map(rows.map((r) => [r.id, r]));
    const validIds = orderedIds.filter((id) => byId.has(id));
    if (validIds.length <= 1) {
      return { message: '顺序已更新' };
    }

    // 复用原有槽位（升序），重新按目标顺序赋值
    const slots = validIds.map((id) => byId.get(id)!.sortOrder).sort((a, b) => a - b);

    await this.prisma.$transaction(
      validIds.map((id, index) =>
        this.prisma.article.update({
          where: { id },
          data: { sortOrder: slots[index], updatedAt: byId.get(id)!.updatedAt },
        }),
      ),
    );
    return { message: '顺序已更新' };
  }

  /**
   * 归一化全库 sortOrder：按「当前展示顺序」(sortOrder 升序 + createdAt 降序) 重排为 0..n-1。
   * 仅在检测到存在重复值时执行（如首次使用拖拽排序前的历史数据），避免排序槽位重复导致拖拽无效。
   */
  private async ensureSortOrderNormalized() {
    const total = await this.prisma.article.count();
    if (total <= 1) return;

    const distinct = await this.prisma.article.groupBy({
      by: ['sortOrder'],
      _count: { _all: true },
    });
    if (distinct.length === total) return;

    const ordered = await this.prisma.article.findMany({
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
      select: { id: true, sortOrder: true, updatedAt: true },
    });

    const updates: any[] = [];
    ordered.forEach((article, index) => {
      if (article.sortOrder !== index) {
        updates.push(
          this.prisma.article.update({
            where: { id: article.id },
            data: { sortOrder: index, updatedAt: article.updatedAt },
          }),
        );
      }
    });
    if (updates.length) {
      await this.prisma.$transaction(updates);
    }
  }

  /**
   * 自动生成摘要：读取正文内容，调用后台「已启用且有 Key」的通用模型生成摘要。
   * 多模型按 sortOrder 依次尝试，任一模型成功即返回（与数字生命对话的 fallback 策略一致）。
   */
  async generateSummary(content: string, title?: string): Promise<{ summary: string }> {
    const body = (content || '').trim();
    if (!body) {
      throw new BadRequestException('正文内容为空，无法生成摘要');
    }

    const excerpt =
      body.length > SUMMARY_CONTENT_LIMIT ? body.slice(0, SUMMARY_CONTENT_LIMIT) : body;
    const humanText = [title ? `文章标题：${title}` : '', '文章正文：', excerpt]
      .filter(Boolean)
      .join('\n');
    const messages = [new SystemMessage(SUMMARY_SYSTEM_PROMPT), new HumanMessage(humanText)];

    // 无可用模型（未启用 / 未配置 Key）时此处抛出 409，直接透传给前端提示
    const llms = await this.modelConfig.getActiveLlms();
    let lastError = '';

    for (const { llm, modelName } of llms) {
      try {
        const res = await llm.invoke(messages);
        const summary = this.normalizeSummary(res?.content);
        if (summary) {
          return { summary };
        }
        lastError = '模型返回内容为空';
      } catch (e: any) {
        lastError = e?.response?.data?.error?.message || e?.message || '生成失败';
        this.logger.warn(`摘要生成失败（模型「${modelName}」）：${lastError}`);
      }
    }

    throw new InternalServerErrorException(
      lastError ? `生成摘要失败：${lastError}` : '生成摘要失败，请稍后再试',
    );
  }

  // 归一化模型输出：兼容 string / parts 数组，去掉常见前缀与包裹引号，压缩空白
  private normalizeSummary(raw: unknown): string {
    let text = '';
    if (typeof raw === 'string') {
      text = raw;
    } else if (Array.isArray(raw)) {
      text = raw.map((p: any) => (typeof p === 'string' ? p : p?.text ?? '')).join('');
    }
    return text
      .replace(/^\s*[#>*\-\s]*\s*(摘要|总结|导语|简介)\s*[:：]?\s*/, '')
      .replace(/["'“”‘’]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  // 按更新时间倒序返回文章列表，用于首页右侧"动态"栏目。
  // 排序规则：updatedAt 越大越靠前；相同时间戳按毫秒级精确比较（SQLite 已存完整时间戳）。
  async findLatestUpdated(query: QueryArticleDto) {
    const { page = 1, pageSize = 20 } = query;
    const skip = (page - 1) * pageSize;

    const where: any = {
      published: true,
      type: 'article',
    };

    const [items, total] = await Promise.all([
      this.prisma.article.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { updatedAt: 'desc' },
      }),
      this.prisma.article.count({ where }),
    ]);

    return {
      items: items.map(this.transformArticle),
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  // 去空白后的封面地址，空值统一返回 undefined
  private normalizeCover(cover?: string | null): string | undefined {
    const value = (cover ?? '').trim();
    return value || undefined;
  }

  private transformArticle(article: any) {
    return {
      ...article,
      tags: typeof article.tags === 'string' ? JSON.parse(article.tags) : article.tags,
      // 前台统一使用该字段展示，无需每个页面重复判断「是否设置了虚拟阅读量」
      displayViewCount: resolveDisplayViews(article.viewCount, article.virtualViewCount),
    };
  }

  private generateSlug(title: string): string {
    return title
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^\w\-\u4e00-\u9fa5]+/g, '')
      .replace(/\-\-+/g, '-')
      .replace(/^-|-$/g, '')
      + '-' + Date.now().toString(36);
  }
}
