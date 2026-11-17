package cn.inkheap.module.xiaoji.model.dto;

import lombok.Data;

import java.util.List;
import java.util.Map;

/**
 * 小记新增 / 更新请求。footprintId 为空串表示解绑足迹。
 */
@Data
public class XiaojiRequest {

    private String title;

    private String slug;

    /** album（相册）/ essay（随笔）等 */
    private String type;

    private List<String> tags;

    private String content;

    private String summary;

    private String quote;

    private String location;

    private String date;

    /** [{url, caption}] */
    private List<Map<String, Object>> photos;

    private Boolean published;

    private Integer virtualViewCount;

    private String footprintId;
}
