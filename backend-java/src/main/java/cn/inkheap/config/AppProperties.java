package cn.inkheap.config;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

/**
 * 应用自定义配置（app.*）。
 */
@Data
@Component
@ConfigurationProperties(prefix = "app")
public class AppProperties {

    /** 上传文件落盘根目录，静态映射到 /files/** */
    private String uploadDir = "./files";

    /** 邮件发件人（未配置 SMTP 时相关接口返回服务不可用） */
    private String mailFrom = "墨堆 <noreply@inkheap.com>";

    /** AES-256-GCM 密钥（64 位 hex = 32 字节），与 Node 端 APP_ENCRYPTION_KEY 一致 */
    private String encryptionKey = "";

    private Jwt jwt = new Jwt();

    private Retention retention = new Retention();

    private Site site = new Site();

    @Data
    public static class Jwt {

        /** 与原 Node 服务共用同一 secret，便于双跑期间 token 互通 */
        private String secret = "inkheap-admin-secret-key-2026";

        private int adminExpireDays = 7;

        private int userExpireDays = 14;
    }

    @Data
    public static class Retention {

        private int visitLogDays = 180;

        private int contentViewDays = 90;
    }

    @Data
    public static class Site {

        private String timezone = "Asia/Shanghai";
    }
}
