import { Module } from '@nestjs/common';
import { XiaojiController } from './xiaoji.controller';
import { AdminXiaojiController } from './xiaoji-admin.controller';
import { XiaojiService } from './xiaoji.service';
import { DigitalLifeModule } from '../digitallife/digital-life.module';
import { ViewModule } from '../view/view.module';

@Module({
  imports: [DigitalLifeModule, ViewModule],
  controllers: [XiaojiController, AdminXiaojiController],
  providers: [XiaojiService],
  exports: [XiaojiService],
})
export class XiaojiModule {}
