import { Module } from '@nestjs/common';
import { VisitService } from './visit.service';
import { VisitController } from './visit.controller';
import { GeoService } from './geo.service';

@Module({
  controllers: [VisitController],
  providers: [VisitService, GeoService],
})
export class VisitModule {}
