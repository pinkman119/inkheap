package cn.inkheap.module.emailauth.controller;

import cn.inkheap.common.constant.ApiPrefix;
import cn.inkheap.common.response.BaseResponse;
import cn.inkheap.common.response.ResultUtils;
import cn.inkheap.common.util.IpUtils;
import cn.inkheap.module.emailauth.model.dto.EmailAuthRequest;
import cn.inkheap.module.emailauth.service.EmailAuthService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.annotation.Resource;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
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
 * 访客邮箱认证公开接口（全部 POST 返回 200）。
 */
@Tag(name = "访客账号（公开）")
@RestController
@RequestMapping(ApiPrefix.PUBLIC + "/auth")
public class EmailAuthPublicController {

    @Resource
    private EmailAuthService emailAuthService;

    @Operation(summary = "发送注册验证码", description = "声明返回 BaseResponse<Map>，实际响应体为 {message}")
    @PostMapping("send-code")
    @ResponseStatus(HttpStatus.OK)
    public BaseResponse<Map<String, Object>> sendCode(@Valid @RequestBody EmailAuthRequest request) {
        emailAuthService.sendRegisterCode(request.getEmail());
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("message", "验证码已发送，请查收邮件");
        return ResultUtils.ok(result);
    }

    @Operation(summary = "注册并自动登录", description = "声明返回 BaseResponse<Map>，实际响应体为 {user}，并写入 user_token cookie")
    @PostMapping("register")
    @ResponseStatus(HttpStatus.OK)
    public BaseResponse<Map<String, Object>> register(@Valid @RequestBody EmailAuthRequest request,
                                                      HttpServletResponse response) {
        return ResultUtils.ok(emailAuthService.register(request, response));
    }

    @Operation(summary = "登录", description = "声明返回 BaseResponse<Map>，实际响应体为 {user}，并写入 user_token cookie")
    @PostMapping("login")
    @ResponseStatus(HttpStatus.OK)
    public BaseResponse<Map<String, Object>> login(@Valid @RequestBody EmailAuthRequest request,
                                                   HttpServletResponse response) {
        return ResultUtils.ok(emailAuthService.login(request, response));
    }

    @Operation(summary = "找回密码", description = "明文密码邮件发送，带限流；声明返回 BaseResponse<Map>，实际响应体为 {message}")
    @PostMapping("forgot-password")
    @ResponseStatus(HttpStatus.OK)
    public BaseResponse<Map<String, Object>> forgotPassword(@Valid @RequestBody EmailAuthRequest request,
                                                            HttpServletRequest httpRequest) {
        emailAuthService.forgotPassword(request.getEmail(), IpUtils.getClientIp(httpRequest));
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("message", "密码已发送到您的邮箱，请注意查收");
        return ResultUtils.ok(result);
    }
}
