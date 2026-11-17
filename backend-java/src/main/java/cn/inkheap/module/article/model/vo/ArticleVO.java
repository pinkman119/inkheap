package cn.inkheap.module.article.model.vo;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.util.List;

/**
 * 文章响应：tags 解析为数组，并给出前台展示用的 displayViewCount。
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ArticleVO {

    private String id;

    private String slug;

    private String title;

    private String summary;

    private String content;

    private String coverImage;

    private String categoryKey;

    private List<String> tags;

    private String author;

    private String authorUrl;

    private Boolean published;

    private Boolean featured;

    private Integer viewCount;

    private Integer virtualViewCount;

    /** 前台展示阅读量：设置了虚拟值则展示虚拟值，否则展示真实值 */
    private Integer displayViewCount;

    private String type;

    private Integer sortOrder;

    private Instant createdAt;

    private Instant updatedAt;

    private Integer trainType;
}
