package cn.inkheap.module.contact.controller;

import cn.inkheap.common.constant.ApiPrefix;
import cn.inkheap.common.response.BaseResponse;
import cn.inkheap.common.response.ResultUtils;
import cn.inkheap.module.contact.entity.ContactMessage;
import cn.inkheap.module.contact.model.dto.ContactCreateRequest;
import cn.inkheap.module.contact.service.ContactService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.annotation.Resource;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.LinkedHashMap;
import java.util.Map;

/**
 * 前台「联系我」提交接口（201，无需登录）。
 */
@Tag(name = "联系我（公开）")
@RestController
@RequestMapping(ApiPrefix.V1 + "/contact")
public class ContactPublicController {

    @Resource
    private ContactService contactService;

    @Operation(summary = "提交来信", description = "返回 201 与 {id,message}；声明返回 BaseResponse<Map>，实际响应体为 {id,message}")
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public BaseResponse<Map<String, Object>> create(@Valid @RequestBody ContactCreateRequest request) {
        ContactMessage created = contactService.create(request);
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("id", created.getId());
        result.put("message", "提交成功，我会尽快回复你！");
        return ResultUtils.ok(result);
    }
}
