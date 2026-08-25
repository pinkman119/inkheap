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
exports.XiaojiService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
let XiaojiService = class XiaojiService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async findPublished(tag) {
        const where = { published: true };
        if (tag) {
            where.tags = { contains: `"${tag}"` };
        }
        const blogs = await this.prisma.blog.findMany({
            where,
            orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
        });
        return blogs.map((b) => this.serialize(b));
    }
    async findBySlug(slug) {
        const blog = await this.prisma.blog.findFirst({
            where: { slug, published: true },
        });
        if (!blog) {
            throw new common_1.NotFoundException('小记不存在或未发布');
        }
        this.prisma.blog
            .update({ where: { id: blog.id }, data: { viewCount: { increment: 1 } } })
            .catch(() => { });
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
    async getStats() {
        const blogs = await this.prisma.blog.findMany({ where: { published: true } });
        let photos = 0;
        for (const b of blogs) {
            try {
                photos += (JSON.parse(b.photos) || []).length;
            }
            catch {
            }
        }
        return {
            total: blogs.length,
            albums: blogs.filter((b) => b.type === 'album').length,
            photos,
        };
    }
    async getCategories() {
        const blogs = await this.prisma.blog.findMany({ where: { published: true } });
        const counts = new Map();
        for (const b of blogs) {
            let tags = [];
            try {
                tags = JSON.parse(b.tags) || [];
            }
            catch {
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
    async findAll(query) {
        const { page = 1, pageSize = 10, status = 'all', search } = query;
        const skip = (page - 1) * pageSize;
        const where = {};
        if (status === 'published')
            where.published = true;
        if (status === 'draft')
            where.published = false;
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
    async findOne(id) {
        const blog = await this.prisma.blog.findUnique({ where: { id } });
        if (!blog) {
            throw new common_1.NotFoundException('小记不存在');
        }
        return this.serialize(blog);
    }
    async create(dto) {
        const tags = await this.saveTags(dto.tags || []);
        const slug = await this.buildUniqueSlug(dto.slug || dto.title);
        const blog = await this.prisma.blog.create({
            data: {
                title: dto.title,
                slug,
                type: dto.type || 'album',
                tags: JSON.stringify(tags),
                content: dto.content || '',
                summary: dto.summary ?? null,
                quote: dto.quote ?? null,
                location: dto.location ?? null,
                date: dto.date ?? null,
                photos: JSON.stringify(dto.photos || []),
                published: dto.published ?? false,
            },
        });
        return this.serialize(blog);
    }
    async update(id, dto) {
        const existing = await this.prisma.blog.findUnique({ where: { id } });
        if (!existing) {
            throw new common_1.NotFoundException('小记不存在');
        }
        const data = {};
        if (dto.title !== undefined)
            data.title = dto.title;
        if (dto.type !== undefined)
            data.type = dto.type;
        if (dto.content !== undefined)
            data.content = dto.content;
        if (dto.summary !== undefined)
            data.summary = dto.summary ?? null;
        if (dto.quote !== undefined)
            data.quote = dto.quote ?? null;
        if (dto.location !== undefined)
            data.location = dto.location ?? null;
        if (dto.date !== undefined)
            data.date = dto.date ?? null;
        if (dto.photos !== undefined)
            data.photos = JSON.stringify(dto.photos || []);
        if (dto.published !== undefined)
            data.published = dto.published;
        if (dto.tags !== undefined) {
            data.tags = JSON.stringify(await this.saveTags(dto.tags || []));
        }
        if (dto.slug !== undefined) {
            data.slug = await this.buildUniqueSlug(dto.slug || dto.title || existing.title, id);
        }
        const blog = await this.prisma.blog.update({ where: { id }, data });
        return this.serialize(blog);
    }
    async remove(id) {
        const existing = await this.prisma.blog.findUnique({ where: { id } });
        if (!existing) {
            throw new common_1.NotFoundException('小记不存在');
        }
        await this.prisma.blog.delete({ where: { id } });
        return { success: true };
    }
    async saveTags(names) {
        const keys = [];
        for (const raw of names) {
            const name = String(raw || '').trim();
            if (!name)
                continue;
            const key = name;
            const existing = await this.prisma.blogCategory.findUnique({
                where: { key },
            });
            if (existing) {
                keys.push(existing.key);
            }
            else {
                const created = await this.prisma.blogCategory.create({
                    data: { key, name },
                });
                keys.push(created.key);
            }
        }
        return keys;
    }
    async buildUniqueSlug(base, excludeId) {
        let slug = String(base || '')
            .toLowerCase()
            .trim()
            .replace(/\s+/g, '-')
            .replace(/[^\w\-\u4e00-\u9fa5]+/g, '')
            .replace(/\-\-+/g, '-')
            .replace(/^-|-$/g, '');
        if (!slug)
            slug = 'xiaoji';
        const conflict = await this.prisma.blog.findFirst({
            where: { slug, ...(excludeId ? { id: { not: excludeId } } : {}) },
        });
        if (conflict) {
            slug = `${slug}-${Date.now().toString(36)}`;
        }
        return slug;
    }
    serialize(blog) {
        let tags = [];
        let photos = [];
        try {
            tags = JSON.parse(blog.tags) || [];
        }
        catch {
        }
        try {
            photos = JSON.parse(blog.photos) || [];
        }
        catch {
        }
        return { ...blog, tags, photos };
    }
    toCard(blog) {
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
};
exports.XiaojiService = XiaojiService;
exports.XiaojiService = XiaojiService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], XiaojiService);
//# sourceMappingURL=xiaoji.service.js.map