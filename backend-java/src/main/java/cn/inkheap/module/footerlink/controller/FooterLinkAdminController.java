package cn.inkheap.module.footerlink.controller;

import cn.inkheap.common.auth.Auth;
import cn.inkheap.common.constant.ApiPrefix;
import cn.inkheap.common.constant.LogModuleEnum;
import cn.inkheap.common.log.Log;
import cn.inkheap.common.response.BaseResponse;
import cn.inkheap.common.response.ResultUtils;
import cn.inkheap.module.footerlink.entity.FooterLink;
import cn.inkheap.module.footerlink.model.dto.FooterLinkQueryRequest;
import cn.inkheap.module.footerlink.model.dto.FooterLinkRequest;
import cn.inkheap.module.footerlink.model.dto.MoveFooterLinkRequest;
import cn.inkheap.module.footerlink.service.FooterLinkService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.annotation.Resource;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

/**
 * 页脚链接管理接口（后台）。
 */
@Tag(name = "页脚链接（后台）")
@Auth
@RestController
@RequestMapping(ApiPrefix.ADMIN + "/footer-links")
public class FooterLinkAdminController {

    @Resource
    private FooterLinkService footerLinkService;

    @Operation(summary = "页脚链接列表", description = "声明返回 BaseResponse<List<FooterLink>>，实际响应体为裸数组")
    @GetMapping
    public BaseResponse<List<FooterLink>> findAll(FooterLinkQueryRequest request) {
        return ResultUtils.ok(footerLinkService.findAll(request));
    }

    @Operation(summary = "页脚链接详情", description = "声明返回 BaseResponse<FooterLink>，实际响应体为 FooterLink")
    @GetMapping("{id}")
    public BaseResponse<FooterLink> findOne(@PathVariable String id) {
        return ResultUtils.ok(footerLinkService.findOne(id));
    }

    @Operation(summary = "新增页脚链接", description = "声明返回 BaseResponse<FooterLink>，实际响应体为 FooterLink")
    @PostMapping
    @Log(module = LogModuleEnum.FOOTER, description = "新增页脚链接")
    public BaseResponse<FooterLink> create(@RequestBody FooterLinkRequest request) {
        return ResultUtils.ok(footerLinkService.create(request));
    }

    @Operation(summary = "更新页脚链接", description = "声明返回 BaseResponse<FooterLink>，实际响应体为 FooterLink")
    @PutMapping("{id}")
    @Log(module = LogModuleEnum.FOOTER, description = "更新页脚链接")
    public BaseResponse<FooterLink> update(@PathVariable String id, @RequestBody FooterLinkRequest request) {
        return ResultUtils.ok(footerLinkService.update(id, request));
    }

    @Operation(summary = "删除页脚链接", description = "声明返回 BaseResponse<Map>，实际响应体为 {message:'删除成功'}")
    @DeleteMapping("{id}")
    @Log(module = LogModuleEnum.FOOTER, description = "删除页脚链接")
    public BaseResponse<Map<String, Object>> remove(@PathVariable String id) {
        return ResultUtils.ok(footerLinkService.remove(id));
    }

    @Operation(summary = "上移/下移页脚链接", description = "声明返回 BaseResponse<FooterLink>，实际响应体为 FooterLink")
    @PostMapping("move")
    @Log(module = LogModuleEnum.FOOTER, description = "调整页脚链接顺序")
    public BaseResponse<FooterLink> move(@RequestBody MoveFooterLinkRequest request) {
        return ResultUtils.ok(footerLinkService.move(request));
    }
}
