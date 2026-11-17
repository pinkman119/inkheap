import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { UserJwtStrategy } from '../auth/user-jwt.strategy';
import { ChatController } from './chat.controller';
import { ChatService } from './chat.service';
import { ChatAdminService } from './chat-admin.service';
import { ModelConfigService } from './model-config.service';
import { PersonaService } from './persona.service';
import { VectorService } from './vector.service';
import { TrainingService } from './training.service';
import { RateLimitService } from './rate-limit.service';
import { DigitalLifeAdminController } from './digital-life-admin.controller';

/**
 * 数字生命模块：SSE 聊天 + RAG 训练 + 后台管理。
 *
 * UserJwtStrategy 在本模块注册（passport 全局策略表）；
 * JwtModule 与 AuthModule 同 secret，独立注册以解耦。
 * 访客登录入口已迁移至邮箱认证（email-auth 模块），微信 mock 登录已下线。
 */
@Module({
  imports: [
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'inkheap-admin-secret-key-2026',
      signOptions: { expiresIn: '7d' },
    }),
  ],
  controllers: [
    ChatController,
    DigitalLifeAdminController,
  ],
  providers: [
    UserJwtStrategy,
    ChatService,
    ChatAdminService,
    ModelConfigService,
    PersonaService,
    VectorService,
    TrainingService,
    RateLimitService,
  ],
  // ModelConfigService 对外导出，供文章模块复用「已启用通用模型」调用 LLM（如自动生成摘要）
  exports: [TrainingService, ModelConfigService],
})
export class DigitalLifeModule {}
