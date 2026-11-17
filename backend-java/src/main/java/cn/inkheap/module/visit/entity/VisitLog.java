package cn.inkheap.module.visit.entity;

import com.mybatisflex.annotation.Id;
import com.mybatisflex.annotation.KeyType;
import com.mybatisflex.annotation.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;

/**
 * 访问明细（visit_logs）：时间 / IP / 地区 / 路径。
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Table("visit_logs")
public class VisitLog {

    @Id(keyType = KeyType.None)
    private String id;

    private Instant day;

    private String ip;

    private String region;

    private String path;

    private Instant createdAt;
}
