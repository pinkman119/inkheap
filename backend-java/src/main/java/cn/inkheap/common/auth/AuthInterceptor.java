package cn.inkheap.common.auth;

import cn.inkheap.common.constant.RoleEnum;
import cn.inkheap.common.exception.BusinessException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.web.method.HandlerMethod;
import org.springframework.web.servlet.HandlerInterceptor;

/**
 * @Auth 注解声明式鉴权（登录态由 JWT 过滤器保证，此处只做角色校验）。
 */
public class AuthInterceptor implements HandlerInterceptor {

    @Override
    public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler) {
        if (!(handler instanceof HandlerMethod handlerMethod)) {
            return true;
        }
        Auth auth = handlerMethod.getMethodAnnotation(Auth.class);
        if (auth == null) {
            auth = handlerMethod.getBeanType().getAnnotation(Auth.class);
        }
        if (auth == null) {
            return true;
        }

        CurrentUser currentUser = UserContext.get();
        if (currentUser == null) {
            throw BusinessException.unauthorized("Unauthorized");
        }
        for (RoleEnum role : auth.allow()) {
            if (role == RoleEnum.ADMIN && currentUser.isAdmin()) {
                return true;
            }
            if (role == RoleEnum.USER && !currentUser.isAdmin()) {
                return true;
            }
        }
        throw BusinessException.forbidden("无权限");
    }
}
