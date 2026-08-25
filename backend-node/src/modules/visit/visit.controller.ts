import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { VisitService } from './visit.service';
import { ReportVisitDto } from './dto/report-visit.dto';

/**
 * 公开访问上报接口（前台路由切换时上报 PV，无需鉴权）：
 * - POST /api/visit   上报一次访问（按天聚合）
 */
@Controller('visit')
export class VisitController {
  constructor(private readonly visitService: VisitService) {}

  @Post()
  @HttpCode(HttpStatus.OK)
  report(@Body() dto: ReportVisitDto) {
    return this.visitService.report(dto?.path);
  }
}
