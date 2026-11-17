import { IsIn, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

/**
 * 评论挂载的目标类型（与 ContentView 口径一致）：
 * article = 知识库文章，note = 小记，friends = 邻居留言板（虚拟目标，固定 ID）
 */
export const COMMENT_TARGET_TYPES = ['article', 'note', 'friends'] as const;
export type CommentTargetType = (typeof COMMENT_TARGET_TYPES)[number];

/** 邻居留言板（/#/friends）的固定评论目标 ID：页面级唯一留言板，无对应数据库实体 */
export const FRIENDS_BOARD_TARGET_ID = '00000000-0000-4000-8000-0000000000fd';

/** 发表评论：targetType + targetId + content；回复时带 parentId（必须指向顶层评论） */
export class CreateCommentDto {
  @IsIn(COMMENT_TARGET_TYPES, { message: '评论目标类型不合法' })
  targetType!: CommentTargetType;

  @IsUUID(undefined, { message: '评论目标 ID 不合法' })
  targetId!: string;

  @IsString()
  @MaxLength(2000, { message: '评论内容过长（最多 2000 字）' })
  content!: string;

  /** 回复的目标顶层评论 ID；不传则为顶层评论 */
  @IsOptional()
  @IsUUID(undefined, { message: '父评论 ID 不合法' })
  parentId?: string;

  /** 被回复的评论 ID（用于「回复 @昵称」展示）：回复某条二层评论时与其顶层对齐 */
  @IsOptional()
  @IsUUID(undefined, { message: '被回复评论 ID 不合法' })
  replyToId?: string;
}
