package cn.inkheap.module.emailauth.service;

import cn.inkheap.module.emailauth.model.dto.EmailAuthRequest;
import cn.inkheap.module.emailauth.model.vo.EmailUserVO;
import jakarta.servlet.http.HttpServletResponse;

import java.util.Map;

/**
 * 访客邮箱账号服务（注册 / 登录 / 登出 / 找回密码）。
 */
public interface EmailAuthService {

    /**
     * 发送注册验证码：5 分钟内有效，同邮箱 60s 重发间隔。
     *
     * @param email 邮箱
     */
    void sendRegisterCode(String email);

    /**
     * 注册（验证码校验通过后自动登录，写 14 天 httpOnly cookie）。
     *
     * @param request  请求
     * @param response HTTP 响应（写 cookie）
     * @return {user}
     */
    Map<String, Object> register(EmailAuthRequest request, HttpServletResponse response);

    /**
     * 邮箱 + 密码登录（AES 可逆密码比对）。
     *
     * @param request  请求
     * @param response HTTP 响应（写 cookie）
     * @return {user}
     */
    Map<String, Object> login(EmailAuthRequest request, HttpServletResponse response);

    /**
     * 找回密码：明文密码邮件发送（同邮箱 60s、同 IP 每小时 10 次限流）。
     *
     * @param email  邮箱
     * @param ip     客户端 IP
     */
    void forgotPassword(String email, String ip);

    /**
     * 当前登录用户信息。
     *
     * @param userId 用户 id
     * @return 用户信息
     */
    EmailUserVO getProfile(String userId);

    /**
     * 登出（清除 user_token cookie）。
     *
     * @param response HTTP 响应
     */
    void logout(HttpServletResponse response);
}
