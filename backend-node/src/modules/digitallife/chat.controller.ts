import { Body, Controller, Get, HttpCode, Post, Query, Req, Res, UseGuards } from '@nestjs/common';
import type { Response } from 'express';
import { UserJwtAuthGuard } from '../auth/user-jwt.guard';
import { ChatService } from './chat.service';
import { RateLimitService } from './rate-limit.service';
import { ModelConfigService } from './model-config.service';
import { ChatDto } from './dto/digital-life.dto';

/**
 * 数字生命聊天接口（访客 JWT 鉴权）。
 * GET   /api/user/digital-life/models —— 可选「通用」模型列表（聊天页下拉）
 * POST  /api/user/digital-life/chat —— SSE 流式回复
 * GET   /api/user/digital-life/messages —— 历史消息（最近 100 条，时间正序）
 */
@Controller('user/digital-life')
@UseGuards(UserJwtAuthGuard)
export class ChatController {
  constructor(
    private readonly chatService: ChatService,
    private readonly rateLimitService: RateLimitService,
    private readonly modelConfigService: ModelConfigService,
  ) {}

  @Get('models')
  async getModels() {
    const items = await this.modelConfigService.listGeneralModels();
    return { items };
  }

  @Get('messages')
  async getMessages(@Req() req: any, @Query('sessionId') sessionId?: string) {
    const list = await this.chatService.getHistory(req.user.id, sessionId || undefined, 100);
    return { items: list };
  }

  @HttpCode(200)
  @Post('chat')
  async chat(@Req() req: any, @Body() dto: ChatDto, @Res() res: Response) {
    const content = (dto.content || '').trim();
    if (!content) {
      res.status(400).json({ statusCode: 400, message: '消息内容不能为空' });
      return;
    }

    // 1. 令牌桶限流：超限直接 429 JSON（不进入 SSE、不调用大模型）
    const limit = await this.rateLimitService.consume(req.user.id);
    if (!limit.allowed) {
      res.status(429).json({
        statusCode: 429,
        message: `提问过于频繁，请等待 ${limit.retryAfterSeconds} 秒后再试`,
        retryAfterSeconds: limit.retryAfterSeconds,
      });
      return;
    }

    // 2. 模型预检查：无可用模型（未启用/未配 Key）时 409 JSON（必须在开启 SSE 之前）
    await this.modelConfigService.ensureActiveModel(dto.modelId);

    // 2. 开启 SSE 流
    res.status(200);
    res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    // Nginx 反代不缓冲（保障逐段送达）
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders();

    const writeEvent = (event: string, data: unknown) => {
      res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
    };

    // 客户端断开时标记（避免继续写入）
    let closed = false;
    res.on('close', () => {
      closed = true;
    });

    try {
      await this.chatService.run(req.user.id, dto.sessionId || undefined, content, {
        modelId: dto.modelId,
        onDelta: (text) => {
          if (!closed) writeEvent('delta', { text });
        },
        onDone: (messageId, full) => {
          if (!closed) writeEvent('done', { messageId, content: full });
          res.end();
        },
        onError: (message) => {
          if (!closed) writeEvent('error', { message });
          res.end();
        },
      });
    } catch (e: any) {
      // run() 内部异常兜底：转为 error 事件并结束流
      if (!closed) {
        writeEvent('error', { message: e?.message || '生成回复失败，请稍后再试' });
      }
      if (!res.writableEnded) {
        res.end();
      }
    }
  }
}
