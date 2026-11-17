package cn.inkheap.module.about.model.vo;

import lombok.Data;

import java.time.Instant;

/**
 * 足迹响应：附带绑定的小记（slug 供前台跳转，title 供后台展示）。
 */
@Data
public class AboutFootprintVO {

    private String id;

    private String province;

    private String place;

    private String time;

    private String location;

    private String note;

    private Integer sortOrder;

    private String elevation;

    private String blogId;

    private Instant createdAt;

    private Instant updatedAt;

    private Integer trainType;

    private BlogBriefVO blog;
}
