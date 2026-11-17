package cn.inkheap.module.visit.entity;

import com.mybatisflex.annotation.Id;
import com.mybatisflex.annotation.KeyType;
import com.mybatisflex.annotation.Table;
import lombok.Data;

import java.time.Instant;

/**
 * 站点访问按天聚合（site_visits），day 为 Asia/Shanghai 零点对应的 UTC 时刻。
 */
@Data
@Table("site_visits")
public class SiteVisit {

    @Id(keyType = KeyType.None)
    private String id;

    private Instant day;

    private Integer count;

    private Instant createdAt;

    private Instant updatedAt;
}
