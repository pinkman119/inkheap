package cn.inkheap.module.siteconfig.service;

import cn.inkheap.module.siteconfig.entity.SiteConfig;
import cn.inkheap.module.siteconfig.model.dto.UpdateSiteConfigRequest;

/**
 * 站点配置服务。
 */
public interface SiteConfigService {

    /**
     * 获取配置。记录不存在时返回兜底值（全空）。
     *
     * @return 配置
     */
    SiteConfig findOne();

    /**
     * 更新配置：siteUrl 去尾斜杠，更新后让 RSS 缓存失效。
     *
     * @param request 请求
     * @return 更新后的配置
     */
    SiteConfig update(UpdateSiteConfigRequest request);
}
