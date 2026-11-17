package cn.inkheap.module.xiaoji.entity;

import com.mybatisflex.annotation.Id;
import com.mybatisflex.annotation.KeyType;
import com.mybatisflex.annotation.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;

/**
 * 小记分类（blog_categories）：key 与 name 一致，同名即复用。
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Table("blog_categories")
public class BlogCategory {

    @Id(keyType = KeyType.None)
    private String id;

    private String key;

    private String name;

    private Instant createdAt;

    private Instant updatedAt;
}
