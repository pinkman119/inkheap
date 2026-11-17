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
      where: { published: true, type: 'article' },
      _count: { _all: true },
    });
    const countMap = new Map<string, number>();
    counts.forEach((c) => countMap.set(c.categoryKey, c._count._all));

    // 构造父->子关系，计算每个分类「含所有子孙」的文章总数
    const directMap = new Map<string, number>();
    categories.forEach((cat) => directMap.set(cat.key, countMap.get(cat.key) ?? 0));

    const childrenMap = new Map<string, string[]>();
    categories.forEach((cat) => {
      if (cat.parentKey && categories.some((c) => c.key === cat.parentKey)) {
        if (!childrenMap.has(cat.parentKey)) childrenMap.set(cat.parentKey, []);
        childrenMap.get(cat.parentKey)!.push(cat.key);
      }
    });

    // 含子孙计数：直接数 + 所有后代直接数之和
    const withChildrenMap = new Map<string, number>();
    const sumWithChildren = (key: string): number => {
      if (withChildrenMap.has(key)) return withChildrenMap.get(key)!;
      let sum = directMap.get(key) ?? 0;
      const kids = childrenMap.get(key) || [];
      for (const k of kids) sum += sumWithChildren(k);
      withChildrenMap.set(key, sum);
      return sum;
    };

    return categories.map((cat) => ({
      ...cat,
      articleCount: directMap.get(cat.key) ?? 0, // 直接挂载到本分类的文章数
      articleCountWithChildren: sumWithChildren(cat.key), // 本分类 + 所有子分类文章总数
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
