import { Module } from '@nestjs/common';
import { XiaojiController } from './xiaoji.controller';
import { AdminXiaojiController } from './xiaoji-admin.controller';
import { XiaojiService } from './xiaoji.service';
import { DigitalLifeModule } from '../digitallife/digital-life.module';

@Module({
  imports: [DigitalLifeModule],
  controllers: [XiaojiController, AdminXiaojiController],
  providers: [XiaojiService],
  exports: [XiaojiService],
})
export class XiaojiModule {}
