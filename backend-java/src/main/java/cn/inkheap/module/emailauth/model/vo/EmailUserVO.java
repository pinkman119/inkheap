package cn.inkheap.module.emailauth.model.vo;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;

/**
 * 访客账号信息（不含密码）。
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class EmailUserVO {

    private String id;

    private String email;

    private String nickname;

    private String homepageUrl;

    private String avatarUrl;

    private Instant lastLoginAt;

    private Instant createdAt;
}
