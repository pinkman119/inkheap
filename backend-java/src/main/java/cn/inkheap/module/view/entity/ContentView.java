package cn.inkheap.module.view.entity;

import com.mybatisflex.annotation.Id;
import com.mybatisflex.annotation.KeyType;
import com.mybatisflex.annotation.Table;
import lombok.Data;

import java.time.Instant;

/**
 * 阅读明细（content_views）：同一 IP 对同一内容每天最多一条，靠唯一索引去重。
 */
@Data
@Table("content_views")
public class ContentView {

    @Id(keyType = KeyType.None)
    private String id;

    private String targetType;

    private String targetId;

    private String ip;

    private Instant day;

    private Instant createdAt;
}
