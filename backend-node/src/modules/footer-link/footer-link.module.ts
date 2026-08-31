import { Module } from '@nestjs/common';
import { FooterLinkController } from './footer-link.controller';
import { FooterLinkService } from './footer-link.service';
import { PublicFooterLinkController } from './footer-link-public.controller';

@Module({
  controllers: [FooterLinkController, PublicFooterLinkController],
  providers: [FooterLinkService],
  exports: [FooterLinkService],
})
export class FooterLinkModule {}
