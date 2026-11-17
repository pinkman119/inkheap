package cn.inkheap.module.auth.entity;

import com.mybatisflex.annotation.Id;
import com.mybatisflex.annotation.KeyType;
import com.mybatisflex.annotation.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;

/**
 * 管理端用户（admin_users）。
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Table("admin_users")
public class AdminUser {

    @Id(keyType = KeyType.None)
    private String id;

    private String username;

    private String password;

    private String role;

    private String avatar;

    private Instant createdAt;

    private Instant updatedAt;

    private Instant lastLoginAt;

    private String remark;

    private String status;
}
