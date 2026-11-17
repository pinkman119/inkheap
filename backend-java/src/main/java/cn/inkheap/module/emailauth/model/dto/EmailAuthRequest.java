package cn.inkheap.module.emailauth.model.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

/**
 * 访客邮箱账号相关请求（注册 / 登录 / 验证码 / 找回密码共用一个 DTO）。
 */
@Data
public class EmailAuthRequest {

    @NotBlank(message = "请填写邮箱")
    private String email;

    private String password;

    private String code;

    private String nickname;

    private String homepageUrl;

    private String avatarUrl;
}
