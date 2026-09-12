import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateFooterConfigDto } from './dto/update-footer-config.dto';

const FOOTER_CONFIG_ID = 'footer';

/** 工信部备案查询系统：备案地址留空时的跳转目标 */
export const DEFAULT_ICP_URL = 'https://beian.miit.gov.cn';

/** 站点默认备案号：与改造前前端硬编码值保持一致，避免升级后页脚凭空少掉备案信息 */
export const DEFAULT_ICP_NO = '苏ICP备2024125779号';

/** 未做任何配置时的兜底值，保证前台不因缺记录而报错 */
const FALLBACK = {
  id: FOOTER_CONFIG_ID,
  icpNo: DEFAULT_ICP_NO,
  icpUrl: DEFAULT_ICP_URL,
  createdAt: null,
  updatedAt: null,
};

/**
 * 页脚全局配置（备案号 / 备案地址）。
 * 与 FooterLinkService（多条链接）互补：这里是全站唯一的单条记录。
 */
@Injectable()
export class FooterConfigService {
  constructor(private readonly prisma: PrismaService) {}

  /** 获取配置（公开）。记录不存在时返回兜底值 */
  async findOne() {
    const record = await this.prisma.footerConfig.findUnique({
      where: { id: FOOTER_CONFIG_ID },
    });
    if (!record) return { ...FALLBACK };
    return {
      ...record,
      // 地址留空时回退到工信部备案查询系统
      icpUrl: record.icpUrl || DEFAULT_ICP_URL,
    };
  }

  /** 更新配置（后台管理）。记录不存在时自动创建 */
  async update(dto: UpdateFooterConfigDto) {
    const data: Prisma.FooterConfigUpdateInput = {};
    if (dto.icpNo !== undefined) data.icpNo = dto.icpNo.trim();
    if (dto.icpUrl !== undefined) data.icpUrl = dto.icpUrl.trim();

    await this.prisma.footerConfig.upsert({
      where: { id: FOOTER_CONFIG_ID },
      create: { id: FOOTER_CONFIG_ID, ...(data as Prisma.FooterConfigCreateInput) },
      update: data,
    });
    return this.findOne();
  }
}
