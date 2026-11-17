package cn.inkheap.module.homepage.model.dto;

import lombok.Data;

import java.util.List;
import java.util.Map;

/**
 * 首页配置更新请求（整体覆盖式保存社交链接）。
 */
@Data
public class UpdateHomePageRequest {

    private String siteName;

    private String personTitle;

    private String codeContent;

    private String workPersonTitle;

    private String workCodeContent;

    private String lifePersonTitle;

    private String lifeCodeContent;

    private String avatar;

    /** 社交链接数组：[{label,url,icon,svg}]；为 null 表示不改动 */
    private List<Map<String, Object>> socialLinks;
}
