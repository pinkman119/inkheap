import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { DEFAULT_PERSONA } from './digital-life.defaults';
import { UpdatePersonaDto } from './dto/digital-life.dto';

/**
 * 数字生命人格服务（多人格结构化配置）：
 * - 列表 / 详情 / 更新（name、greeting、description、styleHint、accentColor、avatarEmoji、personalityType）
 * - 聊天使用第一个（sortOrder 最小）人格
 */
@Injectable()
export class PersonaService {
  constructor(private prisma: PrismaService) {}

  /** 人格列表（全部结构化字段） */
  async list() {
    return this.prisma.dlPersona.findMany({ orderBy: { sortOrder: 'asc' } });
  }

  /** 人格详情 */
  async detail(id: string) {
    const persona = await this.prisma.dlPersona.findUnique({ where: { id } });
    if (!persona) throw new NotFoundException('人格不存在');
    return persona;
  }

  /** 更新人格 */
  async update(id: string, dto: UpdatePersonaDto) {
    const persona = await this.prisma.dlPersona.findUnique({ where: { id } });
    if (!persona) throw new NotFoundException('人格不存在');

    const data: Record<string, string> = {};
    if (dto.name !== undefined) data.name = dto.name.trim();
    if (dto.greeting !== undefined) data.greeting = dto.greeting.trim();
    if (dto.description !== undefined) data.description = dto.description;
    if (dto.styleHint !== undefined) data.styleHint = dto.styleHint.trim();
    if (dto.accentColor !== undefined) data.accentColor = dto.accentColor.trim();
    if (dto.avatarEmoji !== undefined) data.avatarEmoji = dto.avatarEmoji.trim();
    if (dto.personalityType !== undefined) data.personalityType = dto.personalityType.trim();

    const updated = await this.prisma.dlPersona.update({ where: { id }, data });
    return updated;
  }

  /** 聊天使用的当前人格（sortOrder 最小；无记录时抛 409 由调用方处理） */
  async getActivePersona() {
    const persona = await this.prisma.dlPersona.findFirst({
      orderBy: { sortOrder: 'asc' },
    });
    return persona;
  }

  /** 无人格数据时写入默认种子（幂等） */
  async seedIfEmpty() {
    const count = await this.prisma.dlPersona.count();
    if (count > 0) return false;
    await this.prisma.dlPersona.create({ data: { ...DEFAULT_PERSONA, sortOrder: 0 } });
    return true;
  }
}
