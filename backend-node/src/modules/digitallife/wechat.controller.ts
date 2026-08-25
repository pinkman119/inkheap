import { Body, Controller, Post } from '@nestjs/common';
import { WechatService } from './wechat.service';
import { MockLoginDto } from './dto/digital-life.dto';

/**
 * 微信登录入口（公开）。
 * Mock 阶段：POST /api/public/wechat/mock-login
 * 真实扫码（备案后）：新增 POST /api/public/wechat/login（code 换 openid），响应结构一致。
 */
@Controller('public/wechat')
export class WechatController {
  constructor(private readonly wechatService: WechatService) {}

  @Post('mock-login')
  mockLogin(@Body() dto: MockLoginDto) {
    return this.wechatService.mockLogin(dto.openid);
  }
}
