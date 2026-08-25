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
exports.ResumeService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const resume_defaults_1 = require("./resume.defaults");
const listSelect = {
    id: true,
    name: true,
    isActive: true,
    createdAt: true,
    updatedAt: true,
};
function safeParse(content) {
    try {
        const parsed = JSON.parse(content);
        return parsed && typeof parsed === 'object' ? parsed : {};
    }
    catch {
        return {};
    }
}
let ResumeService = class ResumeService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async findActive() {
        const active = await this.prisma.resume.findFirst({
            where: { isActive: true },
        });
        if (active) {
            return {
                id: active.id,
                name: active.name,
                isActive: true,
                content: safeParse(active.content),
                updatedAt: active.updatedAt,
            };
        }
        return {
            id: null,
            name: resume_defaults_1.DEFAULT_RESUME_NAME,
            isActive: true,
            content: resume_defaults_1.DEFAULT_RESUME_CONTENT,
        };
    }
    async list() {
        return this.prisma.resume.findMany({
            select: listSelect,
            orderBy: [{ isActive: 'desc' }, { updatedAt: 'desc' }],
        });
    }
    async findById(id) {
        const resume = await this.prisma.resume.findUnique({ where: { id } });
        if (!resume)
            throw new common_1.NotFoundException('简历版本不存在');
        return {
            id: resume.id,
            name: resume.name,
            isActive: resume.isActive,
            content: safeParse(resume.content),
            createdAt: resume.createdAt,
            updatedAt: resume.updatedAt,
        };
    }
    async create(dto) {
        const total = await this.prisma.resume.count();
        const resume = await this.prisma.resume.create({
            data: {
                name: dto.name ?? resume_defaults_1.DEFAULT_RESUME_NAME,
                content: JSON.stringify(dto.content ?? resume_defaults_1.DEFAULT_RESUME_CONTENT),
                isActive: dto.isActive ?? total === 0,
            },
        });
        return this.findById(resume.id);
    }
    async update(id, dto) {
        const existing = await this.prisma.resume.findUnique({ where: { id } });
        if (!existing)
            throw new common_1.NotFoundException('简历版本不存在');
        const resume = await this.prisma.resume.update({
            where: { id },
            data: {
                name: dto.name ?? existing.name,
                content: dto.content !== undefined ? JSON.stringify(dto.content) : existing.content,
            },
        });
        return this.findById(resume.id);
    }
    async activate(id) {
        const target = await this.prisma.resume.findUnique({ where: { id } });
        if (!target)
            throw new common_1.NotFoundException('简历版本不存在');
        await this.prisma.$transaction([
            this.prisma.resume.updateMany({ where: { isActive: true }, data: { isActive: false } }),
            this.prisma.resume.update({ where: { id }, data: { isActive: true } }),
        ]);
        return this.findById(id);
    }
    async remove(id) {
        const target = await this.prisma.resume.findUnique({ where: { id } });
        if (!target)
            throw new common_1.NotFoundException('简历版本不存在');
        if (target.isActive) {
            const activeCount = await this.prisma.resume.count({ where: { isActive: true } });
            if (activeCount <= 1) {
                throw new common_1.BadRequestException('不能删除当前唯一的生效版本，请先切换其他版本为生效');
            }
        }
        await this.prisma.resume.delete({ where: { id } });
        return { success: true };
    }
};
exports.ResumeService = ResumeService;
exports.ResumeService = ResumeService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], ResumeService);
//# sourceMappingURL=resume.service.js.map