package cn.inkheap.module.category.controller;

import cn.inkheap.common.auth.Auth;
import cn.inkheap.common.constant.ApiPrefix;
import cn.inkheap.common.constant.LogModuleEnum;
import cn.inkheap.common.log.Log;
import cn.inkheap.common.response.BaseResponse;
import cn.inkheap.common.response.ResultUtils;
import cn.inkheap.module.category.entity.Category;
import cn.inkheap.module.category.model.dto.CategoryQueryRequest;
import cn.inkheap.module.category.model.dto.CategoryRequest;
import cn.inkheap.module.category.model.vo.CategoryVO;
import cn.inkheap.module.category.service.CategoryService;
import cn.inkheap.module.category.service.RecentCategoryService;
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
 * 分类管理接口（后台）。
 */
@Tag(name = "分类（后台）")
@Auth
@RestController
@RequestMapping(ApiPrefix.ADMIN + "/categories")
public class CategoryAdminController {

    @Resource
    private CategoryService categoryService;

    @Resource
    private RecentCategoryService recentCategoryService;

    @Operation(summary = "最近使用的分类", description = "声明返回 BaseResponse<List<Category>>，实际响应体为裸数组")
    @GetMapping("recent")
    public BaseResponse<List<Category>> findRecent() {
        return ResultUtils.ok(recentCategoryService.list());
    }

    @Operation(summary = "分类列表", description = "声明返回 BaseResponse<List<CategoryVO>>，实际响应体为裸数组")
    @GetMapping
    public BaseResponse<List<CategoryVO>> findAll(CategoryQueryRequest request) {
        return ResultUtils.ok(categoryService.findAll(request));
    }

    @Operation(summary = "分类树", description = "声明返回 BaseResponse<List<CategoryVO>>，实际响应体为裸数组")
    @GetMapping("tree")
    public BaseResponse<List<CategoryVO>> findTree() {
        return ResultUtils.ok(categoryService.findTree());
    }

    @Operation(summary = "分类详情", description = "声明返回 BaseResponse<Category>，实际响应体为 Category")
    @GetMapping("{id}")
    public BaseResponse<Category> findOne(@PathVariable String id) {
        return ResultUtils.ok(categoryService.findOne(id));
    }

    @Operation(summary = "新增分类", description = "声明返回 BaseResponse<Category>，实际响应体为 Category")
    @PostMapping
    @Log(module = LogModuleEnum.CATEGORY, description = "新增分类")
    public BaseResponse<Category> create(@RequestBody CategoryRequest request) {
        return ResultUtils.ok(categoryService.create(request));
    }

    @Operation(summary = "更新分类", description = "声明返回 BaseResponse<Category>，实际响应体为 Category")
    @PutMapping("{id}")
    @Log(module = LogModuleEnum.CATEGORY, description = "更新分类")
    public BaseResponse<Category> update(@PathVariable String id, @RequestBody CategoryRequest request) {
        return ResultUtils.ok(categoryService.update(id, request));
    }

    @Operation(summary = "删除分类", description = "声明返回 BaseResponse<Map>，实际响应体为 {message:'删除成功'}")
    @DeleteMapping("{id}")
    @Log(module = LogModuleEnum.CATEGORY, description = "删除分类")
    public BaseResponse<Map<String, Object>> remove(@PathVariable String id) {
        return ResultUtils.ok(categoryService.remove(id));
    }
}
