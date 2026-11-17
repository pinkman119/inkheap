import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { EmailAuthService } from './email-auth.service';
import { EmailAuthPublicController } from './email-auth-public.controller';
import { EmailAuthUserController } from './email-auth-user.controller';

/**
 * 邮箱认证模块：注册（验证码）/ 登录 / 找回密码 / me / 登出。
 *
 * UserJwtStrategy 在 DigitalLifeModule 注册（passport 全局策略表），本模块不重复注册；
 * JwtModule 与 AuthModule 同 secret，独立注册以解耦，登录态签发 14 天。
 */
@Module({
  imports: [
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'inkheap-admin-secret-key-2026',
      signOptions: { expiresIn: '14d' },
    }),
  ],
  controllers: [EmailAuthPublicController, EmailAuthUserController],
  providers: [EmailAuthService],
  exports: [EmailAuthService],
})
export class EmailAuthModule {}
