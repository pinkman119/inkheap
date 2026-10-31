import { Controller, Post, Body, HttpCode, HttpStatus, Req } from '@nestjs/common';
import type { Request } from 'express';
import { VisitService } from './visit.service';
import { ReportVisitDto } from './dto/report-visit.dto';

/**
 * 公开访问上报接口（前台路由切换时上报 PV，无需鉴权）：
 * - POST /api/visit   上报一次访问（按天聚合计数 + 访客明细落库）
 */
@Controller('visit')
export class VisitController {
  constructor(private readonly visitService: VisitService) {}

  @Post()
  @HttpCode(HttpStatus.OK)
  report(@Req() req: Request, @Body() dto: ReportVisitDto) {
    // trust proxy 已开启（见 main.ts），req.ip 取自 X-Forwarded-For 的真实客户端地址
    return this.visitService.report(dto?.path, req.ip);
  }
}
