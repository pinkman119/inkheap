package cn.inkheap.module.category.model.vo;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.Data;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

/**
 * 分类响应：附加「直接文章数」「含子孙文章数」与树形 children。
 */
@Data
@JsonInclude(JsonInclude.Include.NON_NULL)
public class CategoryVO {

    private String id;

    private String key;

    private String name;

    private String parentKey;

    private Integer sortOrder;

    private String icon;

    private Instant createdAt;

    private Instant updatedAt;

    private Integer articleCount;

    private Integer articleCountWithChildren;

    /** 仅树接口输出 */
    private List<CategoryVO> children;
}
