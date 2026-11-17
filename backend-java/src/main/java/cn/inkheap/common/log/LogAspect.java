package cn.inkheap.common.log;

import cn.inkheap.common.auth.CurrentUser;
import cn.inkheap.common.auth.UserContext;
import lombok.extern.slf4j.Slf4j;
import org.aspectj.lang.ProceedingJoinPoint;
import org.aspectj.lang.annotation.Around;
import org.aspectj.lang.annotation.Aspect;
import org.springframework.stereotype.Component;

/**
 * 审计日志切面：记录模块、操作、操作者与耗时；异常信息只记录消息，避免日志刷屏。
 */
@Slf4j
@Aspect
@Component
public class LogAspect {

    @Around("@annotation(logAnnotation)")
    public Object around(ProceedingJoinPoint joinPoint, Log logAnnotation) throws Throwable {
        long start = System.currentTimeMillis();
        CurrentUser user = UserContext.get();
        String operator = user == null ? "anonymous" : user.getUsername() + "(" + user.getId() + ")";
        try {
            Object result = joinPoint.proceed();
            log.info("[{}] {} 操作人={} 耗时={}ms", logAnnotation.module(), logAnnotation.description(),
                    operator, System.currentTimeMillis() - start);
            return result;
        } catch (Throwable e) {
            log.warn("[{}] {} 操作人={} 失败={} 耗时={}ms", logAnnotation.module(), logAnnotation.description(),
                    operator, e.getMessage(), System.currentTimeMillis() - start);
            throw e;
        }
    }
}
