package cn.inkheap.module.about.entity;

import com.mybatisflex.annotation.Id;
import com.mybatisflex.annotation.KeyType;
import com.mybatisflex.annotation.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;

/**
 * 关于我 · 旅行卡片（about_travels）。
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Table("about_travels")
public class AboutTravel {

    @Id(keyType = KeyType.None)
    private String id;

    private String glyph;

    private String place;

    private String meta;

    private String note;

    private Integer sortOrder;

    private Instant createdAt;

    private Instant updatedAt;

    private Integer trainType;
}
