package cn.inkheap.module.adminuser.controller;

import cn.inkheap.common.auth.Auth;
import cn.inkheap.common.auth.CurrentUser;
import cn.inkheap.common.auth.CurrentUserParam;
import cn.inkheap.common.constant.ApiPrefix;
import cn.inkheap.common.constant.LogModuleEnum;
import cn.inkheap.common.log.Log;
import cn.inkheap.common.response.BaseResponse;
import cn.inkheap.common.response.ResultUtils;
import cn.inkheap.module.adminuser.model.dto.AdminUserQueryRequest;
import cn.inkheap.module.adminuser.model.dto.CreateAdminUserRequest;
import cn.inkheap.module.adminuser.model.dto.UpdateAvatarRequest;
import cn.inkheap.module.adminuser.model.dto.UpdatePasswordRequest;
import cn.inkheap.module.adminuser.model.dto.UpdateRemarkRequest;
import cn.inkheap.module.adminuser.model.dto.UpdateStatusRequest;
import cn.inkheap.module.adminuser.service.AdminUserService;
import cn.inkheap.module.auth.model.vo.AdminProfileVO;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.annotation.Resource;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

/**
 * 管理员账号管理接口（后台）。
 */
@Tag(name = "管理员账号（后台）")
@Auth
@RestController
@RequestMapping(ApiPrefix.ADMIN + "/users")
public class AdminUserController {

    @Resource
    private AdminUserService adminUserService;

    @Operation(summary = "管理员列表", description = "声明返回 BaseResponse<List<AdminProfileVO>>，实际响应体为裸数组")
    @GetMapping
    public BaseResponse<List<AdminProfileVO>> findAll(AdminUserQueryRequest request) {
        return ResultUtils.ok(adminUserService.findAll(request));
    }

    @Operation(summary = "新增管理员", description = "声明返回 BaseResponse<AdminProfileVO>，实际响应体为 AdminProfileVO")
    @PostMapping
    @Log(module = LogModuleEnum.ADMIN_USER, description = "新增管理员")
    public BaseResponse<AdminProfileVO> create(@Valid @RequestBody CreateAdminUserRequest request) {
        return ResultUtils.ok(adminUserService.create(request));
    }

    @Operation(summary = "修改密码", description = "声明返回 BaseResponse<Map>，实际响应体为 {success:true}")
    @PatchMapping("{id}/password")
    @Log(module = LogModuleEnum.ADMIN_USER, description = "修改管理员密码")
    public BaseResponse<Map<String, Object>> updatePassword(@PathVariable String id,
                                                           @RequestBody UpdatePasswordRequest request,
                                                           @CurrentUserParam CurrentUser currentUser) {
        return ResultUtils.ok(adminUserService.updatePassword(id, request, currentUser.getId()));
    }

    @Operation(summary = "修改备注", description = "声明返回 BaseResponse<AdminProfileVO>，实际响应体为 AdminProfileVO")
    @PatchMapping("{id}/remark")
    @Log(module = LogModuleEnum.ADMIN_USER, description = "修改管理员备注")
    public BaseResponse<AdminProfileVO> updateRemark(@PathVariable String id,
                                                     @RequestBody UpdateRemarkRequest request) {
        return ResultUtils.ok(adminUserService.updateRemark(id, request));
    }

    @Operation(summary = "修改头像", description = "声明返回 BaseResponse<AdminProfileVO>，实际响应体为 AdminProfileVO")
    @PatchMapping("{id}/avatar")
    @Log(module = LogModuleEnum.ADMIN_USER, description = "修改管理员头像")
    public BaseResponse<AdminProfileVO> updateAvatar(@PathVariable String id,
                                                     @RequestBody UpdateAvatarRequest request) {
        return ResultUtils.ok(adminUserService.updateAvatar(id, request));
    }

    @Operation(summary = "失效 / 启用", description = "声明返回 BaseResponse<AdminProfileVO>，实际响应体为 AdminProfileVO")
    @PatchMapping("{id}/status")
    @Log(module = LogModuleEnum.ADMIN_USER, description = "切换管理员状态")
    public BaseResponse<AdminProfileVO> updateStatus(@PathVariable String id,
                                                     @RequestBody UpdateStatusRequest request,
                                                     @CurrentUserParam CurrentUser currentUser) {
        return ResultUtils.ok(adminUserService.updateStatus(id, request, currentUser.getId()));
    }
}
