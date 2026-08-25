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
exports.ArticleService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
let ArticleService = class ArticleService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async findAll(query) {
        const { page = 1, pageSize = 20, search, categoryKey, status } = query;
        const skip = (page - 1) * pageSize;
        const where = {};
        if (search) {
            where.OR = [
                { title: { contains: search } },
                { summary: { contains: search } },
                { tags: { contains: search } },
            ];
        }
        if (categoryKey) {
            const keys = categoryKey.split(',').map((k) => k.trim()).filter(Boolean);
            const resolved = [];
            for (const k of keys) {
                resolved.push(...(await this.collectDescendantKeys(k)));
            }
            const unique = Array.from(new Set(resolved));
            where.categoryKey = { in: unique };
        }
        where.type = 'article';
        if (status === 'draft') {
            where.published = false;
        }
        else {
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
    async collectDescendantKeys(rootKey) {
        const keys = [rootKey];
        let frontier = [rootKey];
        for (let depth = 0; depth < 20 && frontier.length; depth++) {
            const children = await this.prisma.category.findMany({
                where: { parentKey: { in: frontier } },
                select: { key: true },
            });
            const next = children.map((c) => c.key).filter((k) => !keys.includes(k));
            if (!next.length)
                break;
            keys.push(...next);
            frontier = next;
        }
        return keys;
    }
    async findOne(id) {
        const article = await this.prisma.article.findUnique({ where: { id } });
        if (!article)
            throw new common_1.NotFoundException('文章不存在');
        return this.transformArticle(article);
    }
    async findOneBySlug(slug) {
        const article = await this.prisma.article.findUnique({
            where: { slug, type: 'article' },
        });
        if (!article || !article.published) {
            throw new common_1.NotFoundException('文章不存在或未发布');
        }
        return this.transformArticle(article);
    }
    async create(dto) {
        const slug = dto.slug || this.generateSlug(dto.title);
        const article = await this.prisma.article.create({
            data: {
                ...dto,
                slug,
                tags: JSON.stringify(dto.tags || []),
                published: dto.published ?? false,
                featured: dto.featured ?? false,
            },
        });
        return this.transformArticle(article);
    }
    async update(id, dto) {
        await this.findOne(id);
        const data = { ...dto };
        if (dto.title && !dto.slug) {
            data.slug = this.generateSlug(dto.title);
        }
        if (dto.tags) {
            data.tags = JSON.stringify(dto.tags);
        }
        const article = await this.prisma.article.update({ where: { id }, data });
        return this.transformArticle(article);
    }
    async remove(id) {
        await this.findOne(id);
        await this.prisma.article.delete({ where: { id } });
        return { message: '删除成功' };
    }
    async findLatestUpdated(query) {
        const { page = 1, pageSize = 20 } = query;
        const skip = (page - 1) * pageSize;
        const where = {
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
    transformArticle(article) {
        return {
            ...article,
            tags: typeof article.tags === 'string' ? JSON.parse(article.tags) : article.tags,
        };
    }
    generateSlug(title) {
        return title
            .toLowerCase()
            .replace(/\s+/g, '-')
            .replace(/[^\w\-\u4e00-\u9fa5]+/g, '')
            .replace(/\-\-+/g, '-')
            .replace(/^-|-$/g, '')
            + '-' + Date.now().toString(36);
    }
};
exports.ArticleService = ArticleService;
exports.ArticleService = ArticleService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], ArticleService);
//# sourceMappingURL=article.service.js.map