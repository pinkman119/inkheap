import { Injectable } from '@nestjs/common';
import { Prisma, HomePage } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { UploadService } from '../upload/upload.service';
import { UpdateHomePageDto } from './dto/update-home-page.dto';
import { HomeSocialLinkDto } from './dto/home-social-link.dto';
import { FOOTER_ICON_KEYS } from '../footer-link/footer-icon.constants';
import { sanitizeSvg } from '../../common/utils/sanitize-svg.util';

const HOME_ID = 'home';

/** 单条社交链接的字段长度上限 */
const LABEL_MAX = 60;
const URL_MAX = 500;
const SOCIAL_MAX = 12;

/**
 * 未做任何配置时的默认社交按钮。
 * 与改造前首页硬编码的两个入口保持一致，避免升级后首页凭空少掉入口。
 */
export const DEFAULT_SOCIAL_LINKS = [
  { label: 'yuque', url: 'https://www.yuque.com', icon: 'yuque', svg: '' },
  { label: 'github', url: 'https://github.com', icon: 'github', svg: '' },
];

/** 落库前归一：裁剪长度、过滤空项、校验图标 key、清洗自定义 SVG */
function normalizeSocialLinks(list: HomeSocialLinkDto[]) {
  return list
    .filter((item) => item && (item.label || item.url))
    .slice(0, SOCIAL_MAX)
    .map((item) => ({
      label: (item.label ?? '').trim().slice(0, LABEL_MAX),
      url: (item.url ?? '').trim().slice(0, URL_MAX),
      icon: FOOTER_ICON_KEYS.includes(item.icon as (typeof FOOTER_ICON_KEYS)[number])
        ? item.icon
        : '',
      svg: sanitizeSvg(item.svg) ?? '',
    }));
}

/** 出库时把 JSON 字符串还原为数组，数据异常时降级为空数组 */
function parseSocialLinks(raw?: string | null) {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return normalizeSocialLinks(parsed);
  } catch {
    return [];
  }
}

@Injectable()
export class HomePageService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly uploadService: UploadService,
  ) {}

  /**
   * 获取首页配置（公开）。不存在时返回默认占位，保证前台不崩。
   */
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
        workPersonTitle: '',
        workCodeContent: '',
        lifePersonTitle: '',
        lifeCodeContent: '',
        avatar: null,
        socialLinks: DEFAULT_SOCIAL_LINKS,
        createdAt: null,
        updatedAt: null,
      };
    }

    return this.toResponse(record);
  }

  /**
   * 更新首页配置（后台管理）。不存在时自动创建。
   * 若 avatar 发生变化且旧 avatar 对应 files 表记录，则同步删除旧文件（磁盘 + 数据库）。
   */
  async update(dto: UpdateHomePageDto) {
    const existing = await this.prisma.homePage.findUnique({
      where: { id: HOME_ID },
    });

    const { socialLinks, ...rest } = dto;
    // socialLinks 为整体覆盖式保存：传了就序列化，没传则不动原值
    const data: Prisma.HomePageUpdateInput = { ...rest };
    if (socialLinks !== undefined) {
      data.socialLinks = JSON.stringify(normalizeSocialLinks(socialLinks));
    }

    if (existing) {
      // 替换/移除头像：清理旧文件
      if (dto.avatar !== undefined && dto.avatar !== existing.avatar) {
        await this.uploadService.removeByUrl(existing.avatar ?? '');
      }

      const updated = await this.prisma.homePage.update({
        where: { id: HOME_ID },
        data,
      });
      return this.toResponse(updated);
    }

    const created = await this.prisma.homePage.create({
      data: {
        id: HOME_ID,
        siteName: dto.siteName ?? 'INKHEAP',
        personTitle: dto.personTitle ?? '',
        codeContent: dto.codeContent ?? '',
        workPersonTitle: dto.workPersonTitle ?? '',
        workCodeContent: dto.workCodeContent ?? '',
        lifePersonTitle: dto.lifePersonTitle ?? '',
        lifeCodeContent: dto.lifeCodeContent ?? '',
        avatar: dto.avatar,
        socialLinks:
          socialLinks !== undefined
            ? JSON.stringify(normalizeSocialLinks(socialLinks))
            : JSON.stringify(DEFAULT_SOCIAL_LINKS),
      },
    });
    return this.toResponse(created);
  }

  /** 统一出口：把数据库的 JSON 字符串字段换成数组，前端直接可用 */
  private toResponse(record: HomePage) {
    return {
      ...record,
      socialLinks: parseSocialLinks(record.socialLinks),
    };
  }
}
