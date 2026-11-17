package cn.inkheap.module.auth.model.vo;

import lombok.AllArgsConstructor;
import lombok.Data;

/**
 * 管理员登录响应：{accessToken, user:{id,username,role,avatar}}。
 */
@Data
@AllArgsConstructor
public class AdminLoginVO {

    private String accessToken;

    private User user;

    @Data
    @AllArgsConstructor
    public static class User {

        private String id;

        private String username;

        private String role;

        private String avatar;
    }
}
