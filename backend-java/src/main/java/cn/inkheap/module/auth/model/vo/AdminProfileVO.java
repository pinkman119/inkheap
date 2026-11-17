package cn.inkheap.module.auth.model.vo;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;

/**
 * 管理员公开信息（永不包含 password）。
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AdminProfileVO {

    private String id;

    private String username;

    private String role;

    private String avatar;

    private String remark;

    private String status;

    private Instant lastLoginAt;

    private Instant createdAt;
}
