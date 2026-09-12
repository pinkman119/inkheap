import { Body, Controller, Get, Put, UseGuards } from '@nestjs/common';
import { FooterConfigService } from './footer-config.service';
import { UpdateFooterConfigDto } from './dto/update-footer-config.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

// 公开接口（前台页脚展示备案信息，无需登录）
@Controller('public/footer-config')
export class PublicFooterConfigController {
  constructor(private readonly service: FooterConfigService) {}

  @Get()
  findOne() {
    return this.service.findOne();
  }
}

// 后台管理接口（底部管理 · 备案信息）
@Controller('admin/footer-config')
@UseGuards(JwtAuthGuard)
export class FooterConfigController {
  constructor(private readonly service: FooterConfigService) {}

  @Get()
  findOne() {
    return this.service.findOne();
  }

  @Put()
  update(@Body() dto: UpdateFooterConfigDto) {
    return this.service.update(dto);
  }
}
