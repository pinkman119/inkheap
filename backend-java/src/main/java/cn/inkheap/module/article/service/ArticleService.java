package cn.inkheap.module.article.service;

import cn.inkheap.common.response.PageVO;
import cn.inkheap.module.article.entity.Article;
import cn.inkheap.module.article.model.dto.ArticleQueryRequest;
import cn.inkheap.module.article.model.dto.ArticleRequest;
import cn.inkheap.module.article.model.vo.ArticleVO;
import com.mybatisflex.core.query.QueryWrapper;

import java.util.List;
import java.util.Map;

/**
 * 文章服务。
 */
public interface ArticleService {

    /**
     * 文章列表（后台与前台共用）：强制 type=article；status=draft 时查草稿，其余强制已发布。
     * 排序：sortOrder 升序 + createdAt 倒序。
     *
     * @param request 查询参数
     * @return 分页结果
     */
    PageVO<ArticleVO> findAll(ArticleQueryRequest request);

    /**
     * 后台按 id 查询，不存在抛 404「文章不存在」。
     *
     * @param id 主键
     * @return 文章
     */
    ArticleVO findOne(String id);

    /**
     * 前台按 slug 查询已发布知识库文章，并记录阅读量（IP + 自然日去重）。
     *
     * @param slug 文章 slug
     * @param ip   客户端 IP
     * @return 文章
     */
    ArticleVO findOneBySlug(String slug, String ip);

    /**
     * 新建文章：slug 自动生成，sortOrder 取当前最小值 - 1（新文章排最前）。
     *
     * @param request 请求
     * @return 新文章
     */
    ArticleVO create(ArticleRequest request);

    /**
     * 更新文章：标题变化且未指定 slug 时重新生成 slug；触发训练失效。
     *
     * @param id      主键
     * @param request 请求
     * @return 更新后的文章
     */
    ArticleVO update(String id, ArticleRequest request);

    /**
     * 删除文章：清除其向量。
     *
     * @param id 主键
     * @return 结果消息
     */
    Map<String, Object> remove(String id);

    /**
     * 批量调整顺序：复用原有 sortOrder 槽位按新顺序重新分配，不改变 updated_at。
     *
     * @param ids 拖拽后的目标顺序
     * @return 结果消息
     */
    Map<String, Object> reorder(List<String> ids);

    /**
     * 自动生成摘要。
     *
     * @param content 正文
     * @param title   标题
     * @return {summary}
     */
    Map<String, Object> generateSummary(String content, String title);

    /**
     * 首页「动态」列表：已发布知识库文章按 createdAt 倒序。
     *
     * @param request 查询参数
     * @return 分页结果
     */
    PageVO<ArticleVO> findLatestUpdated(ArticleQueryRequest request);

    /**
     * 实体转 VO（tags 解析为数组 + displayViewCount）。
     *
     * @param entity 实体
     * @return VO
     */
    ArticleVO getVo(Article entity);

    /**
     * 实体列表转 VO 列表。
     *
     * @param entities 实体列表
     * @return VO 列表
     */
    List<ArticleVO> getVoList(List<Article> entities);

    /**
     * 构建文章查询条件：type 固定、发布状态、分类展开、关键词、排序均由请求对象驱动。
     *
     * @param request 查询请求
     * @return 查询条件
     */
    QueryWrapper getQueryWrapper(ArticleQueryRequest request);
}
