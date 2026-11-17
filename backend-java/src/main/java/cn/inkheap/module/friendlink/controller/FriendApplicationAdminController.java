package cn.inkheap.module.friendlink.controller;

import cn.inkheap.common.auth.Auth;
import cn.inkheap.common.constant.ApiPrefix;
import cn.inkheap.common.constant.LogModuleEnum;
import cn.inkheap.common.log.Log;
import cn.inkheap.common.response.BaseResponse;
import cn.inkheap.common.response.ResultUtils;
import cn.inkheap.module.friendlink.entity.FriendApplication;
import cn.inkheap.module.friendlink.model.dto.ApproveFriendApplicationRequest;
import cn.inkheap.module.friendlink.model.dto.RejectFriendApplicationRequest;
import cn.inkheap.module.friendlink.service.FriendLinkService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.annotation.Resource;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

/**
 * 友链加入申请审核接口（后台）。
 */
@Tag(name = "友链申请（后台）")
@Auth
@RestController
@RequestMapping(ApiPrefix.ADMIN + "/friend-applications")
public class FriendApplicationAdminController {

    @Resource
    private FriendLinkService friendLinkService;

    @Operation(summary = "申请统计", description = "声明返回 BaseResponse<Map>，实际响应体为 {total,pending,approved}")
    @GetMapping("stats")
    public BaseResponse<Map<String, Long>> stats() {
        return ResultUtils.ok(friendLinkService.applicationStats());
    }

    @Operation(summary = "申请列表", description = "声明返回 BaseResponse<List<FriendApplication>>，实际响应体为裸数组")
    @GetMapping
    public BaseResponse<List<FriendApplication>> findAll(@RequestParam(required = false) String keyword,
                                                         @RequestParam(required = false) String status) {
        return ResultUtils.ok(friendLinkService.findApplications(keyword, status));
    }

    @Operation(summary = "申请详情", description = "声明返回 BaseResponse<FriendApplication>，实际响应体为 FriendApplication")
    @GetMapping("{id}")
    public BaseResponse<FriendApplication> findOne(@PathVariable String id) {
        return ResultUtils.ok(friendLinkService.findApplication(id));
    }

    @Operation(summary = "审核通过", description = "声明返回 BaseResponse<FriendApplication>，实际响应体为 FriendApplication")
    @PostMapping("{id}/approve")
    @Log(module = LogModuleEnum.FRIEND_LINK, description = "友链申请通过")
    public BaseResponse<FriendApplication> approve(@PathVariable String id,
                                                   @RequestBody(required = false) ApproveFriendApplicationRequest request) {
        return ResultUtils.ok(friendLinkService.approve(id, request));
    }

    @Operation(summary = "审核拒绝", description = "声明返回 BaseResponse<FriendApplication>，实际响应体为 FriendApplication")
    @PostMapping("{id}/reject")
    @Log(module = LogModuleEnum.FRIEND_LINK, description = "友链申请拒绝")
    public BaseResponse<FriendApplication> reject(@PathVariable String id,
                                                  @RequestBody(required = false) RejectFriendApplicationRequest request) {
        return ResultUtils.ok(friendLinkService.reject(id, request == null ? null : request.getRemark()));
    }

    @Operation(summary = "删除申请", description = "声明返回 BaseResponse<Map>，实际响应体为 {message:'删除成功'}")
    @DeleteMapping("{id}")
    @Log(module = LogModuleEnum.FRIEND_LINK, description = "删除友链申请")
    public BaseResponse<Map<String, Object>> remove(@PathVariable String id) {
        return ResultUtils.ok(friendLinkService.removeApplication(id));
    }
}
