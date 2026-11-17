package cn.inkheap.module.friendlink.controller;

import cn.inkheap.common.constant.ApiPrefix;
import cn.inkheap.common.response.BaseResponse;
import cn.inkheap.common.response.ResultUtils;
import cn.inkheap.module.friendlink.entity.FriendLink;
import cn.inkheap.module.friendlink.model.dto.FriendApplicationCreateRequest;
import cn.inkheap.module.friendlink.service.FriendLinkService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.annotation.Resource;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * 友链公开接口（前台「邻居」页）。
 */
@Tag(name = "友链（公开）")
@RestController
@RequestMapping(ApiPrefix.PUBLIC)
public class FriendLinkPublicController {

    @Resource
    private FriendLinkService friendLinkService;

    @Operation(summary = "友链列表", description = "?mode=work|life 按模式过滤；声明返回 BaseResponse<List<FriendLink>>，实际响应体为裸数组")
    @GetMapping("friend-links")
    public BaseResponse<List<FriendLink>> findAll(@RequestParam(required = false) String mode) {
        return ResultUtils.ok(friendLinkService.findPublic(mode));
    }

    @Operation(summary = "邻居留言列表", description = "全部申请，仅公开字段；声明返回 BaseResponse<List<Map>>，实际响应体为裸数组")
    @GetMapping("friend-applications")
    public BaseResponse<List<Map<String, Object>>> findApplications() {
        return ResultUtils.ok(friendLinkService.findPublicApplications());
    }

    @Operation(summary = "提交加入申请", description = "返回 201 与 {id,message}；声明返回 BaseResponse<Map>，实际响应体为 {id,message}")
    @PostMapping("friend-applications")
    @ResponseStatus(HttpStatus.CREATED)
    public BaseResponse<Map<String, Object>> create(@Valid @RequestBody FriendApplicationCreateRequest request) {
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("id", friendLinkService.apply(request).getId());
        result.put("message", "收到了，通过审核后会把它编进邻居索引。");
        return ResultUtils.ok(result);
    }
}
