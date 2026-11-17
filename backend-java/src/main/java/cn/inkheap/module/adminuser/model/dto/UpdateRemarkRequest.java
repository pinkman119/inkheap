package cn.inkheap.module.adminuser.model.dto;

import lombok.Data;

/**
 * 修改备注请求（空字符串表示清空）。
 */
@Data
public class UpdateRemarkRequest {

    private String remark;
}
