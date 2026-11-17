package cn.inkheap.common.auth;

import cn.hutool.core.util.StrUtil;
import cn.hutool.jwt.JWT;
import cn.hutool.jwt.JWTUtil;
import cn.inkheap.config.AppProperties;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.nio.charset.StandardCharsets;
import java.util.Date;
import java.util.HashMap;
import java.util.Map;

/**
 * JWT 签发与解析（HS256，与 Node 端 @nestjs/jwt 默认算法一致）。
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class JwtUtils {

    private final AppProperties appProperties;

    private byte[] key() {
        return appProperties.getJwt().getSecret().getBytes(StandardCharsets.UTF_8);
    }

    /**
     * 签发 token：payload 与 Node 一致（sub / role / iat / exp）。
     */
    public String sign(String subject, String role, int expireDays) {
        long nowSeconds = System.currentTimeMillis() / 1000;
        Map<String, Object> payload = new HashMap<>(4);
        payload.put("sub", subject);
        payload.put("role", role);
        payload.put("iat", nowSeconds);
        payload.put("exp", nowSeconds + expireDays * 24L * 60 * 60);
        return JWTUtil.createToken(payload, key());
    }

    /**
     * 解析并校验 token，非法或过期返回 null。
     */
    public CurrentUser parse(String token) {
        if (StrUtil.isBlank(token)) {
            return null;
        }
        try {
            JWT jwt = JWTUtil.parseToken(token);
            jwt.setKey(key());
            if (!jwt.verify()) {
                return null;
            }
            Object exp = jwt.getPayload("exp");
            if (exp != null && Long.parseLong(String.valueOf(exp)) * 1000 < System.currentTimeMillis()) {
                return null;
            }
            Object sub = jwt.getPayload("sub");
            if (sub == null) {
                return null;
            }
            Object role = jwt.getPayload("role");
            return new CurrentUser(String.valueOf(sub), null, role == null ? "admin" : String.valueOf(role));
        } catch (Exception e) {
            log.debug("JWT 解析失败: {}", e.getMessage());
            return null;
        }
    }

    public int adminExpireDays() {
        return appProperties.getJwt().getAdminExpireDays();
    }

    public int userExpireDays() {
        return appProperties.getJwt().getUserExpireDays();
    }

    public long userExpireSeconds() {
        return userExpireDays() * 24L * 60 * 60;
    }

    public long nowSeconds() {
        return new Date().getTime() / 1000;
    }
}
