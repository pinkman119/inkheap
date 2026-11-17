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
 * 关于我 · 个人资料（单例，id 固定 about）。
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Table("about_profile")
public class AboutProfile {

    @Id(keyType = KeyType.None)
    private String id;

    private String kicker;

    private String lede;

    private String evaluationQuote;

    private String evaluationBy;

    private Instant createdAt;

    private Instant updatedAt;

    private Integer trainType;
}
