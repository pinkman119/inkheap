package cn.inkheap.module.digitallife.model.vo;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;

/**
 * 可训练内容列表项：源数据摘要 + 训练状态。
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TrainingItemVO {

    private String id;

    private String title;

    private String summary;

    /** 0 = 未训练；1 = 已训练；2 = 需重新训练 */
    private Integer trainType;

    private Instant createdAt;

    private Instant updatedAt;
}
