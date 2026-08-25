import { Module } from '@nestjs/common';
import { AboutPublicController } from './about-public.controller';
import { AboutAdminController } from './about-admin.controller';
import { AboutService } from './about.service';
import { DigitalLifeModule } from '../digitallife/digital-life.module';

@Module({
  imports: [DigitalLifeModule],
  controllers: [AboutPublicController, AboutAdminController],
  providers: [AboutService],
  exports: [AboutService],
})
export class AboutModule {}
