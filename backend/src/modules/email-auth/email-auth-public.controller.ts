import { Body, Controller, HttpCode, Post, Req } from '@nestjs/common';
import type { Request, Response } from 'express';
import { Res } from '@nestjs/common';
import { EmailAuthService } from './email-auth.service';
import { SendCodeDto, RegisterDto, LoginDto, ForgotPasswordDto } from './dto/email-auth.dto';
import { normalizeClientIp } from '../view/view.util';

/**
 * 邮箱认证公开接口（无需登录）。
 * POST /api/public/auth/send-code      —— 发送注册验证码
 * POST /api/public/auth/register       —— 注册（验证码校验通过后自动登录）
 * POST /api/public/auth/login          —— 邮箱 + 密码登录（14 天 httpOnly cookie）
 * POST /api/public/auth/forgot-password —— 忘记密码（明文密码邮件发送，限流）
 */
@Controller('public/auth')
export class EmailAuthPublicController {
  constructor(private readonly authService: EmailAuthService) {}

  @HttpCode(200)
  @Post('send-code')
  async sendCode(@Body() dto: SendCodeDto) {
    await this.authService.sendRegisterCode(dto.email);
    return { message: '验证码已发送，请查收邮件' };
  }

  @HttpCode(200)
  @Post('register')
  async register(@Body() dto: RegisterDto, @Res({ passthrough: true }) res: Response) {
    return this.authService.register(dto, res);
  }

  @HttpCode(200)
  @Post('login')
  async login(@Body() dto: LoginDto, @Res({ passthrough: true }) res: Response) {
    return this.authService.login(dto, res);
  }

  @HttpCode(200)
  @Post('forgot-password')
  async forgotPassword(@Body() dto: ForgotPasswordDto, @Req() req: Request) {
    // trust proxy 已开启，req.ip 为真实客户端地址
    await this.authService.forgotPassword(dto.email, normalizeClientIp(req.ip));
    return { message: '密码已发送到您的邮箱，请注意查收' };
  }
}
