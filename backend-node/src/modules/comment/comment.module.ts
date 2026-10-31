import { Module } from '@nestjs/common';
import { CommentController } from './comment.controller';
import { CommentAdminController } from './comment-admin.controller';
import { CommentService } from './comment.service';

/**
 * 评论模块：前台一层盖楼评论（知识库文章 / 小记）+ 后台评论管理。
 * 鉴权分别复用全局注册的 UserJwtStrategy（访客）与 JwtStrategy（管理员）。
 */
@Module({
  controllers: [CommentController, CommentAdminController],
  providers: [CommentService],
})
export class CommentModule {}
