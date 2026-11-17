package cn.inkheap.module.comment.model.vo;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;

/**
 * 后台评论列表项：附来源标题/slug 与评论人信息。
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AdminCommentVO {

    private String id;

    private String content;

    private String targetType;

    private String targetId;

    /** 来源已删除时为 null */
    private String sourceTitle;

    private String sourceSlug;

    private String nickname;

    private String email;

    private String avatarUrl;

    private Boolean isReply;

    private String replyToUserId;

    private Instant createdAt;
}
