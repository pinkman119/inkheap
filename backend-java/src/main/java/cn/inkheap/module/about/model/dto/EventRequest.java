package cn.inkheap.module.about.model.dto;

import lombok.Data;

/**
 * 事件新增 / 更新请求（date 为 YYYY-MM-DD 字符串）。
 */
@Data
public class EventRequest {

    private String date;

    private String title;

    private String desc;

    private Boolean isRing;

    private Integer sortOrder;
}
