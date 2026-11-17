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
 * 关于我 · 足迹（about_footprints）。blog_id 为 1-1 绑定的小记。
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Table("about_footprints")
public class AboutFootprint {

    @Id(keyType = KeyType.None)
    private String id;

    private String province;

    private String place;

    @Column("time")
    private String time;

    private String location;

    private String note;

    private Integer sortOrder;

    private Instant createdAt;

    private Instant updatedAt;

    private Integer trainType;

    private String elevation;

    private String blogId;
}
