import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaService } from '../prisma/prisma.service';

/**
 * 访客（微信用户）JWT 策略：与管理员共用 secret，但 payload.role = "user"，
 * 且 validate 查 wechat_users 表——两类 token 天然互不越权：
 * user token 在 admin 策略下查不到 adminUser（401），反之亦然。
 */
@Injectable()
export class UserJwtStrategy extends PassportStrategy(Strategy, 'user-jwt') {
  constructor(private prisma: PrismaService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: process.env.JWT_SECRET || 'inkheap-admin-secret-key-2026',
    });
  }

  async validate(payload: { sub: string; role: string }) {
    if (payload.role !== 'user') {
      throw new UnauthorizedException();
    }
    const user = await this.prisma.wechatUser.findUnique({
      where: { id: payload.sub },
    });
    if (!user) {
      throw new UnauthorizedException();
    }
    return { id: user.id, openid: user.openid, nickname: user.nickname, role: 'user' };
  }
}
