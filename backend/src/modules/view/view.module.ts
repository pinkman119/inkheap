import { Module } from '@nestjs/common';
import { ViewCountService } from './view.service';

@Module({
  providers: [ViewCountService],
  exports: [ViewCountService],
})
export class ViewModule {}
