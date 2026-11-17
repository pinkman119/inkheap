package cn.inkheap.module.article.model.dto;

import lombok.Data;

import java.util.List;

/**
 * 文章新增 / 更新请求。
 */
@Data
public class ArticleRequest {

    private String title;

    private String slug;

    private String summary;

    private String content;

    private String coverImage;

    private String categoryKey;

    private List<String> tags;

    private String author;

    private String authorUrl;

    private Boolean published;

    private Boolean featured;

    private String type;

    private Integer virtualViewCount;
}
