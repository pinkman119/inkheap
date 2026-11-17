package cn.inkheap.module.homepage.model.vo;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.util.List;
import java.util.Map;

/**
 * 首页配置响应：socialLinks 由 JSON 字符串还原为数组。
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class HomePageVO {

    private String id;

    private String siteName;

    private String personTitle;

    private String codeContent;

    private String workPersonTitle;

    private String workCodeContent;

    private String lifePersonTitle;

    private String lifeCodeContent;

    private String avatar;

    private List<Map<String, Object>> socialLinks;

    private Instant createdAt;

    private Instant updatedAt;
}
