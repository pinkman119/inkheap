import { Controller, Get } from '@nestjs/common';
import { AboutService } from './about.service';

/**
 * 公开关于我接口（无需鉴权）：
 * - GET /api/about/profile    个人资料（kicker/lede/自我评价）
 * - GET /api/about/footprints 足迹列表
 * - GET /api/about/travels    旅行卡片列表
 * - GET /api/about/events     事件日历列表（date 为 YYYY-MM-DD；isRing=true 的为成就事件，前台聚合为年轮）
 *
 * 注：头像与署名（name）取自 /public/home-page，不在此处返回。
 */
@Controller('about')
export class AboutPublicController {
  constructor(private readonly service: AboutService) {}

  @Get('profile')
  getProfile() {
    return this.service.getProfile();
  }

  @Get('footprints')
  findFootprints() {
    return this.service.findFootprints();
  }

  @Get('travels')
  findTravels() {
    return this.service.findTravels();
  }

  @Get('events')
  findEvents() {
    return this.service.findEvents();
  }
}
