package cn.inkheap.common.auth;

import cn.inkheap.common.exception.BusinessException;
import cn.inkheap.common.exception.ErrorCode;

/**
 * 当前请求的登录上下文（由 JWT 过滤器写入，请求结束后清理）。
 */
public class UserContext {

    private static final ThreadLocal<CurrentUser> HOLDER = new ThreadLocal<>();

    private UserContext() {
    }

    public static void set(CurrentUser user) {
        HOLDER.set(user);
    }

    public static CurrentUser get() {
        return HOLDER.get();
    }

    public static CurrentUser require() {
        CurrentUser user = HOLDER.get();
        if (user == null) {
            throw new BusinessException(ErrorCode.NOT_LOGIN, "Unauthorized");
        }
        return user;
    }

    public static String requireId() {
        return require().getId();
    }

    public static void clear() {
        HOLDER.remove();
    }
}
