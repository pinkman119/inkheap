package cn.inkheap.module.friendlink.model.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

/**
 * 前台友链加入申请。
 */
@Data
public class FriendApplicationCreateRequest {

    @NotBlank(message = "请填写站点名称")
    private String name;

    @NotBlank(message = "请填写邮箱")
    private String email;

    @NotBlank(message = "请填写站点地址")
    private String url;

    private String avatar;

    private String type;

    private String message;
}
