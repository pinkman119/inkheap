import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateSiteConfigDto } from './dto/update-site-config.dto';

const SITE_CONFIG_ID = 'site';

/** 未做任何配置时的兜底值，保证 feed 不因缺记录而报错 */
const FALLBACK = {
  id: SITE_CONFIG_ID,
  siteUrl: '',
  siteTitle: '',
  siteDescription: '',
  author: '',
  createdAt: null,
  updatedAt: null,
};

/**
 * 站点全局配置（siteUrl / 站点名称 / 描述 / 作者）。
 * 与 FooterConfig 同为单条记录，这里主要服务 RSS feed（/api/feed.xml）的对外输出。
 */
@Injectable()
export class SiteConfigService {
  constructor(private readonly prisma: PrismaService) {}

  /** 获取配置（后台管理）。记录不存在时返回兜底值 */
  async findOne() {
    const record = await this.prisma.siteConfig.findUnique({
      where: { id: SITE_CONFIG_ID },
    });
    if (!record) return { ...FALLBACK };
    return record;
  }

  /** 更新配置（后台管理）。记录不存在时自动创建 */
  async update(dto: UpdateSiteConfigDto) {
    const data: Prisma.SiteConfigUpdateInput = {};
    if (dto.siteUrl !== undefined) {
      // 去除尾斜杠，保证 feed 拼链接时统一为 `${siteUrl}/#/xxx` 形式
      data.siteUrl = dto.siteUrl.trim().replace(/\/+$/, '');
    }
    if (dto.siteTitle !== undefined) data.siteTitle = dto.siteTitle.trim();
    if (dto.siteDescription !== undefined) {
      data.siteDescription = dto.siteDescription.trim();
    }
    if (dto.author !== undefined) data.author = dto.author.trim();

    await this.prisma.siteConfig.upsert({
      where: { id: SITE_CONFIG_ID },
      create: { id: SITE_CONFIG_ID, ...(data as Prisma.SiteConfigCreateInput) },
      update: data,
    });
    return this.findOne();
  }
}
