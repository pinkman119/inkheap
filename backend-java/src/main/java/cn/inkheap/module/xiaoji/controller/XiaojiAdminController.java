package cn.inkheap.module.xiaoji.controller;

import cn.inkheap.common.auth.Auth;
import cn.inkheap.common.constant.ApiPrefix;
import cn.inkheap.common.constant.LogModuleEnum;
import cn.inkheap.common.log.Log;
import cn.inkheap.common.response.BaseResponse;
import cn.inkheap.common.response.ListPageVO;
import cn.inkheap.common.response.ResultUtils;
import cn.inkheap.module.article.model.dto.GenerateSummaryRequest;
import cn.inkheap.module.xiaoji.model.dto.XiaojiQueryRequest;
import cn.inkheap.module.xiaoji.model.dto.XiaojiRequest;
import cn.inkheap.module.xiaoji.model.vo.BlogVO;
import cn.inkheap.module.xiaoji.service.XiaojiService;
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
 * 小记管理接口（后台）。列表键为 list（前端按 list 取值）。
 */
@Tag(name = "小记（后台）")
@Auth
@RestController
@RequestMapping(ApiPrefix.ADMIN + "/xiaoji")
public class XiaojiAdminController {

    @Resource
    private XiaojiService xiaojiService;

    @Operation(summary = "小记列表", description = "键为 list；声明返回 BaseResponse<ListPageVO>，实际响应体为 {list,total,page,pageSize,totalPages}")
    @GetMapping
    public BaseResponse<ListPageVO<BlogVO>> findAll(XiaojiQueryRequest request) {
        return ResultUtils.ok(xiaojiService.findAll(request));
    }

    @Operation(summary = "小记详情", description = "声明返回 BaseResponse<BlogVO>，实际响应体为 BlogVO")
    @GetMapping("{id}")
    public BaseResponse<BlogVO> findOne(@PathVariable String id) {
        return ResultUtils.ok(xiaojiService.findOne(id));
    }

    @Operation(summary = "自动生成摘要", description = "无可用模型时 409；声明返回 BaseResponse<Map>，实际响应体为 {summary}")
    @PostMapping("generate-summary")
    @Log(module = LogModuleEnum.XIAOJI, description = "生成小记摘要")
    public BaseResponse<Map<String, Object>> generateSummary(@RequestBody GenerateSummaryRequest request) {
        return ResultUtils.ok(xiaojiService.generateSummary(request.getContent(), request.getTitle()));
    }

    @Operation(summary = "新建小记", description = "声明返回 BaseResponse<BlogVO>，实际响应体为 BlogVO")
    @PostMapping
    @Log(module = LogModuleEnum.XIAOJI, description = "新建小记")
    public BaseResponse<BlogVO> create(@RequestBody XiaojiRequest request) {
        return ResultUtils.ok(xiaojiService.create(request));
    }

    @Operation(summary = "更新小记", description = "声明返回 BaseResponse<BlogVO>，实际响应体为 BlogVO")
    @PutMapping("{id}")
    @Log(module = LogModuleEnum.XIAOJI, description = "更新小记")
    public BaseResponse<BlogVO> update(@PathVariable String id, @RequestBody XiaojiRequest request) {
        return ResultUtils.ok(xiaojiService.update(id, request));
    }

    @Operation(summary = "删除小记", description = "声明返回 BaseResponse<Map>，实际响应体为 {success:true}")
    @DeleteMapping("{id}")
    @Log(module = LogModuleEnum.XIAOJI, description = "删除小记")
    public BaseResponse<Map<String, Object>> remove(@PathVariable String id) {
        return ResultUtils.ok(xiaojiService.remove(id));
    }
}
