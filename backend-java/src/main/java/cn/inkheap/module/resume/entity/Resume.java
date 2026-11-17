package cn.inkheap.module.resume.entity;

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
 * 简历版本（resume）。注意库内激活列名为驼峰 "isActive"（Prisma 未声明 @map）。
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Table("resume")
public class Resume {

    @Id(keyType = KeyType.None)
    private String id;

    private String name;

    private String content;

    @Column("isActive")
    private Boolean isActive;

    private Instant createdAt;

    private Instant updatedAt;

    private Integer trainType;
}
