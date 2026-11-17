package cn.inkheap.module.xiaoji.controller;

import cn.inkheap.common.constant.ApiPrefix;
import cn.inkheap.common.response.BaseResponse;
import cn.inkheap.common.response.ResultUtils;
import cn.inkheap.common.util.IpUtils;
import cn.inkheap.module.xiaoji.model.vo.BlogDetailVO;
import cn.inkheap.module.xiaoji.model.vo.BlogVO;
import cn.inkheap.module.xiaoji.service.XiaojiService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.annotation.Resource;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

/**
 * 小记公开接口（无需鉴权）。
 */
@Tag(name = "小记（公开）")
@RestController
@RequestMapping(ApiPrefix.V1 + "/xiaoji")
public class XiaojiPublicController {

    @Resource
    private XiaojiService xiaojiService;

    @Operation(summary = "已发布小记列表", description = "?tag= 按分类筛选；声明返回 BaseResponse<List<BlogVO>>，实际响应体为裸数组")
    @GetMapping
    public BaseResponse<List<BlogVO>> findPublished(@RequestParam(required = false) String tag) {
        return ResultUtils.ok(xiaojiService.findPublished(tag));
    }

    @Operation(summary = "小记统计", description = "声明返回 BaseResponse<Map>，实际响应体为 {total,albums,photos}")
    @GetMapping("stats")
    public BaseResponse<Map<String, Object>> getStats() {
        return ResultUtils.ok(xiaojiService.getStats());
    }

    @Operation(summary = "小记分类列表", description = "声明返回 BaseResponse<List<Map>>，实际响应体为裸数组 [{key,name,count}]")
    @GetMapping("categories")
    public BaseResponse<List<Map<String, Object>>> getCategories() {
        return ResultUtils.ok(xiaojiService.getCategories());
    }

    @Operation(summary = "小记详情（按 slug）", description = "含 prev/next；声明返回 BaseResponse<BlogDetailVO>，实际响应体为 BlogDetailVO")
    @GetMapping("slug/{slug}")
    public BaseResponse<BlogDetailVO> findBySlug(@PathVariable String slug, HttpServletRequest httpRequest) {
        return ResultUtils.ok(xiaojiService.findBySlug(slug, IpUtils.getClientIp(httpRequest)));
    }
}
