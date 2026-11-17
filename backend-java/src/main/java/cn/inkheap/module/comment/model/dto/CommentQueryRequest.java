package cn.inkheap.module.comment.model.dto;

import cn.inkheap.common.model.PageQueryRequest;
import lombok.Data;
import lombok.EqualsAndHashCode;

/**
 * 评论查询参数：前台评论列表与后台评论管理共用。
 */
@Data
@EqualsAndHashCode(callSuper = true)
public class CommentQueryRequest extends PageQueryRequest {

    /** 主键 */
    private String id;

    /** 目标类型：article / note / friends */
    private String targetType;

    /** 目标 id */
    private String targetId;

    /** 评论人 id（后台筛选） */
    private String userId;

    /** 父评论 id：传入时只查该评论下的回复 */
    private String parentId;

    /** 是否只查顶层评论（parentId 为空）：前台列表使用 */
    private Boolean topLevel;

    public CommentQueryRequest() {
        // 1、评论列表默认每页 10 条
        setPageSize(10);
    }
}
