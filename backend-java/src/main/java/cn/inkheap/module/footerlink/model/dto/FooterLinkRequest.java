package cn.inkheap.module.footerlink.model.dto;

import lombok.Data;

/**
 * 页脚链接新增 / 更新请求（更新时为空字段表示不改动）。
 */
@Data
public class FooterLinkRequest {

    /** nav / ext / social */
    private String type;

    private Integer mode;

    private String label;

    private String url;

    private String icon;

    private String svg;

    private Integer sortOrder;
}
