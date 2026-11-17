import { Global, Module } from '@nestjs/common';
import { MailService } from './mail.service';

/**
 * 邮件发送共享模块（全局）：注册验证码 / 密码找回。
 * 通过 @Global() 导出，email-auth 等模块直接注入 MailService。
 */
@Global()
@Module({
  providers: [MailService],
  exports: [MailService],
})
export class MailModule {}
