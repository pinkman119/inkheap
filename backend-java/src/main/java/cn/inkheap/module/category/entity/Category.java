package cn.inkheap.module.category.entity;

import com.mybatisflex.annotation.Id;
import com.mybatisflex.annotation.KeyType;
import com.mybatisflex.annotation.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;

/**
 * 文章分类（categories），parentKey 自关联构成层级。
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Table("categories")
public class Category {

    @Id(keyType = KeyType.None)
    private String id;

    private String key;

    private String name;

    private String parentKey;

    private Integer sortOrder;

    private String icon;

    private Instant createdAt;

    private Instant updatedAt;
}
