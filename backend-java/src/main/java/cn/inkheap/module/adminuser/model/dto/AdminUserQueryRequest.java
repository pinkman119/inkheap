package cn.inkheap.module.adminuser.model.dto;

import cn.inkheap.common.model.PageQueryRequest;
import lombok.Data;
import lombok.EqualsAndHashCode;

/**
 * 管理员查询参数。
 */
@Data
@EqualsAndHashCode(callSuper = true)
public class AdminUserQueryRequest extends PageQueryRequest {

    /** 主键 */
    private String id;

    /** 登录账号（模糊匹配） */
    private String username;

    /** 状态：active / disabled */
    private String status;

    /** 角色 */
    private String role;
}
