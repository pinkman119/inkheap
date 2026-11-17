package cn.inkheap.module.comment.service;

import cn.inkheap.common.response.PageVO;
import cn.inkheap.module.comment.model.dto.CommentQueryRequest;
import cn.inkheap.module.comment.model.dto.CreateCommentRequest;
import cn.inkheap.module.comment.model.vo.AdminCommentVO;
import cn.inkheap.module.comment.model.vo.CommentItemVO;
import com.mybatisflex.core.query.QueryWrapper;

import java.util.Map;

/**
 * 评论服务（前台一层盖楼 + 后台管理）。
 */
public interface CommentService {

    /**
     * 分页查询某内容下的评论：顶层倒序 + 回复正序（返回 {items,total,page,pageSize}）。
     *
     * @param request 查询请求（targetType / targetId 必填，pageSize 上限 50）
     * @return 分页结果
     */
    PageVO<CommentItemVO> list(CommentQueryRequest request);

    /**
     * 发表评论 / 回复：校验目标已发布、限流 5 条/分钟、回复通知邮件（失败不影响主流程）。
     *
     * @param userId  当前访客 id
     * @param request 请求
     * @param baseUrl 站点根地址（邮件链接兜底）
     * @return 新评论
     */
    CommentItemVO create(String userId, CreateCommentRequest request, String baseUrl);

    /**
     * 后台评论列表：分页 + 来源/用户筛选。
     *
     * @param request 查询请求（targetType / userId 可选）
     * @return 分页结果
     */
    PageVO<AdminCommentVO> adminList(CommentQueryRequest request);

    /**
     * 删除评论：顶层连带删除全部回复。
     *
     * @param id 主键
     * @return {deleted,cascaded}
     */
    Map<String, Object> adminDelete(String id);

    /**
     * 构建评论查询条件：目标、用户、父子层级与排序均由请求对象驱动。
     *
     * @param request 查询请求
     * @return 查询条件
     */
    QueryWrapper getQueryWrapper(CommentQueryRequest request);
}
