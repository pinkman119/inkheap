import { Body, Controller, Get, HttpCode, Post, Query, Req, UseGuards } from '@nestjs/common';
import { UserJwtAuthGuard } from '../auth/user-jwt.guard';
import { CommentService } from './comment.service';
import { CreateCommentDto } from './dto/comment.dto';
import type { CommentTargetType } from './dto/comment.dto';

/**
 * 前台评论接口。
 * GET  /api/public/comments —— 评论列表（公开可读，无需登录）
 * POST /api/user/comments   —— 发表评论（访客 JWT 鉴权）
 */
@Controller()
export class CommentController {
  constructor(private readonly commentService: CommentService) {}

  @Get('public/comments')
  async list(
    @Query('targetType') targetType: CommentTargetType,
    @Query('targetId') targetId: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.commentService.list(
      targetType,
      targetId,
      page ? Number(page) : 1,
      pageSize ? Number(pageSize) : 10,
    );
  }

  @HttpCode(200)
  @UseGuards(UserJwtAuthGuard)
  @Post('user/comments')
  async create(@Req() req: any, @Body() dto: CreateCommentDto) {
    // 站点根地址：回复通知邮件拼跳转链接的兜底（SiteConfig.siteUrl 未配置时使用）。
    // main.ts 已 trust proxy，Nginx 反代下 req.protocol/host 取自 X-Forwarded-*。
    const baseUrl = `${req.protocol}://${req.get('host') ?? ''}`;
    return this.commentService.create(req.user.id, dto, baseUrl);
  }
}
