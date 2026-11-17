package cn.inkheap.module.category.model.dto;

import lombok.Data;

/**
 * 分类新增 / 更新请求。
 */
@Data
public class CategoryRequest {

    private String key;

    private String name;

    private String parentKey;

    private Integer sortOrder;

    private String icon;
}
