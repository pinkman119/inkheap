package cn.inkheap.module.resume.model.vo;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.util.Map;

/**
 * 简历版本详情：content 为 JSON 对象。
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ResumeVO {

    private String id;

    private String name;

    private Boolean isActive;

    private Map<String, Object> content;

    private Instant createdAt;

    private Instant updatedAt;
}
