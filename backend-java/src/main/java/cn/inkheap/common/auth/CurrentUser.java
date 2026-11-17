package cn.inkheap.common.auth;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * 当前登录主体（管理员或访客）。
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class CurrentUser {

    private String id;

    private String username;

    /** admin / user，与原 Node token payload 保持一致 */
    private String role;

    public boolean isAdmin() {
        return !"user".equals(role);
    }
}
