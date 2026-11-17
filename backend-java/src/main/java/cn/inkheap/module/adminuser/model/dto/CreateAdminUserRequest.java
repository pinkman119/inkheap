package cn.inkheap.module.adminuser.model.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

/**
 * 新增管理员请求。
 */
@Data
public class CreateAdminUserRequest {

    @NotBlank(message = "请输入用户名")
    private String username;

    @NotBlank(message = "请输入密码")
    private String password;

    private String remark;
}
