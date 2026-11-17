package cn.inkheap.module.about.model.dto;

import lombok.Data;

/**
 * 足迹新增 / 更新请求。
 */
@Data
public class FootprintRequest {

    private String province;

    private String place;

    private String time;

    private String location;

    private String elevation;

    private Integer sortOrder;
}
