import { ForbiddenException, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { randomBytes } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';

/**
 * 微信登录服务。
 * 当前为 Mock 阶段：WECHAT_MOCK=true 时提供模拟登录；
 * 备案完成后新增 code 换 openid 的真实登录端点，token 结构与前端交互完全复用。
 */
@Injectable()
export class WechatService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  /** Mock 登录：携带 openid 时复用既有用户（续聊历史），否则新建 mock 用户 */
  async mockLogin(openid?: string) {
    if (process.env.WECHAT_MOCK !== 'true') {
      throw new ForbiddenException('模拟登录未开启');
    }

    let user;
    if (openid) {
      user = await this.prisma.wechatUser.upsert({
        where: { openid },
        update: {},
        create: {
          openid,
          nickname: `微信用户${openid.slice(-4)}`,
        },
      });
    } else {
      const suffix = randomBytes(6).toString('hex');
      user = await this.prisma.wechatUser.create({
        data: {
          openid: `mock-${suffix}`,
          nickname: `微信用户${suffix.slice(0, 4)}`,
        },
      });
    }

    const payload = { sub: user.id, role: 'user' };
    return {
      accessToken: this.jwtService.sign(payload),
      user: {
        id: user.id,
        openid: user.openid,
        nickname: user.nickname,
        avatar: user.avatar,
      },
    };
  }

  /**
   * 真实微信扫码登录接入点（备案完成后实现）：
   * 以 code 换取 openid（微信 oauth2 接口），后续逻辑与 mockLogin 一致。
   */
}
