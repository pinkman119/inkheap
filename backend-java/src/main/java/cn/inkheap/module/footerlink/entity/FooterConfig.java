package cn.inkheap.module.footerlink.entity;

import com.mybatisflex.annotation.Id;
import com.mybatisflex.annotation.KeyType;
import com.mybatisflex.annotation.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;

/**
 * 页脚全局配置（单例，id 固定 footer）。
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Table("footer_config")
public class FooterConfig {

    @Id(keyType = KeyType.None)
    private String id;

    private String icpNo;

    private String icpUrl;

    private Instant createdAt;

    private Instant updatedAt;
}
