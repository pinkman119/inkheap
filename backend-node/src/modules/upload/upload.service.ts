import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { randomUUID } from 'crypto';
import { mkdirSync, unlinkSync, existsSync, writeFileSync } from 'fs';
import { join } from 'path';

const UPLOAD_ROOT = join(process.cwd(), 'files');

@Injectable()
export class UploadService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * 持久化一次上传：将内存中的文件缓冲写入磁盘，再向 files 表写入记录。
   * 返回可被前端用于后续删除的 id 与可访问 URL。
   */
  async persistWithWrite(
    file: Express.Multer.File,
    dateDir: string,
    storedName: string,
  ): Promise<{ id: string; url: string; filename: string; size: number }> {
    const relativePath = join(dateDir, storedName);
    const absPath = join(UPLOAD_ROOT, relativePath);
    writeFileSync(absPath, file.buffer);

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

  /**
   * 根据 files 表 id 删除：先删磁盘实体，再删数据库记录（幂等）。
   */
  async remove(id: string): Promise<void> {
    const record = await this.prisma.file.findUnique({ where: { id } });
    if (!record) {
      throw new NotFoundException('文件记录不存在');
    }

    const absPath = join(UPLOAD_ROOT, record.relativePath);
    if (existsSync(absPath)) {
      try {
        unlinkSync(absPath);
      } catch {
        // 磁盘文件缺失也继续删库，避免脏数据残留
      }
    }

    await this.prisma.file.delete({ where: { id } });
  }

  /**
   * 根据 avatar URL 删除旧文件（替换/移除头像时调用）。
   * 无对应记录时静默跳过，保证幂等。
   */
  async removeByUrl(url: string): Promise<void> {
    if (!url) return;
    const record = await this.prisma.file.findUnique({ where: { url } });
    if (!record) return;
    await this.remove(record.id);
  }

  /**
   * 确保按日期分目录存在（首次上传时创建）。
   */
  ensureDateDir(dateDir: string): void {
    const dir = join(UPLOAD_ROOT, dateDir);
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }
  }

  /**
   * 由原始文件名推导存储名：uuid + 原扩展名。
   */
  buildStoredName(originalName: string): string {
    const ext = originalName.includes('.')
      ? originalName.slice(originalName.lastIndexOf('.'))
      : '';
    return `${randomUUID()}${ext}`;
  }

  /**
   * 由当前日期推导 YYYY-MM-DD 目录。
   */
  buildDateDir(): string {
    return new Date().toISOString().slice(0, 10);
  }
}
