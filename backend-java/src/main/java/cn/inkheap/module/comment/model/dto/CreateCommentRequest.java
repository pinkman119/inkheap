package cn.inkheap.module.comment.model.dto;

import lombok.Data;

/**
 * 发表评论 / 回复请求。
 */
@Data
public class CreateCommentRequest {

    /** article / note / friends */
    private String targetType;

    private String targetId;

    private String content;

    /** 回复的目标顶层评论 id；不传则为顶层评论 */
    private String parentId;

    /** 被回复的评论 id（回复某条二层评论时与其顶层对齐） */
    private String replyToId;
}
