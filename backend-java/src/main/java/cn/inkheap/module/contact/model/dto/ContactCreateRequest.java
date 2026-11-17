package cn.inkheap.module.contact.model.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

/**
 * 前台来信提交请求。
 */
@Data
public class ContactCreateRequest {

    private String name;

    private String email;

    private String phone;

    private String subject;

    private String contact;

    @NotBlank(message = "留言内容不能为空")
    private String message;
}
