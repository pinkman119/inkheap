import { Controller, Delete, Get, HttpCode, Param, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CommentService } from './comment.service';
import type { CommentTargetType } from './dto/comment.dto';

/**
 * 后台评论管理接口（管理员 JWT 鉴权）。
 * GET    /api/admin/comments       —— 分页列表（可按来源筛选，含来源标题/slug 解析）
 * DELETE /api/admin/comments/:id   —— 删除（顶层连带删除全部回复）
 */
@Controller('admin/comments')
@UseGuards(JwtAuthGuard)
export class CommentAdminController {
  constructor(private readonly commentService: CommentService) {}

  @Get()
  async list(
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('targetType') targetType?: CommentTargetType,
    @Query('userId') userId?: string,
  ) {
    return this.commentService.adminList(
      page ? Number(page) : 1,
      pageSize ? Number(pageSize) : 20,
      targetType || undefined,
      userId || undefined,
    );
  }

  @HttpCode(200)
  @Delete(':id')
  async remove(@Param('id') id: string) {
    return this.commentService.adminDelete(id);
  }
}
