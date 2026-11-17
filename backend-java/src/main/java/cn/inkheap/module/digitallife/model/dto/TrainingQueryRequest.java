package cn.inkheap.module.digitallife.model.dto;

import cn.inkheap.common.model.PageQueryRequest;
import lombok.Data;
import lombok.EqualsAndHashCode;

/**
 * 训练列表查询参数（分页 + 数据源类型 + 关键词 + 训练状态）。
 */
@Data
@EqualsAndHashCode(callSuper = true)
public class TrainingQueryRequest extends PageQueryRequest {

    /** 数据源类型：article / blog / resume / about_profile / about_footprint / about_travel / about_event */
    private String refType;

    /** 关键词：匹配标题 / 摘要 */
    private String search;

    /** 训练状态：0 未训练 / 1 已训练 / 2 已移除 */
    private Integer trainType;

    public TrainingQueryRequest() {
        // 1、训练列表默认每页 10 条
        setPageSize(10);
    }
}
