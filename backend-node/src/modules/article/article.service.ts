import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateArticleDto } from './dto/create-article.dto';
import { UpdateArticleDto } from './dto/update-article.dto';
import { QueryArticleDto } from './dto/query-article.dto';

@Injectable()
export class ArticleService {
  constructor(private prisma: PrismaService) {}

  async findAll(query: QueryArticleDto) {
    const { page = 1, pageSize = 20, search, categoryKey, status } = query;
    const skip = (page - 1) * pageSize;

    const where: any = {};

    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { summary: { contains: search, mode: 'insensitive' } },
        { tags: { has: search } },
      ];
    }

    if (categoryKey) {
      where.categoryKey = categoryKey;
    }

    if (status === 'published') {
      where.published = true;
    } else if (status === 'draft') {
      where.published = false;
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
      items,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  async findOne(id: string) {
    const article = await this.prisma.article.findUnique({ where: { id } });
    if (!article) throw new NotFoundException('文章不存在');
    return article;
  }

  async create(dto: CreateArticleDto) {
    const slug = dto.slug || this.generateSlug(dto.title);
    return this.prisma.article.create({
      data: {
        ...dto,
        slug,
        tags: dto.tags || [],
        published: dto.published ?? false,
        featured: dto.featured ?? false,
      },
    });
  }

  async update(id: string, dto: UpdateArticleDto) {
    await this.findOne(id); // check exists
    const data: any = { ...dto };
    if (dto.title && !dto.slug) {
      data.slug = this.generateSlug(dto.title);
    }
    return this.prisma.article.update({ where: { id }, data });
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.prisma.article.delete({ where: { id } });
    return { message: '删除成功' };
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
