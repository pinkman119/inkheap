package cn.inkheap.module.adminuser.model.dto;

import lombok.Data;

/**
 * 管理员失效 / 启用请求。
 */
@Data
public class UpdateStatusRequest {

    /** active / disabled */
    private String status;
}
