package cn.inkheap.common.constant;

/**
 * 路由前缀常量：不使用 server.servlet.context-path（否则 /files/** 会被拖进 /api 下），
 * 由 Controller 显式拼接，静态资源映射保持在根路径。
 */
public class ApiPrefix {

    private ApiPrefix() {
    }

    public static final String V1 = "/api";

    public static final String ADMIN = V1 + "/admin";

    public static final String PUBLIC = V1 + "/public";

    public static final String USER = V1 + "/user";
}
