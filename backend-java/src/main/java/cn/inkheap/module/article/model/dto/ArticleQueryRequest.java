package cn.inkheap.module.article.model.dto;

import cn.inkheap.common.model.PageQueryRequest;
import lombok.Data;
import lombok.EqualsAndHashCode;

/**
 * 文章查询参数：前台列表、后台列表共用。
 *
 * <p>status 语义：published / draft / all；不传时按已发布处理。
 */
@Data
@EqualsAndHashCode(callSuper = true)
public class ArticleQueryRequest extends PageQueryRequest {

    /** 主键 */
    private String id;

    /** 访问路径 */
    private String slug;

    /** 关键词：匹配标题 / 摘要 / 标签 */
    private String search;

    /** 分类 key，支持逗号分隔（父分类会展开子孙） */
    private String categoryKey;

    /** published / draft / all；公开接口强制 published */
    private String status;

    /** 作者 */
    private String author;

    public ArticleQueryRequest() {
        // 1、文章列表默认每页 20 条
        setPageSize(20);
    }
}
