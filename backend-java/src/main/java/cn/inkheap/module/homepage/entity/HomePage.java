package cn.inkheap.module.homepage.entity;

import com.mybatisflex.annotation.Id;
import com.mybatisflex.annotation.KeyType;
import com.mybatisflex.annotation.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;

/**
 * 首页配置（单例，id 固定 home）。social_links 库内为 JSON 字符串，VO 层解析为数组。
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Table("home_page")
public class HomePage {

    @Id(keyType = KeyType.None)
    private String id;

    private String siteName;

    private String personTitle;

    private String codeContent;

    private String workPersonTitle;

    private String workCodeContent;

    private String lifePersonTitle;

    private String lifeCodeContent;

    private String avatar;

    private String socialLinks;

    private Instant createdAt;

    private Instant updatedAt;
}
