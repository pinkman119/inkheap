import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { randomInt } from 'crypto';
import type { Response } from 'express';
import { PrismaService } from '../prisma/prisma.service';
import { MailService } from '../mail/mail.service';
import { encryptSecret, decryptSecret } from '../digitallife/crypto.util';
import { RegisterDto, LoginDto } from './dto/email-auth.dto';

/** 访客登录态 cookie 名（httpOnly JWT） */
export const USER_TOKEN_COOKIE = 'user_token';
/** 登录态有效期：14 天（cookie maxAge 与 JWT expiresIn 对齐） */
export const USER_TOKEN_MAX_AGE_MS = 14 * 24 * 60 * 60 * 1000;

/** 注册验证码内存条目 */
interface CodeEntry {
  code: string;
  expiresAt: number;
  sentAt: number;
}

/**
 * 邮箱账号服务：注册（验证码）/ 登录 / 找回密码。
 * 密码采用 AES-256-GCM 可逆加密存储（产品需求：找回时邮件发送明文密码）。
 */
@Injectable()
export class EmailAuthService {
  private readonly logger = new Logger(EmailAuthService.name);

  /** email -> 验证码条目（内存，单实例部署；重启丢失可接受，重新获取即可） */
  private readonly codeStore = new Map<string, CodeEntry>();
  /** 找回密码限流：email -> 上次发送时间 */
  private readonly forgotEmailAt = new Map<string, number>();
  /** 找回密码限流：ip -> 最近一小时内的发送时间戳列表 */
  private readonly forgotIpLog = new Map<string, number[]>();

