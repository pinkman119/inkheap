package cn.inkheap.module.footerlink.controller;

import cn.inkheap.common.auth.Auth;
import cn.inkheap.common.constant.ApiPrefix;
import cn.inkheap.common.constant.LogModuleEnum;
import cn.inkheap.common.log.Log;
import cn.inkheap.common.response.BaseResponse;
import cn.inkheap.common.response.ResultUtils;
import cn.inkheap.module.footerlink.entity.FooterConfig;
import cn.inkheap.module.footerlink.model.dto.UpdateFooterConfigRequest;
import cn.inkheap.module.footerlink.service.FooterConfigService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.annotation.Resource;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * 页脚备案信息管理接口（后台）。
 */
@Tag(name = "页脚备案（后台）")
@Auth
@RestController
@RequestMapping(ApiPrefix.ADMIN + "/footer-config")
public class FooterConfigAdminController {

    @Resource
    private FooterConfigService footerConfigService;

    @Operation(summary = "获取页脚备案信息", description = "声明返回 BaseResponse<FooterConfig>，实际响应体为 FooterConfig")
    @GetMapping
    public BaseResponse<FooterConfig> findOne() {
        return ResultUtils.ok(footerConfigService.findOne());
    }

    @Operation(summary = "更新页脚备案信息", description = "声明返回 BaseResponse<FooterConfig>，实际响应体为 FooterConfig")
    @PutMapping
    @Log(module = LogModuleEnum.FOOTER, description = "更新页脚备案信息")
    public BaseResponse<FooterConfig> update(@RequestBody UpdateFooterConfigRequest request) {
        return ResultUtils.ok(footerConfigService.update(request));
    }
}
