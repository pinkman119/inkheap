package cn.inkheap.module.resume.model.dto;

import cn.inkheap.common.model.PageQueryRequest;
import lombok.Data;
import lombok.EqualsAndHashCode;

/**
 * 简历版本查询参数。
 */
@Data
@EqualsAndHashCode(callSuper = true)
public class ResumeQueryRequest extends PageQueryRequest {

    /** 主键 */
    private String id;

    /** 版本名称（模糊匹配） */
    private String name;

    /** 是否生效版本 */
    private Boolean isActive;
}
