package cn.inkheap.module.footerlink.service;

import cn.inkheap.module.footerlink.entity.FooterConfig;
import cn.inkheap.module.footerlink.model.dto.UpdateFooterConfigRequest;

/**
 * 页脚备案信息服务。
 */
public interface FooterConfigService {

    /**
     * 获取配置（公开）。记录不存在时返回兜底值（默认备案号 + 工信部地址）。
     *
     * @return 配置
     */
    FooterConfig findOne();

    /**
     * 更新配置（后台）。记录不存在时自动创建。
     *
     * @param request 请求
     * @return 更新后的配置
     */
    FooterConfig update(UpdateFooterConfigRequest request);
}
