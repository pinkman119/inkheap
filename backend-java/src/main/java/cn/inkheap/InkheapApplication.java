package cn.inkheap;

import lombok.extern.slf4j.Slf4j;
import org.apache.ibatis.annotations.Mapper;
import org.mybatis.spring.annotation.MapperScan;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.context.ConfigurableApplicationContext;
import org.springframework.core.env.Environment;
import org.springframework.scheduling.annotation.EnableAsync;
import org.springframework.scheduling.annotation.EnableScheduling;

import java.net.InetAddress;

/**
 * INKHEAP 后端启动类。
 */
@Slf4j
@EnableAsync
@EnableScheduling
@MapperScan(basePackages = "cn.inkheap.module", annotationClass = Mapper.class)
@SpringBootApplication
public class InkheapApplication {

    public static void main(String[] args) {
        ConfigurableApplicationContext application = SpringApplication.run(InkheapApplication.class, args);

        Environment env = application.getEnvironment();
        String port = env.getProperty("server.port", "3000");
        try {
            String ip = InetAddress.getLocalHost().getHostAddress();
            log.info("""

                    ----------------------------------------------------------
                    \tApplication INKHEAP is running! Access URLs:
                    \tLocal: \t\thttp://localhost:{}/api/public/home-page
                    \tExternal: \thttp://{}:{}/api/public/home-page
                    \tSwagger: \thttp://{}:{}/doc.html
                    ----------------------------------------------------------""", port, ip, port, ip, port);
        } catch (Exception e) {
            log.error("获取 IP 地址失败", e);
        }
    }
}
