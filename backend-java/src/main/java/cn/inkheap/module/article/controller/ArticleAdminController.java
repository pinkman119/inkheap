package cn.inkheap.module.article.controller;

import cn.inkheap.common.auth.Auth;
import cn.inkheap.common.constant.ApiPrefix;
import cn.inkheap.common.constant.LogModuleEnum;
import cn.inkheap.common.log.Log;
import cn.inkheap.common.response.BaseResponse;
import cn.inkheap.common.response.PageVO;
import cn.inkheap.common.response.ResultUtils;
import cn.inkheap.module.article.model.dto.ArticleQueryRequest;
import cn.inkheap.module.article.model.dto.ArticleRequest;
import cn.inkheap.module.article.model.dto.GenerateSummaryRequest;
import cn.inkheap.module.article.model.dto.ReorderArticleRequest;
import cn.inkheap.module.article.model.vo.ArticleVO;
import cn.inkheap.module.article.service.ArticleService;
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

import java.util.Map;

/**
 * 文章管理接口（后台）。注意 status=all 时依然不返回草稿（沿用原实现的反直觉行为）。
 */
@Tag(name = "文章（后台）")
@Auth
@RestController
@RequestMapping(ApiPrefix.ADMIN + "/articles")
public class ArticleAdminController {

    @Resource
    private ArticleService articleService;

    @Operation(summary = "文章列表", description = "status=all 时仍只返回已发布文章（原实现行为）；声明返回 BaseResponse<PageVO>，实际响应体为 {items,total,page,pageSize,totalPages}")
    @GetMapping
    public BaseResponse<PageVO<ArticleVO>> findAll(ArticleQueryRequest request) {
        return ResultUtils.ok(articleService.findAll(request));
    }

    @Operation(summary = "文章详情", description = "声明返回 BaseResponse<ArticleVO>，实际响应体为 ArticleVO")
    @GetMapping("{id}")
    public BaseResponse<ArticleVO> findOne(@PathVariable String id) {
        return ResultUtils.ok(articleService.findOne(id));
    }

    @Operation(summary = "自动生成摘要", description = "无可用模型时 409；声明返回 BaseResponse<Map>，实际响应体为 {summary}")
    @PostMapping("generate-summary")
    @Log(module = LogModuleEnum.ARTICLE, description = "生成文章摘要")
    public BaseResponse<Map<String, Object>> generateSummary(@RequestBody GenerateSummaryRequest request) {
        return ResultUtils.ok(articleService.generateSummary(request.getContent(), request.getTitle()));
    }

    @Operation(summary = "新建文章", description = "声明返回 BaseResponse<ArticleVO>，实际响应体为 ArticleVO")
    @PostMapping
    @Log(module = LogModuleEnum.ARTICLE, description = "新建文章")
    public BaseResponse<ArticleVO> create(@RequestBody ArticleRequest request) {
        return ResultUtils.ok(articleService.create(request));
    }

    @Operation(summary = "批量调整文章顺序", description = "声明返回 BaseResponse<Map>，实际响应体为 {message:'顺序已更新'}")
    @PutMapping("reorder")
    @Log(module = LogModuleEnum.ARTICLE, description = "调整文章顺序")
    public BaseResponse<Map<String, Object>> reorder(@RequestBody ReorderArticleRequest request) {
        return ResultUtils.ok(articleService.reorder(request.getIds()));
    }

    @Operation(summary = "更新文章", description = "声明返回 BaseResponse<ArticleVO>，实际响应体为 ArticleVO")
    @PutMapping("{id}")
    @Log(module = LogModuleEnum.ARTICLE, description = "更新文章")
    public BaseResponse<ArticleVO> update(@PathVariable String id, @RequestBody ArticleRequest request) {
        return ResultUtils.ok(articleService.update(id, request));
    }

    @Operation(summary = "删除文章", description = "声明返回 BaseResponse<Map>，实际响应体为 {message:'删除成功'}")
    @DeleteMapping("{id}")
    @Log(module = LogModuleEnum.ARTICLE, description = "删除文章")
    public BaseResponse<Map<String, Object>> remove(@PathVariable String id) {
        return ResultUtils.ok(articleService.remove(id));
    }
}
