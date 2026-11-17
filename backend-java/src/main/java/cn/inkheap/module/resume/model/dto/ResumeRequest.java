package cn.inkheap.module.resume.model.dto;

import lombok.Data;

import java.util.Map;

/**
 * 简历版本新增 / 更新请求（content 为 JSON 对象）。
 */
@Data
public class ResumeRequest {

    private String name;

    private Map<String, Object> content;

    private Boolean isActive;
}
