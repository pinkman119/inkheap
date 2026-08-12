import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UploadService } from '../upload/upload.service';
import { UpdateHomePageDto } from './dto/update-home-page.dto';

const HOME_ID = 'home';

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
        createdAt: null,
        updatedAt: null,
      };
    }

    return record;
  }

  /**
   * 更新首页配置（后台管理）。不存在时自动创建。
   * 若 avatar 发生变化且旧 avatar 对应 files 表记录，则同步删除旧文件（磁盘 + 数据库）。
   */
  async update(dto: UpdateHomePageDto) {
    const existing = await this.prisma.homePage.findUnique({
      where: { id: HOME_ID },
    });

    if (existing) {
      // 替换/移除头像：清理旧文件
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
}
