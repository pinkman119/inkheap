package cn.inkheap.module.adminuser.model.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

/**
 * 修改管理员密码请求（改自己时 oldPassword 必填）。
 */
@Data
public class UpdatePasswordRequest {

    private String oldPassword;

    @NotBlank(message = "请输入新密码")
    private String newPassword;
}
