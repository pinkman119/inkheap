package cn.inkheap.module.article.entity;

import com.mybatisflex.annotation.Column;
import com.mybatisflex.annotation.Id;
import com.mybatisflex.annotation.KeyType;
import com.mybatisflex.annotation.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;

/**
 * 知识库文章（articles）。tags 库内为 JSON 字符串，VO 层解析为数组。
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Table("articles")
public class Article {

    @Id(keyType = KeyType.None)
    private String id;

    private String slug;

    private String title;

    private String summary;

    private String content;

    private String coverImage;

    private String categoryKey;

    private String tags;

    private String author;

    private String authorUrl;

    private Boolean published;

    private Boolean featured;

    private Integer viewCount;

    private Integer virtualViewCount;

    @Column("type")
    private String type;

    private Integer sortOrder;

    private Instant createdAt;

    private Instant updatedAt;

    private Integer trainType;
}
