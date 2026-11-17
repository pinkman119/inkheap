package cn.inkheap.module.xiaoji.model.dto;

import cn.inkheap.common.model.PageQueryRequest;
import lombok.Data;
import lombok.EqualsAndHashCode;

/**
 * 小记查询参数（后台列表）：status = all / published / draft。
 */
@Data
@EqualsAndHashCode(callSuper = true)
public class XiaojiQueryRequest extends PageQueryRequest {

    /** 主键 */
    private String id;

    /** 关键词：匹配标题 / 摘要 / 正文 */
    private String search;

    /** 状态：all / published / draft */
    private String status = "all";

    /** 类型：album / essay */
    private String type;

    /** 标签（JSON 内匹配） */
    private String tag;

    public XiaojiQueryRequest() {
        // 1、小记列表默认每页 10 条
        setPageSize(10);
    }
}
