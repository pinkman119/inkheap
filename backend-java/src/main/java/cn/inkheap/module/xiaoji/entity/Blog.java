package cn.inkheap.module.xiaoji.entity;

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
 * 小记（blogs）：type = album（相册）/ essay（随笔）等；tags、photos 库内为 JSON 字符串。
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Table("blogs")
public class Blog {

    @Id(keyType = KeyType.None)
    private String id;

    private String slug;

    private String title;

    @Column("type")
    private String type;

    private String tags;

    private String content;

    private String summary;

    private String quote;

    private String location;

    @Column("date")
    private String date;

    private String photos;

    private Boolean published;

    private Integer viewCount;

    private Integer virtualViewCount;

    private Instant createdAt;

    private Instant updatedAt;

    private Integer trainType;
}
