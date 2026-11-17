package cn.inkheap.module.about.entity;

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
 * 关于我 · 事件（about_events），isRing=true 表示成就（年轮）。
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Table("about_events")
public class AboutEvent {

    @Id(keyType = KeyType.None)
    private String id;

    @Column("date")
    private Instant date;

    private String title;

    @Column("desc")
    private String desc;

    private Integer sortOrder;

    private Instant createdAt;

    private Instant updatedAt;

    private Integer trainType;

    private Boolean isRing;
}
