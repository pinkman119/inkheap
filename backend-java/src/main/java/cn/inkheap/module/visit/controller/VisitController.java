package cn.inkheap.module.visit.controller;

import cn.inkheap.common.constant.ApiPrefix;
import cn.inkheap.common.response.BaseResponse;
import cn.inkheap.common.response.ResultUtils;
import cn.inkheap.common.util.IpUtils;
import cn.inkheap.module.visit.model.dto.ReportVisitRequest;
import cn.inkheap.module.visit.service.VisitService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.annotation.Resource;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

/**
 * 前台访问上报接口（POST 返回 200，与原实现一致）。
 */
@Tag(name = "访问统计（公开）")
@RestController
@RequestMapping(ApiPrefix.V1 + "/visit")
public class VisitController {

    @Resource
    private VisitService visitService;

    @Operation(summary = "上报一次访问", description = "声明返回 BaseResponse<Map>，实际响应体为 {day,count}")
    @PostMapping
    @ResponseStatus(HttpStatus.OK)
    public BaseResponse<Map<String, Object>> report(@RequestBody(required = false) ReportVisitRequest request,
                                                    HttpServletRequest httpRequest) {
        String path = request == null ? null : request.getPath();
        return ResultUtils.ok(visitService.report(path, IpUtils.getClientIp(httpRequest)));
    }
}
