package cn.inkheap.module.footerlink.controller;

import cn.inkheap.common.constant.ApiPrefix;
import cn.inkheap.common.response.BaseResponse;
import cn.inkheap.common.response.ResultUtils;
import cn.inkheap.module.footerlink.entity.FooterLink;
import cn.inkheap.module.footerlink.model.dto.FooterLinkQueryRequest;
import cn.inkheap.module.footerlink.service.FooterLinkService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.annotation.Resource;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/**
 * 页脚链接公开接口（前台页脚）。
 */
@Tag(name = "页脚链接（公开）")
@RestController
@RequestMapping(ApiPrefix.PUBLIC + "/footer-links")
public class FooterLinkPublicController {

    @Resource
    private FooterLinkService footerLinkService;

    @Operation(summary = "全部页脚链接", description = "声明返回 BaseResponse<List<FooterLink>>，实际响应体为裸数组")
    @GetMapping
    public BaseResponse<List<FooterLink>> findAll(FooterLinkQueryRequest request) {
        return ResultUtils.ok(footerLinkService.findAll(request));
    }
}
