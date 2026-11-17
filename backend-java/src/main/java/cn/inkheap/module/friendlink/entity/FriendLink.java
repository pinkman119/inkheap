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
 * 友链（friend_links）：mode 0=全模式，1=仅工作，2=仅生活。
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Table("friend_links")
public class FriendLink {

    @Id(keyType = KeyType.None)
    private String id;

    private String name;

    private String url;

    private String avatar;

    @Column("desc")
    private String desc;

    private String tag;

    @Column("group")
    private String group;

    private String message;

    private Integer mode;

    private String status;

    private Boolean isSelf;

    private Integer sortOrder;

    private String applicationId;

    private Instant createdAt;

    private Instant updatedAt;
}
