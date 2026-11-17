package cn.inkheap.module.emailauth.controller;

import cn.inkheap.common.auth.Auth;
import cn.inkheap.common.auth.CurrentUser;
import cn.inkheap.common.auth.CurrentUserParam;
import cn.inkheap.common.constant.ApiPrefix;
import cn.inkheap.common.constant.RoleEnum;
import cn.inkheap.common.response.BaseResponse;
import cn.inkheap.common.response.ResultUtils;
import cn.inkheap.module.emailauth.model.vo.EmailUserVO;
import cn.inkheap.module.emailauth.service.EmailAuthService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.annotation.Resource;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.LinkedHashMap;
import java.util.Map;

/**
 * 访客登录态接口（需访客 JWT）。
 */
@Tag(name = "访客账号（登录态）")
@Auth(allow = RoleEnum.USER)
@RestController
@RequestMapping(ApiPrefix.USER + "/auth")
public class EmailAuthUserController {

    @Resource
    private EmailAuthService emailAuthService;

    @Operation(summary = "当前登录用户", description = "声明返回 BaseResponse<EmailUserVO>，实际响应体为 EmailUserVO")
    @GetMapping("me")
    public BaseResponse<EmailUserVO> me(@CurrentUserParam CurrentUser currentUser) {
        return ResultUtils.ok(emailAuthService.getProfile(currentUser.getId()));
    }

    @Operation(summary = "登出", description = "清除 user_token cookie，返回 200；声明返回 BaseResponse<Map>，实际响应体为 {message}")
    @PostMapping("logout")
    @ResponseStatus(HttpStatus.OK)
    public BaseResponse<Map<String, Object>> logout(HttpServletResponse response) {
        emailAuthService.logout(response);
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("message", "已退出登录");
        return ResultUtils.ok(result);
    }
}
