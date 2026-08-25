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
exports.UploadService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const crypto_1 = require("crypto");
const fs_1 = require("fs");
const path_1 = require("path");
const UPLOAD_ROOT = (0, path_1.join)(process.cwd(), 'files');
let UploadService = class UploadService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async persistWithWrite(file, dateDir, storedName) {
        const relativePath = (0, path_1.join)(dateDir, storedName);
        const absPath = (0, path_1.join)(UPLOAD_ROOT, relativePath);
        (0, fs_1.writeFileSync)(absPath, file.buffer);
        const url = `/files/${relativePath.replace(/\\/g, '/')}`;
        const record = await this.prisma.file.create({
            data: {
                filename: storedName,
                originalName: file.originalname,
                url,
                mimeType: file.mimetype,
                size: file.size,
                relativePath,
            },
        });
        return {
            id: record.id,
            url,
            filename: storedName,
            size: file.size,
        };
    }
    async remove(id) {
        const record = await this.prisma.file.findUnique({ where: { id } });
        if (!record) {
            throw new common_1.NotFoundException('文件记录不存在');
        }
        const absPath = (0, path_1.join)(UPLOAD_ROOT, record.relativePath);
        if ((0, fs_1.existsSync)(absPath)) {
            try {
                (0, fs_1.unlinkSync)(absPath);
            }
            catch {
            }
        }
        await this.prisma.file.delete({ where: { id } });
    }
    async removeByUrl(url) {
        if (!url)
            return;
        const record = await this.prisma.file.findUnique({ where: { url } });
        if (!record)
            return;
        await this.remove(record.id);
    }
    ensureDateDir(dateDir) {
        const dir = (0, path_1.join)(UPLOAD_ROOT, dateDir);
        if (!(0, fs_1.existsSync)(dir)) {
            (0, fs_1.mkdirSync)(dir, { recursive: true });
        }
    }
    buildStoredName(originalName) {
        const ext = originalName.includes('.')
            ? originalName.slice(originalName.lastIndexOf('.'))
            : '';
        return `${(0, crypto_1.randomUUID)()}${ext}`;
    }
    buildDateDir() {
        return new Date().toISOString().slice(0, 10);
    }
};
exports.UploadService = UploadService;
exports.UploadService = UploadService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], UploadService);
//# sourceMappingURL=upload.service.js.map