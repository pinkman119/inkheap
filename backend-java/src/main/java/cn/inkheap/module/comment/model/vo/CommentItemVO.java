package cn.inkheap.module.comment.model.vo;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.util.List;

/**
 * 前台单条评论（二层评论内嵌在顶层 replies 中）。
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@JsonInclude(JsonInclude.Include.NON_NULL)
public class CommentItemVO {

    private String id;

    private String content;

    private Instant createdAt;

    private CommentAuthorVO author;

    /** 二层评论：被回复人昵称 */
    private String replyToNickname;

    /** 仅顶层有 replies */
    private List<CommentItemVO> replies;
}
