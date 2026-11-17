import { Controller, Get, HttpCode, Post, Req, Res, UseGuards } from '@nestjs/common';
import type { Response } from 'express';
import { UserJwtAuthGuard } from '../auth/user-jwt.guard';
import { EmailAuthService, USER_TOKEN_COOKIE } from './email-auth.service';

/**
 * 邮箱认证登录态接口（访客 JWT 鉴权）。
 * GET  /api/user/auth/me     —— 探测登录态，返回当前用户信息
 * POST /api/user/auth/logout —— 登出（清除 cookie）
 */
@Controller('user/auth')
@UseGuards(UserJwtAuthGuard)
export class EmailAuthUserController {
  constructor(private readonly authService: EmailAuthService) {}

  @Get('me')
  async me(@Req() req: any) {
    return this.authService.getProfile(req.user.id);
  }

  @HttpCode(200)
  @Post('logout')
  async logout(@Res({ passthrough: true }) res: Response) {
    res.clearCookie(USER_TOKEN_COOKIE, { path: '/' });
    return { message: '已退出登录' };
  }
}
