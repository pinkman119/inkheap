package cn.inkheap.common.auth;

import cn.hutool.core.util.StrUtil;
import cn.inkheap.module.auth.entity.AdminUser;
import cn.inkheap.module.auth.mapper.AdminUserMapper;
import com.mybatisflex.core.query.QueryWrapper;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.nio.charset.StandardCharsets;

/**
 * 管理员 token 解析：读取 Authorization: Bearer，校验 role != 'user'，
 * 每个请求校验 admin_users.status = 'active'，通过后写入 UserContext。
 * 未携带/非法 token 时对 /api/admin/**（登录接口除外）直接返回 401 {"message":"Unauthorized"}。
 */
@Order(1)
@Component
@RequiredArgsConstructor
public class AdminJwtFilter extends OncePerRequestFilter {

    private static final String ADMIN_LOGIN_PATH = "/api/admin/auth/login";

    private final JwtUtils jwtUtils;

    private final AdminUserMapper adminUserMapper;

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {
        String path = request.getRequestURI();
        if (!path.startsWith("/api/admin") || ADMIN_LOGIN_PATH.equals(path)) {
            filterChain.doFilter(request, response);
            return;
        }

        String token = resolveToken(request);
        CurrentUser parsed = jwtUtils.parse(token);
        if (parsed == null || !parsed.isAdmin()) {
            writeUnauthorized(response);
            return;
        }

        AdminUser adminUser = adminUserMapper.selectOneByQuery(
                QueryWrapper.create().eq(AdminUser::getId, parsed.getId()));
        if (adminUser == null || !"active".equals(adminUser.getStatus())) {
            writeUnauthorized(response);
            return;
        }

        UserContext.set(new CurrentUser(adminUser.getId(), adminUser.getUsername(), adminUser.getRole()));
        try {
            filterChain.doFilter(request, response);
        } finally {
            UserContext.clear();
        }
    }

    private String resolveToken(HttpServletRequest request) {
        String header = request.getHeader("Authorization");
        if (StrUtil.isBlank(header) || !header.startsWith("Bearer ")) {
            return null;
        }
        return header.substring(7).trim();
    }

    private void writeUnauthorized(HttpServletResponse response) throws IOException {
        response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
        response.setContentType("application/json;charset=UTF-8");
        response.getOutputStream().write("{\"statusCode\":401,\"message\":\"Unauthorized\"}"
                .getBytes(StandardCharsets.UTF_8));
    }
}
