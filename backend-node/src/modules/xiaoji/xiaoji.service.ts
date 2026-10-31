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
import { CreateXiaojiDto, XIAOJI_MAX_PHOTOS } from './dto/create-xiaoji.dto';
import { UpdateXiaojiDto } from './dto/update-xiaoji.dto';
import { QueryXiaojiDto } from './dto/query-xiaoji.dto';

// 自动生成摘要的系统提示词：约束为单段中文纯文本，直接可用作列表摘要
const SUMMARY_SYSTEM_PROMPT = [
  '你是一名资深中文编辑，擅长为旅行随笔与相册小记撰写摘要。',
  '请阅读用户提供的小记正文（Markdown 格式），生成一段简洁、有画面感的摘要。',
  '要求：',
  '1. 使用中文，长度控制在 50~120 字；',
  '2. 概括小记的核心内容与情绪基调，不要逐段复述，也不要加入正文没有的信息；',
  '3. 输出为一段纯文本：不要换行、不要 Markdown 标记、不要引号，',
  '   也不要出现「摘要」「本文」「总结」等标题式前缀；',
  '4. 只输出摘要本身，不要任何解释或额外说明。',
].join('\n');

// 正文过长时截断后再送入模型，控制 token 消耗（超长正文取开头即可覆盖主题）
const SUMMARY_CONTENT_LIMIT = 8000;

@Injectable()
export class XiaojiService {
  private readonly logger = new Logger(XiaojiService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly trainingService: TrainingService,
    private readonly viewCountService: ViewCountService,
    private readonly modelConfig: ModelConfigService,
  ) {}

  // ==================== 公开接口 ====================

  /** 已发布小记列表，可选按分类（key/名称）筛选 */
  async findPublished(tag?: string) {
    const where: any = { published: true };
    if (tag) {
      where.tags = { contains: `"${tag}"` };
    }
    const blogs = await this.prisma.blog.findMany({
      where,
      orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
    });
    return blogs.map((b) => this.serialize(b));
  }

  /** 按 slug 取已发布详情，附带 prev/next 导航（按日期倒序相邻） */
  // ip 用于按天去重：同一 IP 每天最多贡献一次真实阅读量
  async findBySlug(slug: string, ip?: string) {
    const blog = await this.prisma.blog.findFirst({
      where: { slug, published: true },
    });
    if (!blog) {
      throw new NotFoundException('小记不存在或未发布');
    }

    await this.viewCountService.record('note', blog.id, ip);

    const all = await this.prisma.blog.findMany({
      where: { published: true },
      orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
    });
    const idx = all.findIndex((b) => b.id === blog.id);
    const prev = idx > 0 ? all[idx - 1] : null;
    const next = idx >= 0 && idx < all.length - 1 ? all[idx + 1] : null;

    return {
      ...this.serialize(blog),
      prev: prev ? this.toCard(prev) : null,
      next: next ? this.toCard(next) : null,
    };
  }

  /** 统计：总篇数 / 相册数 / 照片数 */
  async getStats() {
    const blogs = await this.prisma.blog.findMany({ where: { published: true } });
    let photos = 0;
    for (const b of blogs) {
      try {
        photos += (JSON.parse(b.photos) || []).length;
      } catch {
        // ignore malformed photos
      }
    }
    return {
      total: blogs.length,
      albums: blogs.filter((b) => b.type === 'album').length,
      photos,
    };
  }

  /** 分类列表：优先返回小记数据中实际用到的分类（带 count），再补分类表中其余项 */
  async getCategories() {
    const blogs = await this.prisma.blog.findMany({ where: { published: true } });
    const counts = new Map<string, number>();
    for (const b of blogs) {
      let tags: string[] = [];
      try {
        tags = JSON.parse(b.tags) || [];
      } catch {
        // ignore
      }
      for (const t of tags) {
        counts.set(t, (counts.get(t) || 0) + 1);
      }
    }

    const used = Array.from(counts.entries()).map(([key, count]) => ({
      key,
      name: key,
      count,
    }));
    const usedKeys = new Set(used.map((u) => u.key));

    const rest = await this.prisma.blogCategory.findMany({
      orderBy: { createdAt: 'asc' },
    });
    const unused = rest
      .filter((c) => !usedKeys.has(c.key))
      .map((c) => ({ key: c.key, name: c.name, count: 0 }));

    return [...used, ...unused];
  }

  // ==================== 后台 CRUD ====================

