package cn.inkheap.module.auth.controller;

import cn.inkheap.common.auth.CurrentUser;
import cn.inkheap.common.auth.CurrentUserParam;
import cn.inkheap.common.auth.Auth;
import cn.inkheap.common.constant.ApiPrefix;
import cn.inkheap.common.constant.LogModuleEnum;
import cn.inkheap.common.log.Log;
import cn.inkheap.common.response.BaseResponse;
import cn.inkheap.common.response.ResultUtils;
import cn.inkheap.module.auth.model.dto.AdminLoginRequest;
import cn.inkheap.module.auth.model.vo.AdminLoginVO;
import cn.inkheap.module.auth.model.vo.AdminProfileVO;
import cn.inkheap.module.auth.service.AuthService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.annotation.Resource;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * 管理员登录接口。
 */
@Tag(name = "管理员登录")
@RestController
@RequestMapping(ApiPrefix.ADMIN + "/auth")
public class AuthController {

    @Resource
    private AuthService authService;

    @Operation(summary = "管理员登录", description = "公开接口；声明返回 BaseResponse<AdminLoginVO>，实际响应体为 {accessToken,user}")
    @PostMapping("login")
    @Log(module = LogModuleEnum.AUTH, description = "管理员登录")
    public BaseResponse<AdminLoginVO> login(@Valid @RequestBody AdminLoginRequest request) {
        return ResultUtils.ok(authService.login(request));
    }

    @Operation(summary = "当前管理员资料", description = "声明返回 BaseResponse<AdminProfileVO>，实际响应体为 AdminProfileVO")
    @Auth
    @GetMapping("me")
    public BaseResponse<AdminProfileVO> me(@CurrentUserParam CurrentUser currentUser) {
        return ResultUtils.ok(authService.getProfile(currentUser.getId()));
    }
}
