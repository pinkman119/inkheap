package cn.inkheap.module.friendlink.model.dto;

import cn.inkheap.common.model.PageQueryRequest;
import lombok.Data;
import lombok.EqualsAndHashCode;

/**
 * 友链查询参数：后台与前台共用。
 *
 * <p>mode 支持三种写法：all / work / life，也兼容 0（全模式）、1（工作）、2（生活）。
 */
@Data
@EqualsAndHashCode(callSuper = true)
public class FriendLinkQueryRequest extends PageQueryRequest {

    /** 主键 */
    private String id;

    /** 关键词：匹配名称 / 描述 / 标签 */
    private String keyword;

    /** 状态：all / active / dormant */
    private String status = "all";

    /** 模式：all / work / life / 0 / 1 / 2 */
    private String mode = "all";
}
