import { Module } from '@nestjs/common';
import { FooterLinkController } from './footer-link.controller';
import { FooterLinkService } from './footer-link.service';
import { PublicFooterLinkController } from './footer-link-public.controller';
import { FooterConfigController, PublicFooterConfigController } from './footer-config.controller';
import { FooterConfigService } from './footer-config.service';

@Module({
  controllers: [
    FooterLinkController,
    PublicFooterLinkController,
    FooterConfigController,
    PublicFooterConfigController,
  ],
  providers: [FooterLinkService, FooterConfigService],
  exports: [FooterLinkService, FooterConfigService],
})
export class FooterLinkModule {}
