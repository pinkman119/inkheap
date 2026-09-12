import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateFooterLinkDto } from './dto/create-footer-link.dto';
import { UpdateFooterLinkDto } from './dto/update-footer-link.dto';
import { MoveFooterLinkDto } from './dto/move-footer-link.dto';
import { sanitizeSvg } from '../../common/utils/sanitize-svg.util';

@Injectable()
export class FooterLinkService {
  constructor(private prisma: PrismaService) {}

  /** 全部记录（后台列表 & 公开接口共用），按 type + sortOrder + createdAt 排序 */
  async findAll() {
    return this.prisma.footerLink.findMany({
      orderBy: [{ type: 'asc' }, { sortOrder: 'asc' }, { createdAt: 'asc' }],
    });
  }

  async findOne(id: string) {
    const link = await this.prisma.footerLink.findUnique({ where: { id } });
    if (!link) throw new NotFoundException('链接不存在');
    return link;
  }

  async create(dto: CreateFooterLinkDto) {
    // sortOrder 不传则自动取同类型 MAX+1
    let sortOrder = dto.sortOrder;
    if (sortOrder === undefined) {
      const last = await this.prisma.footerLink.findFirst({
        where: { type: dto.type },
        orderBy: { sortOrder: 'desc' },
        select: { sortOrder: true },
      });
      sortOrder = (last?.sortOrder ?? -1) + 1;
    }
    return this.prisma.footerLink.create({
      data: {
        ...this.normalizeIcon(dto),
        mode: dto.mode ?? 0,
        sortOrder,
      },
    });
  }

  async update(id: string, dto: UpdateFooterLinkDto) {
    await this.findOne(id);
    return this.prisma.footerLink.update({
      where: { id },
      data: this.normalizeIcon(dto),
    });
  }

  /**
   * 图标字段归一：
   * - svg 需清洗掉脚本/事件属性（后台录入内容会以前端 v-html 渲染）
   * - 清空 svg 时把字段置为 null，避免空字符串在前端被判为「有自定义图标」
   */
  private normalizeIcon<T extends { icon?: string; svg?: string }>(dto: T) {
    const svg = sanitizeSvg(dto.svg);
    return { ...dto, icon: dto.icon || null, svg: svg || null } as T & {
      icon: string | null;
      svg: string | null;
    };
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.prisma.footerLink.delete({ where: { id } });
    return { message: '删除成功' };
  }

  /** 上移/下移：与同类型相邻记录交换 sortOrder */
  async move(dto: MoveFooterLinkDto) {
    const current = await this.findOne(dto.id);
    const sibling = await this.prisma.footerLink.findFirst({
      where: {
        type: current.type,
        sortOrder: dto.direction === 'up'
          ? { lt: current.sortOrder }
          : { gt: current.sortOrder },
      },
      orderBy: dto.direction === 'up'
        ? { sortOrder: 'desc' }
        : { sortOrder: 'asc' },
    });
    if (!sibling) {
      throw new BadRequestException(
        dto.direction === 'up' ? '已经是最前面了' : '已经是最后面了',
      );
    }
    // 交换 sortOrder（用事务保证一致）
    const [, , updated] = await this.prisma.$transaction([
      this.prisma.footerLink.update({
        where: { id: current.id },
        data: { sortOrder: sibling.sortOrder },
      }),
      this.prisma.footerLink.update({
        where: { id: sibling.id },
        data: { sortOrder: current.sortOrder },
      }),
      this.prisma.footerLink.findUnique({ where: { id: current.id } }),
    ]);
    return updated;
  }
}
