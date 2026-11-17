package cn.inkheap.module.resume.controller;

import cn.inkheap.common.constant.ApiPrefix;
import cn.inkheap.common.response.BaseResponse;
import cn.inkheap.common.response.ResultUtils;
import cn.inkheap.module.resume.model.vo.ResumeVO;
import cn.inkheap.module.resume.service.ResumeService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.annotation.Resource;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * 简历公开接口（前台简历页查询生效版本）。
 */
@Tag(name = "简历（公开）")
@RestController
@RequestMapping(ApiPrefix.PUBLIC + "/resume")
public class ResumePublicController {

    @Resource
    private ResumeService resumeService;

    @Operation(summary = "当前生效的简历版本", description = "声明返回 BaseResponse<ResumeVO>，实际响应体为 ResumeVO")
    @GetMapping
    public BaseResponse<ResumeVO> findActive() {
        return ResultUtils.ok(resumeService.findActive());
    }
}
