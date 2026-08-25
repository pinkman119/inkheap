import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { UserJwtStrategy } from '../auth/user-jwt.strategy';
import { WechatController } from './wechat.controller';
import { WechatService } from './wechat.service';
import { ChatController } from './chat.controller';
import { ChatService } from './chat.service';
import { ModelConfigService } from './model-config.service';
import { PersonaService } from './persona.service';
import { VectorService } from './vector.service';
import { TrainingService } from './training.service';
import { RateLimitService } from './rate-limit.service';
import { DigitalLifeAdminController } from './digital-life-admin.controller';

/**
 * 数字生命模块：Mock 微信登录 + SSE 聊天 + RAG 训练 + 后台管理。
 *
 * UserJwtStrategy 在本模块注册（passport 全局策略表）；
 * JwtModule 与 AuthModule 同 secret，独立注册以解耦。
 */
@Module({
  imports: [
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'inkheap-admin-secret-key-2026',
      signOptions: { expiresIn: '7d' },
    }),
  ],
  controllers: [
    WechatController,
    ChatController,
    DigitalLifeAdminController,
  ],
  providers: [
    UserJwtStrategy,
    WechatService,
    ChatService,
    ModelConfigService,
    PersonaService,
    VectorService,
    TrainingService,
    RateLimitService,
  ],
  exports: [TrainingService],
})
export class DigitalLifeModule {}