  async findAll(query: QueryXiaojiDto) {
    const { page = 1, pageSize = 10, status = 'all', search } = query;
    const skip = (page - 1) * pageSize;
    const where: any = {};

    if (status === 'published') where.published = true;
    if (status === 'draft') where.published = false;
    if (search) {
      where.OR = [
        { title: { contains: search } },
        { summary: { contains: search } },
        { location: { contains: search } },
        { content: { contains: search } },
      ];
    }

    const [list, total] = await Promise.all([
      this.prisma.blog.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: { updatedAt: 'desc' },
      }),
      this.prisma.blog.count({ where }),
    ]);

    return {
      list: list.map((b) => this.serialize(b)),
      total,
      page,
      pageSize,
    };
  }

  async findOne(id: string) {
    const blog = await this.prisma.blog.findUnique({ where: { id } });
    if (!blog) {
      throw new NotFoundException('小记不存在');
    }
    return this.serialize(blog);
  }

  async create(dto: CreateXiaojiDto) {
    const type = dto.type || 'album';
    this.assertPhotoLimit(type, dto.photos);
    const tags = await this.saveTags(dto.tags || []);
    const slug = await this.buildUniqueSlug(dto.slug || dto.title);

    // 地点来自足迹：选了足迹则取其地点名并建立双向绑定
    const footprint = await this.resolveFootprint(dto.footprintId);
    const blog = await this.prisma.blog.create({
      data: {
        title: dto.title,
        slug,
        type,
        tags: JSON.stringify(tags),
        content: dto.content || '',
        summary: dto.summary ?? null,
        quote: dto.quote ?? null,
        location: footprint ? footprint.place : null,
        date: dto.date ?? null,
        photos: JSON.stringify(dto.photos || []),
        published: dto.published ?? false,
        virtualViewCount: dto.virtualViewCount ?? null,
      },
    });
    await this.syncFootprintBinding(blog.id, footprint?.id ?? null);
    return this.serialize(blog);
  }

  async update(id: string, dto: UpdateXiaojiDto) {
    const existing = await this.prisma.blog.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException('小记不存在');
    }

    // 以「更新后的最终状态」校验照片数量：随笔最多 9 张，相册不限
    this.assertPhotoLimit(
      dto.type ?? existing.type,
      dto.photos !== undefined ? dto.photos : this.parsePhotos(existing.photos),
    );

    const data: any = {};
    if (dto.title !== undefined) data.title = dto.title;
    if (dto.type !== undefined) data.type = dto.type;
    if (dto.content !== undefined) data.content = dto.content;
    if (dto.summary !== undefined) data.summary = dto.summary ?? null;
    if (dto.quote !== undefined) data.quote = dto.quote ?? null;
    let selectedFootprint: { id: string; place: string } | null = null;
    if (dto.footprintId !== undefined) {
      // 地点从足迹中选择：由所选足迹派生，不再接受手填
      selectedFootprint = await this.resolveFootprint(dto.footprintId);
      data.location = selectedFootprint ? selectedFootprint.place : null;
    } else if (dto.location !== undefined) {
      data.location = dto.location ?? null;
    }
    if (dto.date !== undefined) data.date = dto.date ?? null;
    if (dto.photos !== undefined) data.photos = JSON.stringify(dto.photos || []);
    if (dto.published !== undefined) data.published = dto.published;
    if (dto.virtualViewCount !== undefined) data.virtualViewCount = dto.virtualViewCount;
    if (dto.tags !== undefined) {
      data.tags = JSON.stringify(await this.saveTags(dto.tags || []));
    }
    if (dto.slug !== undefined) {
      data.slug = await this.buildUniqueSlug(
        dto.slug || dto.title || existing.title,
        id,
      );
    }

    const blog = await this.prisma.blog.update({ where: { id }, data });
    // 同步足迹 ↔ 小记绑定
    if (dto.footprintId !== undefined) {
      await this.syncFootprintBinding(id, selectedFootprint?.id ?? null);
    }
    // 数字生命：已训练数据被编辑 → 删向量 + trainType 重置 0（需重新训练）
    await this.trainingService.invalidateIfTrained('blog', id);
    return this.serialize(blog);
  }

  async remove(id: string) {
    const existing = await this.prisma.blog.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException('小记不存在');
    }
    // 数字生命：删除源数据时同步清除其向量
    await this.trainingService.invalidateByRef('blog', id);
    // 解除足迹绑定（足迹保留，仅去掉关联）
    await this.prisma.aboutFootprint.updateMany({
      where: { blogId: id },
      data: { blogId: null },
    });
    await this.prisma.blog.delete({ where: { id } });
    return { success: true };
  }

  // ==================== AI 摘要 ====================

  /**
   * 自动生成摘要：读取正文内容，调用后台「已启用且有 Key」的通用模型生成摘要。
   * 多模型按 sortOrder 依次尝试，任一模型成功即返回（与文章模块的 fallback 策略一致）。
   */
  async generateSummary(content: string, title?: string): Promise<{ summary: string }> {
    const body = (content || '').trim();
    if (!body) {
      throw new BadRequestException('正文内容为空，无法生成摘要');
    }

    const excerpt =
      body.length > SUMMARY_CONTENT_LIMIT ? body.slice(0, SUMMARY_CONTENT_LIMIT) : body;
    const humanText = [title ? `小记标题：${title}` : '', '小记正文：', excerpt]
      .filter(Boolean)
      .join('\n');
    const messages = [new SystemMessage(SUMMARY_SYSTEM_PROMPT), new HumanMessage(humanText)];

    // 无可用模型（未启用 / 未配置 Key）时 getActiveLlms 抛错，直接透传给前端提示
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

  // ==================== 内部工具 ====================

  /**
   * 解析小记绑定的足迹：空值视为「不绑定」；指定了 id 但不存在时报错。
   * @returns 足迹记录或 null
   */
  private async resolveFootprint(footprintId?: string) {
    const id = String(footprintId || '').trim();
    if (!id) return null;
    const footprint = await this.prisma.aboutFootprint.findUnique({
      where: { id },
    });
    if (!footprint) {
      throw new NotFoundException('绑定的足迹不存在，请重新选择地点');
    }
    return footprint;
  }

  /**
   * 同步足迹 ↔ 小记的 1-1 绑定：
   * - 解绑该小记此前绑定的其他足迹；
   * - 若目标足迹已绑定别的小记，先清掉那篇小记的关联与地点；
   * - 写入新的绑定关系（footprintId 为 null 时仅解绑）。
   */
  private async syncFootprintBinding(blogId: string, footprintId: string | null) {
    // 解绑这篇小记名下、但本次未选中的足迹
    await this.prisma.aboutFootprint.updateMany({
      where: {
        blogId,
        ...(footprintId ? { id: { not: footprintId } } : {}),
      },
      data: { blogId: null },
    });

    if (!footprintId) return;

    const target = await this.prisma.aboutFootprint.findUnique({
      where: { id: footprintId },
    });
    if (!target) return;

    // 目标足迹已绑定别的小记：那篇小记失去该足迹，地点一并清空
    if (target.blogId && target.blogId !== blogId) {
      await this.prisma.blog.update({
        where: { id: target.blogId },
        data: { location: null },
      });
    }
    await this.prisma.aboutFootprint.update({
      where: { id: footprintId },
      data: { blogId },
    });
  }

  /** 照片数量校验：相册（album）不限，其余类型最多 9 张 */
  private assertPhotoLimit(type: string, photos?: { url: string }[]) {
    if (type === 'album') return;
    if ((photos?.length || 0) > XIAOJI_MAX_PHOTOS) {
      throw new BadRequestException(
        `随笔最多上传 ${XIAOJI_MAX_PHOTOS} 张照片`,
      );
    }
  }

  /** 解析数据库中的 photos JSON 字段 */
  private parsePhotos(raw: string | null): { url: string; caption?: string }[] {
    try {
      return JSON.parse(raw || '[]') || [];
    } catch {
      return [];
    }
  }

  /**
   * 分类同步：对每个分类名，存在同名（key）则复用，不存在则自动新建。
   * key 与 name 保持一致（trim 后），保证同名即复用、URL 可读。
   */
  private async saveTags(names: string[]): Promise<string[]> {
    const keys: string[] = [];
    for (const raw of names) {
      const name = String(raw || '').trim();
      if (!name) continue;
      const key = name;
      const existing = await this.prisma.blogCategory.findUnique({
        where: { key },
      });
      if (existing) {
        keys.push(existing.key);
      } else {
        const created = await this.prisma.blogCategory.create({
          data: { key, name },
        });
        keys.push(created.key);
      }
    }
    return keys;
  }

  /** 生成唯一 slug：清洗标题 + 冲突时追加短随机后缀 */
  private async buildUniqueSlug(base: string, excludeId?: string): Promise<string> {
    let slug = String(base || '')
      .toLowerCase()
      .trim()
      .replace(/\s+/g, '-')
      .replace(/[^\w\-\u4e00-\u9fa5]+/g, '')
      .replace(/\-\-+/g, '-')
      .replace(/^-|-$/g, '');
    if (!slug) slug = 'xiaoji';

    const conflict = await this.prisma.blog.findFirst({
      where: { slug, ...(excludeId ? { id: { not: excludeId } } : {}) },
    });
    if (conflict) {
      slug = `${slug}-${Date.now().toString(36)}`;
    }
    return slug;
  }

  /** 解析 JSON 字段，输出前端可直接使用的结构 */
  private serialize(blog: any) {
    let tags: string[] = [];
    let photos: { url: string; caption?: string }[] = [];
    try {
      tags = JSON.parse(blog.tags) || [];
    } catch {
      // ignore
    }
    try {
      photos = JSON.parse(blog.photos) || [];
    } catch {
      // ignore
    }
    return {
      ...blog,
      tags,
      photos,
      // 前台统一使用该字段展示，无需每个页面重复判断「是否设置了虚拟阅读量」
      displayViewCount: resolveDisplayViews(blog.viewCount, blog.virtualViewCount),
    };
  }

  /** 列表卡片所需的最小字段 */
  private toCard(blog: any) {
    const s = this.serialize(blog);
    return {
      id: s.id,
      slug: s.slug,
      title: s.title,
      type: s.type,
      date: s.date,
      cover: (s.photos && s.photos[0] && s.photos[0].url) || null,
      quote: s.quote,
    };
  }
}
