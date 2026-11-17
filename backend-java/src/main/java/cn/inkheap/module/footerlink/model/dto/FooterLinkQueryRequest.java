package cn.inkheap.module.footerlink.model.dto;

import cn.inkheap.common.model.PageQueryRequest;
import lombok.Data;
import lombok.EqualsAndHashCode;

/**
 * 页脚链接查询参数。
 */
@Data
@EqualsAndHashCode(callSuper = true)
public class FooterLinkQueryRequest extends PageQueryRequest {

    /** 主键 */
    private String id;

    /** 类型：nav / ext / social */
    private String type;

    /** 展示模式：0 全模式 / 1 工作 / 2 生活 */
    private Integer mode;

    /** 文案（模糊匹配） */
    private String label;
}
