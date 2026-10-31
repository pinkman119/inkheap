import { Body, Controller, Get, Put, UseGuards } from '@nestjs/common';
import { SiteConfigService } from './site-config.service';
import { UpdateSiteConfigDto } from './dto/update-site-config.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

// 后台管理接口（系统 · 站点设置）。仅 admin 可读写，不提供公开接口——
// 站点地址、描述等元信息只通过 RSS feed 对外暴露，无需单独的公开 JSON 入口。
@Controller('admin/site-config')
@UseGuards(JwtAuthGuard)
export class SiteConfigController {
  constructor(private readonly service: SiteConfigService) {}

  @Get()
  findOne() {
    return this.service.findOne();
  }

  @Put()
  update(@Body() dto: UpdateSiteConfigDto) {
    return this.service.update(dto);
  }
}
