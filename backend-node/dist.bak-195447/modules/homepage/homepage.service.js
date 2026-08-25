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
exports.HomePageService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const upload_service_1 = require("../upload/upload.service");
const HOME_ID = 'home';
let HomePageService = class HomePageService {
    prisma;
    uploadService;
    constructor(prisma, uploadService) {
        this.prisma = prisma;
        this.uploadService = uploadService;
    }
    async findOne() {
        const record = await this.prisma.homePage.findUnique({
            where: { id: HOME_ID },
        });
        if (!record) {
            return {
                id: HOME_ID,
                siteName: 'INKHEAP',
                personTitle: '',
                codeContent: '',
                createdAt: null,
                updatedAt: null,
            };
        }
        return record;
    }
    async update(dto) {
        const existing = await this.prisma.homePage.findUnique({
            where: { id: HOME_ID },
        });
        if (existing) {
            if (dto.avatar !== undefined && dto.avatar !== existing.avatar) {
                await this.uploadService.removeByUrl(existing.avatar ?? '');
            }
            return this.prisma.homePage.update({
                where: { id: HOME_ID },
                data: dto,
            });
        }
        return this.prisma.homePage.create({
            data: {
                id: HOME_ID,
                siteName: dto.siteName ?? 'INKHEAP',
                personTitle: dto.personTitle ?? '',
                codeContent: dto.codeContent ?? '',
                avatar: dto.avatar,
            },
        });
    }
};
exports.HomePageService = HomePageService;
exports.HomePageService = HomePageService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        upload_service_1.UploadService])
], HomePageService);
//# sourceMappingURL=homepage.service.js.map