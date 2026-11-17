package cn.inkheap.module.article.model.dto;

import lombok.Data;

import java.util.List;

/**
 * 文章拖拽排序请求：ids 为拖拽后的目标顺序。
 */
@Data
public class ReorderArticleRequest {

    private List<String> ids;
}
