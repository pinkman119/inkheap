package cn.inkheap.module.article.controller;

import cn.inkheap.common.constant.ApiPrefix;
import cn.inkheap.common.response.BaseResponse;
import cn.inkheap.common.response.PageVO;
import cn.inkheap.common.response.ResultUtils;
import cn.inkheap.common.util.IpUtils;
import cn.inkheap.module.article.model.dto.ArticleQueryRequest;
import cn.inkheap.module.article.model.vo.ArticleVO;
import cn.inkheap.module.article.service.ArticleService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.annotation.Resource;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * 文章公开接口（前台知识库页，仅返回已发布内容）。
 */
@Tag(name = "文章（公开）")
@RestController
@RequestMapping(ApiPrefix.V1 + "/articles")
public class ArticlePublicController {

    @Resource
    private ArticleService articleService;

    @Operation(summary = "文章列表", description = "仅返回已发布的知识库文章；声明返回 BaseResponse<PageVO>，实际响应体为 {items,total,page,pageSize,totalPages}")
    @GetMapping
    public BaseResponse<PageVO<ArticleVO>> list(ArticleQueryRequest request) {
        request.setStatus("published");
        return ResultUtils.ok(articleService.findAll(request));
    }

    @Operation(summary = "文章详情（按 slug）", description = "404 文案固定为「文章不存在或未发布」；声明返回 BaseResponse<ArticleVO>，实际响应体为 ArticleVO")
    @GetMapping("slug/{slug}")
    public BaseResponse<ArticleVO> detailBySlug(@PathVariable String slug, HttpServletRequest httpRequest) {
        return ResultUtils.ok(articleService.findOneBySlug(slug, IpUtils.getClientIp(httpRequest)));
    }

    @Operation(summary = "首页动态列表", description = "已发布文章按创建时间倒序；声明返回 BaseResponse<PageVO>，实际响应体为 {items,total,page,pageSize,totalPages}")
    @GetMapping("feed")
    public BaseResponse<PageVO<ArticleVO>> feed(ArticleQueryRequest request) {
        return ResultUtils.ok(articleService.findLatestUpdated(request));
    }
}
