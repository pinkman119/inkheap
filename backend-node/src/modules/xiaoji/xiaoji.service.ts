import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TrainingService } from '../digitallife/training.service';
import { ViewCountService } from '../view/view.service';
import { resolveDisplayViews } from '../view/view.util';
import { CreateXiaojiDto, XIAOJI_MAX_PHOTOS } from './dto/create-xiaoji.dto';
import { UpdateXiaojiDto } from './dto/update-xiaoji.dto';
import { QueryXiaojiDto } from './dto/query-xiaoji.dto';

@Injectable()
export class XiaojiService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly trainingService: TrainingService,
    private readonly viewCountService: ViewCountService,
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
    const blog = await this.prisma.blog.create({
      data: {
        title: dto.title,
        slug,
        type,
        tags: JSON.stringify(tags),
        content: dto.content || '',
        summary: dto.summary ?? null,
        quote: dto.quote ?? null,
        location: dto.location ?? null,
        date: dto.date ?? null,
        photos: JSON.stringify(dto.photos || []),
        published: dto.published ?? false,
        virtualViewCount: dto.virtualViewCount ?? null,
      },
    });
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
    if (dto.location !== undefined) data.location = dto.location ?? null;
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
    await this.prisma.blog.delete({ where: { id } });
    return { success: true };
  }

  // ==================== 内部工具 ====================

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
