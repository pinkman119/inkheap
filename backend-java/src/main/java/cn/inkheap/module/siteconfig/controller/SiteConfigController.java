package cn.inkheap.module.siteconfig.controller;

import cn.inkheap.common.auth.Auth;
import cn.inkheap.common.constant.ApiPrefix;
import cn.inkheap.common.constant.LogModuleEnum;
import cn.inkheap.common.log.Log;
import cn.inkheap.common.response.BaseResponse;
import cn.inkheap.common.response.ResultUtils;
import cn.inkheap.module.siteconfig.entity.SiteConfig;
import cn.inkheap.module.siteconfig.model.dto.UpdateSiteConfigRequest;
import cn.inkheap.module.siteconfig.service.SiteConfigService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.annotation.Resource;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * 站点设置（仅后台可读写，站点信息只通过 RSS 对外暴露）。
 */
@Tag(name = "站点设置（后台）")
@Auth
@RestController
@RequestMapping(ApiPrefix.ADMIN + "/site-config")
public class SiteConfigController {

    @Resource
    private SiteConfigService siteConfigService;

    @Operation(summary = "获取站点设置", description = "声明返回 BaseResponse<SiteConfig>，实际响应体为 SiteConfig")
    @GetMapping
    public BaseResponse<SiteConfig> findOne() {
        return ResultUtils.ok(siteConfigService.findOne());
    }

    @Operation(summary = "更新站点设置", description = "声明返回 BaseResponse<SiteConfig>，实际响应体为 SiteConfig")
    @PutMapping
    @Log(module = LogModuleEnum.SITE_CONFIG, description = "更新站点设置")
    public BaseResponse<SiteConfig> update(@RequestBody UpdateSiteConfigRequest request) {
        return ResultUtils.ok(siteConfigService.update(request));
    }
}
