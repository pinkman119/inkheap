package cn.inkheap.module.digitallife.model.dto;

import lombok.Data;

/**
 * 人格更新请求。
 */
@Data
public class PersonaUpdateRequest {

    private String name;

    private String greeting;

    private String description;

    private String basicInfo;

    private String styleHint;

    private String accentColor;

    private String avatarEmoji;

    private String personalityType;
}