  /** 验证码有效期 5 分钟 */
  private static readonly CODE_TTL_MS = 5 * 60 * 1000;
  /** 同邮箱重发间隔 60s */
  private static readonly RESEND_INTERVAL_MS = 60 * 1000;
  /** 找回密码：同邮箱 60s 一次 */
  private static readonly FORGOT_EMAIL_INTERVAL_MS = 60 * 1000;
  /** 找回密码：同 IP 每小时最多 10 次 */
  private static readonly FORGOT_IP_HOURLY_LIMIT = 10;
  private static readonly FORGOT_IP_WINDOW_MS = 60 * 60 * 1000;

  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private mailService: MailService,
  ) {}

  /* ==================== 注册验证码 ==================== */

  async sendRegisterCode(email: string): Promise<void> {
    const normalized = email.trim().toLowerCase();

    const existed = await this.prisma.emailUser.findUnique({ where: { email: normalized } });
    if (existed) {
      throw new BadRequestException('该邮箱已注册，请直接登录');
    }

    const now = Date.now();
    const entry = this.codeStore.get(normalized);
    if (entry && now - entry.sentAt < EmailAuthService.RESEND_INTERVAL_MS) {
      const wait = Math.ceil((EmailAuthService.RESEND_INTERVAL_MS - (now - entry.sentAt)) / 1000);
      throw new HttpException(`发送过于频繁，请 ${wait} 秒后再试`, HttpStatus.TOO_MANY_REQUESTS);
    }

    // 发送成功后才落内存（MailService 失败会抛错，不占用重发间隔）
    const code = String(randomInt(100000, 999999));
    await this.mailService.sendRegisterCode(normalized, code);
    this.codeStore.set(normalized, {
      code,
      expiresAt: now + EmailAuthService.CODE_TTL_MS,
      sentAt: now,
    });
  }

  private verifyCode(email: string, code: string): boolean {
    const entry = this.codeStore.get(email);
    if (!entry) return false;
    if (Date.now() > entry.expiresAt) {
      this.codeStore.delete(email);
      return false;
    }
    return entry.code === code;
  }

  /* ==================== 注册 ==================== */

  async register(dto: RegisterDto, res: Response) {
    const email = dto.email.trim().toLowerCase();

    const existed = await this.prisma.emailUser.findUnique({ where: { email } });
    if (existed) {
      throw new BadRequestException('该邮箱已注册，请直接登录');
    }

    if (!this.verifyCode(email, dto.code)) {
      throw new BadRequestException('验证码错误或已过期');
    }
    this.codeStore.delete(email);

    const user = await this.prisma.emailUser.create({
      data: {
        email,
        password: encryptSecret(dto.password),
        nickname: dto.nickname.trim(),
        homepageUrl: dto.homepageUrl?.trim() || null,
        avatarUrl: dto.avatarUrl?.trim() || null,
        lastLoginAt: new Date(),
      },
    });

    this.logger.log(`新用户注册: ${email}`);
    return this.issueToken(user, res);
  }

  /* ==================== 登录 ==================== */

  async login(dto: LoginDto, res: Response) {
    const email = dto.email.trim().toLowerCase();
    const user = await this.prisma.emailUser.findUnique({ where: { email } });

    // 不区分「邮箱不存在」与「密码错误」，避免登录入口枚举
    if (!user || user.status !== 'active') {
      throw new UnauthorizedException('邮箱或密码错误');
    }

    let passwordOk = false;
    try {
      passwordOk = decryptSecret(user.password) === dto.password;
    } catch {
      // 密文损坏（如密钥变更）视为密码错误，不暴露内部细节
      this.logger.error(`密码解密失败: ${email}`);
      passwordOk = false;
    }
    if (!passwordOk) {
      throw new UnauthorizedException('邮箱或密码错误');
    }

    await this.prisma.emailUser.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    return this.issueToken(user, res);
  }

  /* ==================== 找回密码 ==================== */

  async forgotPassword(email: string, clientIp: string): Promise<void> {
    const normalized = email.trim().toLowerCase();
    const now = Date.now();

    // 限流 1：同邮箱 60s 一次
    const lastAt = this.forgotEmailAt.get(normalized);
    if (lastAt && now - lastAt < EmailAuthService.FORGOT_EMAIL_INTERVAL_MS) {
      const wait = Math.ceil((EmailAuthService.FORGOT_EMAIL_INTERVAL_MS - (now - lastAt)) / 1000);
      throw new HttpException(`操作过于频繁，请 ${wait} 秒后再试`, HttpStatus.TOO_MANY_REQUESTS);
    }

    // 限流 2：同 IP 每小时上限
    const ipKey = clientIp || 'unknown';
    const log = (this.forgotIpLog.get(ipKey) || []).filter(
      (ts) => now - ts < EmailAuthService.FORGOT_IP_WINDOW_MS,
    );
    if (log.length >= EmailAuthService.FORGOT_IP_HOURLY_LIMIT) {
      throw new HttpException('操作过于频繁，请稍后再试', HttpStatus.TOO_MANY_REQUESTS);
    }

    const user = await this.prisma.emailUser.findUnique({ where: { email: normalized } });
    if (!user) {
      // 产品明确要求：未注册邮箱给出注册引导（已知邮箱枚举风险，接受）
      throw new BadRequestException('当前邮箱未注册，请进行注册');
    }

    const password = decryptSecret(user.password);
    await this.mailService.sendPassword(normalized, user.nickname, password);

    // 发送成功后记录限流
    this.forgotEmailAt.set(normalized, now);
    log.push(now);
    this.forgotIpLog.set(ipKey, log);
  }

  /* ==================== 通用 ==================== */

  /** 签发 14 天 JWT 并写入 httpOnly cookie，返回脱敏用户信息 */
  private issueToken(
    user: {
      id: string;
      email: string;
      nickname: string;
      homepageUrl: string | null;
      avatarUrl: string | null;
    },
    res: Response,
  ) {
    const token = this.jwtService.sign({ sub: user.id, role: 'user' });
    res.cookie(USER_TOKEN_COOKIE, token, {
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
      maxAge: USER_TOKEN_MAX_AGE_MS,
      // 生产 HTTPS 环境可设 secure；当前经 Nginx 反代混合部署，默认关闭
    });
    return {
      user: {
        id: user.id,
        email: user.email,
        nickname: user.nickname,
        homepageUrl: user.homepageUrl,
        avatarUrl: user.avatarUrl,
      },
    };
  }

  /** me：按 id 取用户（供 user-jwt 策略与 me 接口复用） */
  async getProfile(userId: string) {
    const user = await this.prisma.emailUser.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        nickname: true,
        homepageUrl: true,
        avatarUrl: true,
        status: true,
        lastLoginAt: true,
        createdAt: true,
      },
    });
    if (!user || user.status !== 'active') {
      throw new UnauthorizedException();
    }
    const { status: _status, ...profile } = user;
    return profile;
  }
}
