package cn.inkheap.module.siteconfig.entity;

import com.mybatisflex.annotation.Id;
import com.mybatisflex.annotation.KeyType;
import com.mybatisflex.annotation.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;

/**
 * 站点全局配置（单例，id 固定 site），服务 RSS 输出。
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Table("site_config")
public class SiteConfig {

    @Id(keyType = KeyType.None)
    private String id;

    private String siteUrl;

    private String siteTitle;

    private String siteDescription;

    private String author;

    private Instant createdAt;

    private Instant updatedAt;
}
