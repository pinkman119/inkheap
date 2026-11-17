import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private prisma: PrismaService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: process.env.JWT_SECRET || 'inkheap-admin-secret-key-2026',
    });
  }

  async validate(payload: { sub: string; username: string; role: string }) {
    const user = await this.prisma.adminUser.findUnique({
      where: { id: payload.sub },
    });
    if (!user) {
      throw new UnauthorizedException();
    }
    // 账号被失效后，已签发的 token 在下一次请求时立即被拦截，无需等 token 自然过期
    if (user.status !== 'active') {
      throw new UnauthorizedException('账号已失效');
    }
    return { id: user.id, username: user.username, role: user.role };
  }
}
