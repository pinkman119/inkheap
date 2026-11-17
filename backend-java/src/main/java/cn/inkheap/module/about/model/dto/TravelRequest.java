package cn.inkheap.module.about.model.dto;

import lombok.Data;

/**
 * 旅行卡片新增 / 更新请求。
 */
@Data
public class TravelRequest {

    private String glyph;

    private String place;

    private String meta;

    private String note;

    private Integer sortOrder;
}
