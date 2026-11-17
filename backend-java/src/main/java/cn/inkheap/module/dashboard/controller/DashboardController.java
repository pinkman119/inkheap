package cn.inkheap.module.dashboard.controller;

import cn.inkheap.common.auth.Auth;
import cn.inkheap.common.constant.ApiPrefix;
import cn.inkheap.common.response.BaseResponse;
import cn.inkheap.common.response.ItemsVO;
import cn.inkheap.common.response.PageVO;
import cn.inkheap.common.response.ResultUtils;
import cn.inkheap.module.dashboard.service.DashboardService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.annotation.Resource;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

/**
 * 后台仪表盘接口。
 */
@Tag(name = "仪表盘（后台）")
@Auth
@RestController
@RequestMapping(ApiPrefix.ADMIN + "/dashboard")
public class DashboardController {

    @Resource
    private DashboardService dashboardService;

    @Operation(summary = "四项指标", description = "声明返回 BaseResponse<Map>，实际响应体为 {messages,reads,visits,users}")
    @GetMapping("stats")
    public BaseResponse<Map<String, Object>> getStats() {
        return ResultUtils.ok(dashboardService.getStats());
    }

    @Operation(summary = "文章阅读量排行", description = "声明返回 BaseResponse<Map>，实际响应体为 {items,totalArticles,totalReads}")
    @GetMapping("article-ranking")
    public BaseResponse<Map<String, Object>> getArticleRanking() {
        return ResultUtils.ok(dashboardService.getArticleRanking());
    }

    @Operation(summary = "访问量趋势", description = "period=7|30|90|all；声明返回 BaseResponse<Map>，实际响应体为 {series,sum,peak}")
    @GetMapping("visits-trend")
    public BaseResponse<Map<String, Object>> getVisitsTrend(@RequestParam(defaultValue = "30") String period) {
        return ResultUtils.ok(dashboardService.getVisitsTrend(period));
    }

    @Operation(summary = "访问明细列表", description = "声明返回 BaseResponse<PageVO>，实际响应体为 {items,total,page,pageSize}")
    @GetMapping("visit-logs")
    public BaseResponse<PageVO<Map<String, Object>>> getVisitLogs(@RequestParam(defaultValue = "1") String page,
                                                                 @RequestParam(defaultValue = "20") String pageSize) {
        return ResultUtils.ok(dashboardService.getVisitLogs(Integer.parseInt(page), Integer.parseInt(pageSize)));
    }

    @Operation(summary = "注册用户列表", description = "声明返回 BaseResponse<ItemsVO>，实际响应体为 {items,total}")
    @GetMapping("users")
    public BaseResponse<ItemsVO<Map<String, Object>>> getUsers() {
        return ResultUtils.ok(dashboardService.getUsers());
    }
}
