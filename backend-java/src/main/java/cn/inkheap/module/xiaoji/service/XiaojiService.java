package cn.inkheap.module.xiaoji.service;

import cn.inkheap.common.response.ListPageVO;
import cn.inkheap.module.xiaoji.entity.Blog;
import cn.inkheap.module.xiaoji.model.dto.XiaojiQueryRequest;
import cn.inkheap.module.xiaoji.model.dto.XiaojiRequest;
import cn.inkheap.module.xiaoji.model.vo.BlogDetailVO;
import cn.inkheap.module.xiaoji.model.vo.BlogVO;
import com.mybatisflex.core.query.QueryWrapper;

import java.util.List;
import java.util.Map;

/**
 * 小记服务。
 */
public interface XiaojiService {

    /**
     * 已发布小记列表，可按分类（tags 中的值）筛选；按 date 倒序 + createdAt 倒序。
     *
     * @param tag 分类名
     * @return 小记列表
     */
    List<BlogVO> findPublished(String tag);

    /**
     * 按 slug 获取已发布小记详情，附 prev / next 导航，并记录阅读量。
     *
     * @param slug 小记 slug
     * @param ip   客户端 IP
     * @return 详情
     */
    BlogDetailVO findBySlug(String slug, String ip);

    /**
     * 统计：总篇数 / 相册数 / 照片数。
     *
     * @return 统计结果
     */
    Map<String, Object> getStats();

    /**
     * 分类列表：优先返回已用分类（带 count），再补分类表中未使用项。
     *
     * @return 分类列表
     */
    List<Map<String, Object>> getCategories();

    /**
     * 后台列表：键为 list（前端按 list 取值），按 updatedAt 倒序。
     *
     * @param request 查询参数
     * @return 分页结果
     */
    ListPageVO<BlogVO> findAll(XiaojiQueryRequest request);

    /**
     * 后台按 id 查询，不存在抛 404「小记不存在」。
     *
     * @param id 主键
     * @return 小记
     */
    BlogVO findOne(String id);

    /**
     * 新建小记：分类自动落库、slug 唯一化、足迹绑定。
     *
     * @param request 请求
     * @return 新小记
     */
    BlogVO create(XiaojiRequest request);

    /**
     * 更新小记：照片数量以更新后的最终状态校验，修改后触发训练失效。
     *
     * @param id      主键
     * @param request 请求
     * @return 更新后的小记
     */
    BlogVO update(String id, XiaojiRequest request);

    /**
     * 删除小记：解绑足迹、清除向量。
     *
     * @param id 主键
     * @return 结果
     */
    Map<String, Object> remove(String id);

    /**
     * 自动生成摘要。
     *
     * @param content 正文
     * @param title   标题
     * @return {summary}
     */
    Map<String, Object> generateSummary(String content, String title);

    /**
     * 实体转 VO（tags / photos 解析 + displayViewCount）。
     *
     * @param entity 实体
     * @return VO
     */
    BlogVO getVo(Blog entity);

    /**
     * 实体列表转 VO 列表。
     *
     * @param entities 实体列表
     * @return VO 列表
     */
    List<BlogVO> getVoList(List<Blog> entities);

    /**
     * 构建小记查询条件：状态、类型、标签、关键词、排序均由请求对象驱动。
     *
     * @param request 查询请求
     * @return 查询条件
     */
    QueryWrapper getQueryWrapper(XiaojiQueryRequest request);
}
