import { Controller, Get, Param, Query } from '@nestjs/common';
import { XiaojiService } from './xiaoji.service';

/**
 * 公开小记接口（无需鉴权）：
 * - GET /api/xiaoji           列表（?tag= 按分类筛选）
 * - GET /api/xiaoji/stats     统计
 * - GET /api/xiaoji/categories 分类列表（优先返回已用分类）
 * - GET /api/xiaoji/slug/:slug 详情（含 prev/next）
 */
@Controller('xiaoji')
export class XiaojiController {
  constructor(private readonly xiaojiService: XiaojiService) {}

  @Get()
  findPublished(@Query('tag') tag?: string) {
    return this.xiaojiService.findPublished(tag);
  }

  @Get('stats')
  getStats() {
    return this.xiaojiService.getStats();
  }

  @Get('categories')
  getCategories() {
    return this.xiaojiService.getCategories();
  }

  @Get('slug/:slug')
  findBySlug(@Param('slug') slug: string) {
    return this.xiaojiService.findBySlug(slug);
  }
}
