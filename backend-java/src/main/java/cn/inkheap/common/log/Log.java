package cn.inkheap.common.log;

import cn.inkheap.common.constant.LogModuleEnum;

import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

/**
 * 写操作审计注解（当前落 SLF4J，预留 sys_log 表）。
 */
@Target(ElementType.METHOD)
@Retention(RetentionPolicy.RUNTIME)
public @interface Log {

    LogModuleEnum module() default LogModuleEnum.OTHER;

    String description() default "";
}
