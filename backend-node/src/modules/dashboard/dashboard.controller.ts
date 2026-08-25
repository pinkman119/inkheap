import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

/**
 * 后台仪表盘接口（对应原型 dashboard.html）：
 * - GET /api/admin/dashboard/stats              四项指标（来信 / 阅读量 / 访问量 / 用户量）
 * - GET /api/admin/dashboard/article-ranking    文章阅读量排行（抽屉明细）
 * - GET /api/admin/dashboard/visits-trend       访问量趋势（抽屉明细，period=7|30|90|all）
 * - GET /api/admin/dashboard/users              注册用户列表（抽屉明细）
 */
@Controller('admin/dashboard')
@UseGuards(JwtAuthGuard)
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('stats')
  getStats() {
    return this.dashboardService.getStats();
  }

  @Get('article-ranking')
  getArticleRanking() {
    return this.dashboardService.getArticleRanking();
  }

  @Get('visits-trend')
  getVisitsTrend(@Query('period') period: string = '30') {
    return this.dashboardService.getVisitsTrend(period);
  }

  @Get('users')
  getUsers() {
    return this.dashboardService.getUsers();
  }
}
