package cn.inkheap.module.homepage.controller;

import cn.inkheap.common.constant.ApiPrefix;
import cn.inkheap.common.response.BaseResponse;
import cn.inkheap.common.response.ResultUtils;
import cn.inkheap.module.homepage.model.vo.HomePageVO;
import cn.inkheap.module.homepage.service.HomePageService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.annotation.Resource;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * 首页配置公开接口（前台首页 / 健康检查）。
 */
@Tag(name = "首页配置（公开）")
@RestController
@RequestMapping(ApiPrefix.PUBLIC + "/home-page")
public class HomePagePublicController {

    @Resource
    private HomePageService homePageService;

    @Operation(summary = "获取首页配置", description = "声明返回 BaseResponse<HomePageVO>，实际响应体为 HomePageVO")
    @GetMapping
    public BaseResponse<HomePageVO> findOne() {
        return ResultUtils.ok(homePageService.findOne());
    }
}
