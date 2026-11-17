package cn.inkheap.module.friendlink.controller;

import cn.inkheap.common.auth.Auth;
import cn.inkheap.common.constant.ApiPrefix;
import cn.inkheap.common.constant.LogModuleEnum;
import cn.inkheap.common.log.Log;
import cn.inkheap.common.response.BaseResponse;
import cn.inkheap.common.response.ResultUtils;
import cn.inkheap.module.friendlink.entity.FriendLink;
import cn.inkheap.module.friendlink.model.dto.FriendLinkQueryRequest;
import cn.inkheap.module.friendlink.model.dto.FriendLinkRequest;
import cn.inkheap.module.friendlink.service.FriendLinkService;
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
 * 友链管理接口（后台）。
 */
@Tag(name = "友链（后台）")
@Auth
@RestController
@RequestMapping(ApiPrefix.ADMIN + "/friend-links")
public class FriendLinkAdminController {

    @Resource
    private FriendLinkService friendLinkService;

    @Operation(summary = "友链列表", description = "声明返回 BaseResponse<List<FriendLink>>，实际响应体为裸数组")
    @GetMapping
    public BaseResponse<List<FriendLink>> findAll(FriendLinkQueryRequest request) {
        return ResultUtils.ok(friendLinkService.findAll(request));
    }

    @Operation(summary = "友链详情", description = "声明返回 BaseResponse<FriendLink>，实际响应体为 FriendLink")
    @GetMapping("{id}")
    public BaseResponse<FriendLink> findOne(@PathVariable String id) {
        return ResultUtils.ok(friendLinkService.findOne(id));
    }

    @Operation(summary = "新增友链", description = "声明返回 BaseResponse<FriendLink>，实际响应体为 FriendLink")
    @PostMapping
    @Log(module = LogModuleEnum.FRIEND_LINK, description = "新增友链")
    public BaseResponse<FriendLink> create(@RequestBody FriendLinkRequest request) {
        return ResultUtils.ok(friendLinkService.create(request));
    }

    @Operation(summary = "更新友链", description = "声明返回 BaseResponse<FriendLink>，实际响应体为 FriendLink")
    @PutMapping("{id}")
    @Log(module = LogModuleEnum.FRIEND_LINK, description = "更新友链")
    public BaseResponse<FriendLink> update(@PathVariable String id, @RequestBody FriendLinkRequest request) {
        return ResultUtils.ok(friendLinkService.update(id, request));
    }

    @Operation(summary = "删除友链", description = "声明返回 BaseResponse<Map>，实际响应体为 {message:'删除成功'}")
    @DeleteMapping("{id}")
    @Log(module = LogModuleEnum.FRIEND_LINK, description = "删除友链")
    public BaseResponse<Map<String, Object>> remove(@PathVariable String id) {
        return ResultUtils.ok(friendLinkService.remove(id));
    }

    @Operation(summary = "上移/下移友链", description = "声明返回 BaseResponse<FriendLink>，实际响应体为 FriendLink")
    @PostMapping("{id}/move")
    @Log(module = LogModuleEnum.FRIEND_LINK, description = "调整友链顺序")
    public BaseResponse<FriendLink> move(@PathVariable String id,
                                         @RequestBody(required = false) Map<String, String> body) {
        String direction = body == null ? "down" : body.getOrDefault("direction", "down");
        return ResultUtils.ok(friendLinkService.move(id, "up".equals(direction) ? "up" : "down"));
    }
}
