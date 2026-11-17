package cn.inkheap.module.siteconfig.model.dto;

import lombok.Data;

/**
 * 站点配置更新请求。
 */
@Data
public class UpdateSiteConfigRequest {

    private String siteUrl;

    private String siteTitle;

    private String siteDescription;

    private String author;
}
