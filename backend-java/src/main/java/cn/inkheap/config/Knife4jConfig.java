package cn.inkheap.config;

import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Info;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * 接口文档配置（访问 /doc.html）。
 */
@Configuration
public class Knife4jConfig {

    @Bean
    public OpenAPI inkheapOpenApi() {
        return new OpenAPI().info(new Info()
                .title("INKHEAP API")
                .description("墨堆后端接口（SpringBoot 3.5.3 + MyBatis-Flex + PostgreSQL 16）\n"
                        + "注意：接口声明返回 BaseResponse<Xxx>，实际 HTTP 响应体为解包后的 Xxx（与原 Node 契约一致）。")
                .version("1.0.0"));
    }
}
