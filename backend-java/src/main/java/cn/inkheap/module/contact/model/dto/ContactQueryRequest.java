package cn.inkheap.module.contact.model.dto;

import cn.inkheap.common.model.PageQueryRequest;
import lombok.Data;
import lombok.EqualsAndHashCode;

/**
 * 后台来信查询参数：read = all / read / unread。
 */
@Data
@EqualsAndHashCode(callSuper = true)
public class ContactQueryRequest extends PageQueryRequest {

    /** 主键 */
    private String id;

    /** 已读状态：all / read / unread */
    private String read = "all";

    /** 关键词：匹配署名 / 联系方式 / 正文 */
    private String keyword;

    public ContactQueryRequest() {
        // 1、来信列表默认每页 10 条
        setPageSize(10);
    }
}
