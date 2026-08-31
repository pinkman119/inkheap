import { Controller, Get } from '@nestjs/common';
import { FooterLinkService } from './footer-link.service';

// 公开接口（前台页脚使用，无需 admin 鉴权）
@Controller('public/footer-links')
export class PublicFooterLinkController {
  constructor(private readonly footerLinkService: FooterLinkService) {}

  @Get()
  findAll() {
    return this.footerLinkService.findAll();
  }
}
