package cn.inkheap.common.auth;

import cn.hutool.core.util.StrUtil;
import cn.inkheap.module.emailauth.entity.EmailUser;
import cn.inkheap.module.emailauth.mapper.EmailUserMapper;
import com.mybatisflex.core.query.QueryWrapper;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.nio.charset.StandardCharsets;

/**
 * 访客 token 解析：优先 cookie user_token，其次 Authorization: Bearer；
 * 校验 role == 'user' 且 email_users.status = 'active'。
 */
@Order(2)
@Component
@RequiredArgsConstructor
public class UserJwtFilter extends OncePerRequestFilter {

    public static final String USER_TOKEN_COOKIE = "user_token";

    private final JwtUtils jwtUtils;

    private final EmailUserMapper emailUserMapper;

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {
        String path = request.getRequestURI();
        if (!path.startsWith("/api/user")) {
            filterChain.doFilter(request, response);
            return;
        }

        String token = resolveToken(request);
        CurrentUser parsed = jwtUtils.parse(token);
        if (parsed == null || parsed.isAdmin()) {
            writeUnauthorized(response);
            return;
        }

        EmailUser emailUser = emailUserMapper.selectOneByQuery(
                QueryWrapper.create().eq(EmailUser::getId, parsed.getId()));
        if (emailUser == null || !"active".equals(emailUser.getStatus())) {
            writeUnauthorized(response);
            return;
        }

        UserContext.set(new CurrentUser(emailUser.getId(), emailUser.getNickname(), "user"));
        try {
            filterChain.doFilter(request, response);
        } finally {
            UserContext.clear();
        }
    }

    private String resolveToken(HttpServletRequest request) {
        Cookie[] cookies = request.getCookies();
        if (cookies != null) {
            for (Cookie cookie : cookies) {
                if (USER_TOKEN_COOKIE.equals(cookie.getName()) && StrUtil.isNotBlank(cookie.getValue())) {
                    return cookie.getValue();
                }
            }
        }
        String header = request.getHeader("Authorization");
        if (StrUtil.isNotBlank(header) && header.startsWith("Bearer ")) {
            return header.substring(7).trim();
        }
        return null;
    }

    private void writeUnauthorized(HttpServletResponse response) throws IOException {
        response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
        response.setContentType("application/json;charset=UTF-8");
        response.getOutputStream().write("{\"statusCode\":401,\"message\":\"Unauthorized\"}"
                .getBytes(StandardCharsets.UTF_8));
    }
}
