package cn.inkheap.module.emailauth.entity;

import com.mybatisflex.annotation.Id;
import com.mybatisflex.annotation.KeyType;
import com.mybatisflex.annotation.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;

/**
 * 前台访客账号（email_users）。password 存 AES-256-GCM 密文，支持找回密码发明文。
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Table("email_users")
public class EmailUser {

    @Id(keyType = KeyType.None)
    private String id;

    private String email;

    private String password;

    private String nickname;

    private String homepageUrl;

    private String avatarUrl;

    private String status;

    private Instant lastLoginAt;

    private Instant createdAt;

    private Instant updatedAt;
}
