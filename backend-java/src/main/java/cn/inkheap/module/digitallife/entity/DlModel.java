package cn.inkheap.module.digitallife.entity;

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
 * 数字生命模型配置（dl_models）。modelType 对应库内列 "type"。
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Table("dl_models")
public class DlModel {

    @Id(keyType = KeyType.None)
    private String id;

    private String name;

    private String provider;

    private String modelId;

    private Boolean enabled;

    private Integer sortOrder;

    private String apiKeyEnc;

    @Column("type")
    private String modelType;

    private Instant createdAt;

    private Instant updatedAt;
}
