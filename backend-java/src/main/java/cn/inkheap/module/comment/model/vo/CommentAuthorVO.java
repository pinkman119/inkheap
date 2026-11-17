package cn.inkheap.module.comment.model.vo;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * 评论展示态作者信息。
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class CommentAuthorVO {

    private String id;

    private String nickname;

    private String homepageUrl;

    private String avatarUrl;
}
