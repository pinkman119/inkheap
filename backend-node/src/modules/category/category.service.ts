import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';

@Injectable()
export class CategoryService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    const categories = await this.prisma.category.findMany({
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
    });
    const counts = await this.prisma.article.groupBy({
      by: ['categoryKey'],
      _count: { _all: true },
    });
    const countMap = new Map<string, number>();
    counts.forEach((c) => countMap.set(c.categoryKey, c._count._all));
    return categories.map((cat) => ({
      ...cat,
      articleCount: countMap.get(cat.key) ?? 0,
    }));
  }

  async findTree() {
    const all = await this.findAll();
    return this.buildTree(all);
  }

  async findOne(id: string) {
    const cat = await this.prisma.category.findUnique({ where: { id } });
    if (!cat) throw new NotFoundException('分类不存在');
    return cat;
  }

  async create(dto: CreateCategoryDto) {
    const existing = await this.prisma.category.findUnique({ where: { key: dto.key } });
    if (existing) throw new ConflictException('分类 key 已存在');
    return this.prisma.category.create({
      data: { ...dto, sortOrder: dto.sortOrder ?? 0 },
    });
  }

  async update(id: string, dto: UpdateCategoryDto) {
    await this.findOne(id);
    return this.prisma.category.update({ where: { id }, data: dto });
  }

  async remove(id: string) {
    await this.findOne(id);
    // Check if this category is being used by articles
    const cat = await this.prisma.category.findUnique({ where: { id } });
    const articleCount = await this.prisma.article.count({
      where: { categoryKey: cat!.key },
    });
    if (articleCount > 0) {
      throw new ConflictException(`该分类下有 ${articleCount} 篇文章，无法删除`);
    }
    await this.prisma.category.delete({ where: { id } });
    return { message: '删除成功' };
  }

  private buildTree(items: any[]) {
    const map = new Map<string, any>();
    const roots: any[] = [];

    items.forEach(item => {
      map.set(item.key, { ...item, children: [] });
    });

    items.forEach(item => {
      const node = map.get(item.key)!;
      if (item.parentKey && map.has(item.parentKey)) {
        map.get(item.parentKey).children.push(node);
      } else {
        roots.push(node);
      }
    });

    return roots;
  }
}
