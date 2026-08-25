"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CategoryService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
let CategoryService = class CategoryService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async findAll() {
        const categories = await this.prisma.category.findMany({
            orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
        });
        const counts = await this.prisma.article.groupBy({
            by: ['categoryKey'],
            where: { published: true, type: 'article' },
            _count: { _all: true },
        });
        const countMap = new Map();
        counts.forEach((c) => countMap.set(c.categoryKey, c._count._all));
        const directMap = new Map();
        categories.forEach((cat) => directMap.set(cat.key, countMap.get(cat.key) ?? 0));
        const childrenMap = new Map();
        categories.forEach((cat) => {
            if (cat.parentKey && categories.some((c) => c.key === cat.parentKey)) {
                if (!childrenMap.has(cat.parentKey))
                    childrenMap.set(cat.parentKey, []);
                childrenMap.get(cat.parentKey).push(cat.key);
            }
        });
        const withChildrenMap = new Map();
        const sumWithChildren = (key) => {
            if (withChildrenMap.has(key))
                return withChildrenMap.get(key);
            let sum = directMap.get(key) ?? 0;
            const kids = childrenMap.get(key) || [];
            for (const k of kids)
                sum += sumWithChildren(k);
            withChildrenMap.set(key, sum);
            return sum;
        };
        return categories.map((cat) => ({
            ...cat,
            articleCount: directMap.get(cat.key) ?? 0,
            articleCountWithChildren: sumWithChildren(cat.key),
        }));
    }
    async findTree() {
        const all = await this.findAll();
        return this.buildTree(all);
    }
    async findOne(id) {
        const cat = await this.prisma.category.findUnique({ where: { id } });
        if (!cat)
            throw new common_1.NotFoundException('分类不存在');
        return cat;
    }
    async create(dto) {
        const existing = await this.prisma.category.findUnique({ where: { key: dto.key } });
        if (existing)
            throw new common_1.ConflictException('分类 key 已存在');
        return this.prisma.category.create({
            data: { ...dto, sortOrder: dto.sortOrder ?? 0 },
        });
    }
    async update(id, dto) {
        await this.findOne(id);
        return this.prisma.category.update({ where: { id }, data: dto });
    }
    async remove(id) {
        await this.findOne(id);
        const cat = await this.prisma.category.findUnique({ where: { id } });
        const articleCount = await this.prisma.article.count({
            where: { categoryKey: cat.key },
        });
        if (articleCount > 0) {
            throw new common_1.ConflictException(`该分类下有 ${articleCount} 篇文章，无法删除`);
        }
        await this.prisma.category.delete({ where: { id } });
        return { message: '删除成功' };
    }
    buildTree(items) {
        const map = new Map();
        const roots = [];
        items.forEach(item => {
            map.set(item.key, { ...item, children: [] });
        });
        items.forEach(item => {
            const node = map.get(item.key);
            if (item.parentKey && map.has(item.parentKey)) {
                map.get(item.parentKey).children.push(node);
            }
            else {
                roots.push(node);
            }
        });
        return roots;
    }
};
exports.CategoryService = CategoryService;
exports.CategoryService = CategoryService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], CategoryService);
//# sourceMappingURL=category.service.js.map