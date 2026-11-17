package cn.inkheap.module.resume.model.vo;

import lombok.Data;

import java.time.Instant;

/**
 * 简历版本列表项（不含完整 content）。
 */
@Data
public class ResumeListVO {

    private String id;

    private String name;

    private Boolean isActive;

    private Instant createdAt;

    private Instant updatedAt;
}
