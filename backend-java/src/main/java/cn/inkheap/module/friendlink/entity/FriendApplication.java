package cn.inkheap.module.friendlink.entity;

import com.mybatisflex.annotation.Column;
import com.mybatisflex.annotation.Id;
import com.mybatisflex.annotation.KeyType;
import com.mybatisflex.annotation.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;

/**
 * 友链加入申请（friend_applications）：pending / approved / rejected。
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Table("friend_applications")
public class FriendApplication {

    @Id(keyType = KeyType.None)
    private String id;

    private String name;

    private String email;

    private String url;

    private String avatar;

    @Column("type")
    private String type;

    private String message;

    private String status;

    private String remark;

    private String linkId;

    private Instant handledAt;

    private Instant createdAt;

    private Instant updatedAt;
}
