package cn.inkheap.module.category.controller;

import cn.inkheap.common.constant.ApiPrefix;
import cn.inkheap.common.response.BaseResponse;
import cn.inkheap.common.response.ResultUtils;
import cn.inkheap.module.category.model.dto.CategoryQueryRequest;
import cn.inkheap.module.category.model.vo.CategoryVO;
import cn.inkheap.module.category.service.CategoryService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.annotation.Resource;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/**
 * 分类公开接口（前台知识库页）。
 */
@Tag(name = "分类（公开）")
@RestController
@RequestMapping(ApiPrefix.V1 + "/categories")
public class CategoryPublicController {

    @Resource
    private CategoryService categoryService;

    @Operation(summary = "分类树", description = "声明返回 BaseResponse<List<CategoryVO>>，实际响应体为裸数组")
    @GetMapping("tree")
    public BaseResponse<List<CategoryVO>> findTree() {
        return ResultUtils.ok(categoryService.findTree());
    }

    @Operation(summary = "分类列表", description = "声明返回 BaseResponse<List<CategoryVO>>，实际响应体为裸数组")
    @GetMapping
    public BaseResponse<List<CategoryVO>> findAll(CategoryQueryRequest request) {
        return ResultUtils.ok(categoryService.findAll(request));
    }
}
