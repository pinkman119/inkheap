import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import type { Request } from 'express';
import { PrismaService } from '../prisma/prisma.service';

/**
 * 访客（邮箱用户）JWT 策略：与管理员共用 secret，但 payload.role = "user"。
 * token 提取双通道：优先 httpOnly cookie（user_token），回退 Authorization: Bearer（迁移兼容）。
 * validate 查 email_users 表——与管理员 token 天然互不越权：
 * user token 在 admin 策略下查不到 adminUser（401），反之亦然。
 */
@Injectable()
export class UserJwtStrategy extends PassportStrategy(Strategy, 'user-jwt') {
  constructor(private prisma: PrismaService) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        // 1) httpOnly cookie（邮箱登录的主通道）
        (req: Request) => (req as any)?.cookies?.['user_token'] || null,
        // 2) Authorization: Bearer 头（兼容迁移期/直接调用方）
        ExtractJwt.fromAuthHeaderAsBearerToken(),
      ]),
      secretOrKey: process.env.JWT_SECRET || 'inkheap-admin-secret-key-2026',
    });
  }

  async validate(payload: { sub: string; role: string }) {
    if (payload.role !== 'user') {
      throw new UnauthorizedException();
    }
    const user = await this.prisma.emailUser.findUnique({
      where: { id: payload.sub },
    });
    if (!user || user.status !== 'active') {
      throw new UnauthorizedException();
    }
    return {
      id: user.id,
      email: user.email,
      nickname: user.nickname,
      homepageUrl: user.homepageUrl,
      avatarUrl: user.avatarUrl,
      role: 'user',
    };
  }
}
