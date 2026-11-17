package cn.inkheap.module.resume.controller;

import cn.inkheap.common.auth.Auth;
import cn.inkheap.common.constant.ApiPrefix;
import cn.inkheap.common.constant.LogModuleEnum;
import cn.inkheap.common.log.Log;
import cn.inkheap.common.response.BaseResponse;
import cn.inkheap.common.response.ResultUtils;
import cn.inkheap.module.resume.model.dto.ResumeQueryRequest;
import cn.inkheap.module.resume.model.dto.ResumeRequest;
import cn.inkheap.module.resume.model.vo.ResumeListVO;
import cn.inkheap.module.resume.model.vo.ResumeVO;
import cn.inkheap.module.resume.service.ResumeService;
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
 * 简历版本管理接口（后台）。
 */
@Tag(name = "简历（后台）")
@Auth
@RestController
@RequestMapping(ApiPrefix.ADMIN + "/resume")
public class ResumeAdminController {

    @Resource
    private ResumeService resumeService;

    @Operation(summary = "版本列表", description = "声明返回 BaseResponse<List<ResumeListVO>>，实际响应体为裸数组")
    @GetMapping
    public BaseResponse<List<ResumeListVO>> list(ResumeQueryRequest request) {
        return ResultUtils.ok(resumeService.listVersions(request));
    }

    @Operation(summary = "版本详情", description = "声明返回 BaseResponse<ResumeVO>，实际响应体为 ResumeVO")
    @GetMapping("{id}")
    public BaseResponse<ResumeVO> findById(@PathVariable String id) {
        return ResultUtils.ok(resumeService.findById(id));
    }

    @Operation(summary = "新建版本", description = "声明返回 BaseResponse<ResumeVO>，实际响应体为 ResumeVO")
    @PostMapping
    @Log(module = LogModuleEnum.RESUME, description = "新建简历版本")
    public BaseResponse<ResumeVO> create(@RequestBody ResumeRequest request) {
        return ResultUtils.ok(resumeService.create(request));
    }

    @Operation(summary = "更新版本", description = "声明返回 BaseResponse<ResumeVO>，实际响应体为 ResumeVO")
    @PutMapping("{id}")
    @Log(module = LogModuleEnum.RESUME, description = "更新简历版本")
    public BaseResponse<ResumeVO> update(@PathVariable String id, @RequestBody ResumeRequest request) {
        return ResultUtils.ok(resumeService.update(id, request));
    }

    @Operation(summary = "切换生效版本", description = "声明返回 BaseResponse<ResumeVO>，实际响应体为 ResumeVO")
    @PutMapping("{id}/activate")
    @Log(module = LogModuleEnum.RESUME, description = "切换简历生效版本")
    public BaseResponse<ResumeVO> activate(@PathVariable String id) {
        return ResultUtils.ok(resumeService.activate(id));
    }

    @Operation(summary = "删除版本", description = "声明返回 BaseResponse<Map>，实际响应体为 {success:true}")
    @DeleteMapping("{id}")
    @Log(module = LogModuleEnum.RESUME, description = "删除简历版本")
    public BaseResponse<Map<String, Object>> remove(@PathVariable String id) {
        return ResultUtils.ok(resumeService.remove(id));
    }
}
