import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateResumeDto, UpdateResumeDto } from './dto/resume.dto';
import { DEFAULT_RESUME_CONTENT, DEFAULT_RESUME_NAME } from './resume.defaults';

/** 列表项：不含完整 content */
const listSelect = {
  id: true,
  name: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
} as const;

function safeParse(content: string): Record<string, unknown> {
  try {
    const parsed = JSON.parse(content);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

@Injectable()
export class ResumeService {
  constructor(private readonly prisma: PrismaService) {}

  /** 当前生效版本（前台展示）；无生效版本时返回含默认内容的占位数据 */
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
      name: DEFAULT_RESUME_NAME,
      isActive: true,
      content: DEFAULT_RESUME_CONTENT,
    };
  }

  /** 版本列表（不含完整 content） */
  async list() {
    return this.prisma.resume.findMany({
      select: listSelect,
      orderBy: [{ isActive: 'desc' }, { updatedAt: 'desc' }],
    });
  }

  /** 版本详情（含完整 content） */
  async findById(id: string) {
    const resume = await this.prisma.resume.findUnique({ where: { id } });
    if (!resume) throw new NotFoundException('简历版本不存在');
    return {
      id: resume.id,
      name: resume.name,
      isActive: resume.isActive,
      content: safeParse(resume.content),
      createdAt: resume.createdAt,
      updatedAt: resume.updatedAt,
    };
  }

  /** 新建版本：首个版本自动激活 */
  async create(dto: CreateResumeDto) {
    const total = await this.prisma.resume.count();
    const resume = await this.prisma.resume.create({
      data: {
        name: dto.name ?? DEFAULT_RESUME_NAME,
        content: JSON.stringify(dto.content ?? DEFAULT_RESUME_CONTENT),
        isActive: dto.isActive ?? total === 0,
      },
    });
    return this.findById(resume.id);
  }

  /** 更新版本名称/内容 */
  async update(id: string, dto: UpdateResumeDto) {
    const existing = await this.prisma.resume.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('简历版本不存在');

    const resume = await this.prisma.resume.update({
      where: { id },
      data: {
        name: dto.name ?? existing.name,
        content: dto.content !== undefined ? JSON.stringify(dto.content) : existing.content,
      },
    });
    return this.findById(resume.id);
  }

  /** 切换激活版本（事务保证至多一个 isActive） */
  async activate(id: string) {
    const target = await this.prisma.resume.findUnique({ where: { id } });
    if (!target) throw new NotFoundException('简历版本不存在');

    await this.prisma.$transaction([
      this.prisma.resume.updateMany({ where: { isActive: true }, data: { isActive: false } }),
      this.prisma.resume.update({ where: { id }, data: { isActive: true } }),
    ]);
    return this.findById(id);
  }

  /** 删除版本：唯一生效版本不可删除 */
  async remove(id: string) {
    const target = await this.prisma.resume.findUnique({ where: { id } });
    if (!target) throw new NotFoundException('简历版本不存在');

    if (target.isActive) {
      const activeCount = await this.prisma.resume.count({ where: { isActive: true } });
      if (activeCount <= 1) {
        throw new BadRequestException('不能删除当前唯一的生效版本，请先切换其他版本为生效');
      }
    }
    await this.prisma.resume.delete({ where: { id } });
    return { success: true };
  }
}
