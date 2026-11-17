package cn.inkheap.module.about.model.vo;

import lombok.Data;

import java.time.Instant;

/**
 * 事件响应：date 输出 YYYY-MM-DD 字符串。
 */
@Data
public class AboutEventVO {

    private String id;

    private String date;

    private String title;

    private String desc;

    private Integer sortOrder;

    private Boolean isRing;

    private Instant createdAt;

    private Instant updatedAt;

    private Integer trainType;
}
