import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TrainingService } from '../digitallife/training.service';
import { CreateArticleDto } from './dto/create-article.dto';
import { UpdateArticleDto } from './dto/update-article.dto';
import { QueryArticleDto } from './dto/query-article.dto';

@Injectable()
export class ArticleService {
  constructor(
    private prisma: PrismaService,
    private trainingService: TrainingService,
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
        orderBy: { createdAt: 'desc' },
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
  async findOneBySlug(slug: string) {
    const article = await this.prisma.article.findUnique({
      where: { slug, type: 'article' },
    });
    if (!article || !article.published) {
      throw new NotFoundException('文章不存在或未发布');
    }
    // 阅读量 +1（异步，不阻塞响应）
    this.prisma.article
      .update({ where: { id: article.id }, data: { viewCount: { increment: 1 } } })
      .catch(() => {});
    return this.transformArticle(article);
  }

  async create(dto: CreateArticleDto) {
    const slug = dto.slug || this.generateSlug(dto.title);
    const article = await this.prisma.article.create({
      data: {
        ...dto,
        slug,
        tags: JSON.stringify(dto.tags || []),
        published: dto.published ?? false,
        featured: dto.featured ?? false,
      } as any,
    });
    return this.transformArticle(article);
  }

  async update(id: string, dto: UpdateArticleDto) {
    await this.findOne(id); // check exists
    const data: any = { ...dto };
    if (dto.title && !dto.slug) {
      data.slug = this.generateSlug(dto.title);
    }
    if (dto.tags) {
      data.tags = JSON.stringify(dto.tags);
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

  private transformArticle(article: any) {
    return {
      ...article,
      tags: typeof article.tags === 'string' ? JSON.parse(article.tags) : article.tags,
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
