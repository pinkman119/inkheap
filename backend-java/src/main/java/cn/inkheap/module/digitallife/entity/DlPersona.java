package cn.inkheap.module.digitallife.entity;

import com.mybatisflex.annotation.Id;
import com.mybatisflex.annotation.KeyType;
import com.mybatisflex.annotation.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;

/**
 * 数字生命人格（dl_personas）。
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Table("dl_personas")
public class DlPersona {

    @Id(keyType = KeyType.None)
    private String id;

    private String name;

    private String greeting;

    private String description;

    private String basicInfo;

    private String styleHint;

    private String accentColor;

    private String avatarEmoji;

    private String personalityType;

    private Integer sortOrder;

    private Instant createdAt;

    private Instant updatedAt;
}
