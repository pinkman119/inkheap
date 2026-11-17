package cn.inkheap.module.comment.entity;

import com.mybatisflex.annotation.Id;
import com.mybatisflex.annotation.KeyType;
import com.mybatisflex.annotation.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;

/**
 * 评论（comments）：一层盖楼，parentId 非空时必须指向同目标的顶层评论。
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Table("comments")
public class Comment {

    @Id(keyType = KeyType.None)
    private String id;

    private String targetType;

    private String targetId;

    private String userId;

    private String content;

    private String parentId;

    private String replyToUserId;

    private Instant createdAt;
}
