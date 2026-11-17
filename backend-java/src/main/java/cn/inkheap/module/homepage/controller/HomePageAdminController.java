package cn.inkheap.module.homepage.controller;

import cn.inkheap.common.auth.Auth;
import cn.inkheap.common.constant.ApiPrefix;
import cn.inkheap.common.constant.LogModuleEnum;
import cn.inkheap.common.log.Log;
import cn.inkheap.common.response.BaseResponse;
import cn.inkheap.common.response.ResultUtils;
import cn.inkheap.module.homepage.model.dto.UpdateHomePageRequest;
import cn.inkheap.module.homepage.model.vo.HomePageVO;
import cn.inkheap.module.homepage.service.HomePageService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.annotation.Resource;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * 首页配置管理接口。
 */
@Tag(name = "首页配置（后台）")
@Auth
@RestController
@RequestMapping(ApiPrefix.ADMIN + "/home-page")
public class HomePageAdminController {

    @Resource
    private HomePageService homePageService;

    @Operation(summary = "获取首页配置", description = "声明返回 BaseResponse<HomePageVO>，实际响应体为 HomePageVO")
    @GetMapping
    public BaseResponse<HomePageVO> findOne() {
        return ResultUtils.ok(homePageService.findOne());
    }

    @Operation(summary = "更新首页配置", description = "声明返回 BaseResponse<HomePageVO>，实际响应体为 HomePageVO")
    @PutMapping
    @Log(module = LogModuleEnum.HOMEPAGE, description = "更新首页配置")
    public BaseResponse<HomePageVO> update(@RequestBody UpdateHomePageRequest request) {
        return ResultUtils.ok(homePageService.update(request));
    }
}
