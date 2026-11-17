package cn.inkheap.module.article.model.dto;

import lombok.Data;

/**
 * 自动生成摘要请求（文章与小记共用结构）。
 */
@Data
public class GenerateSummaryRequest {

    private String content;

    private String title;
}
