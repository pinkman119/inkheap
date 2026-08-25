import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { DEFAULT_PERSONA_CONTENT } from './digital-life.defaults';
import { UpdatePersonaDto } from './dto/digital-life.dto';

/**
 * 数字生命人格服务：DlPersona 单条全局记录（id="default"）。
 * 初始值 = muztagh-cat skill 全文；后台人格编写页可编辑、可重置默认。
 */
@Injectable()
export class PersonaService {
  constructor(private prisma: PrismaService) {}

  async getContent(): Promise<string> {
    const row = await this.prisma.dlPersona.findUnique({ where: { id: 'default' } });
    if (row) return row.content;
    // 无记录时写入默认值并返回（与 seed 兜底一致）
    const created = await this.prisma.dlPersona.create({
      data: { id: 'default', content: DEFAULT_PERSONA_CONTENT },
    });
    return created.content;
  }

  async update(dto: UpdatePersonaDto): Promise<{ content: string }> {
    await this.ensureRow();
    const row = await this.prisma.dlPersona.update({
      where: { id: 'default' },
      data: { content: dto.content },
    });
    return { content: row.content };
  }

  /** 重置为默认人格（muztagh-cat skill 原文） */
  async resetToDefault(): Promise<{ content: string }> {
    await this.ensureRow();
    const row = await this.prisma.dlPersona.update({
      where: { id: 'default' },
      data: { content: DEFAULT_PERSONA_CONTENT },
    });
    return { content: row.content };
  }

  async getDefaultContent(): Promise<{ content: string }> {
    return { content: DEFAULT_PERSONA_CONTENT };
  }

  private async ensureRow() {
    const row = await this.prisma.dlPersona.findUnique({ where: { id: 'default' } });
    if (row) return row;
    return this.prisma.dlPersona.create({
      data: { id: 'default', content: DEFAULT_PERSONA_CONTENT },
    });
  }
}
