package cn.inkheap.module.adminuser.model.dto;

import lombok.Data;

/**
 * 修改头像请求（空字符串表示移除）。
 */
@Data
public class UpdateAvatarRequest {

    private String avatar;
}
