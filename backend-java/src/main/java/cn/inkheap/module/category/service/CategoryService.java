package cn.inkheap.module.category.service;

import cn.inkheap.module.category.entity.Category;
import cn.inkheap.module.category.model.dto.CategoryQueryRequest;
import cn.inkheap.module.category.model.dto.CategoryRequest;
import cn.inkheap.module.category.model.vo.CategoryVO;
import com.mybatisflex.core.query.QueryWrapper;

import java.util.List;
import java.util.Map;

/**
 * 文章分类服务。
 */
public interface CategoryService {

    /**
     * 分类列表（含直接文章数与含子孙文章数），排序由查询对象驱动，默认 sortOrder + name。
     *
     * @param request 查询请求
     * @return 分类列表
     */
    List<CategoryVO> findAll(CategoryQueryRequest request);

    /**
     * 分类树（children 递归）。
     *
     * @return 树
     */
    List<CategoryVO> findTree();

    /**
     * 按 id 查询，不存在抛 404「分类不存在」。
     *
     * @param id 主键
     * @return 分类
     */
    Category findOne(String id);

    /**
     * 新建分类：key 重复返回 409「分类 key 已存在」。
     *
     * @param request 请求
     * @return 新分类
     */
    Category create(CategoryRequest request);

    /**
     * 更新分类。
     *
     * @param id      主键
     * @param request 请求
     * @return 更新后的分类
     */
    Category update(String id, CategoryRequest request);

    /**
     * 删除分类：有文章引用时返回 409。
     *
     * @param id 主键
     * @return 结果消息
     */
    Map<String, Object> remove(String id);

    /**
     * 收集某分类自身及全部后代分类的 key（供文章列表按父分类筛选）。
     *
     * @param rootKey 根分类 key
     * @return key 集合
     */
    List<String> collectDescendantKeys(String rootKey);

    /**
     * 实体转 VO。
     *
     * @param entity 实体
     * @return VO
     */
    CategoryVO getVo(Category entity);

    /**
     * 实体列表转 VO 列表。
     *
     * @param entities 实体列表
     * @return VO 列表
     */
    List<CategoryVO> getVoList(List<Category> entities);

    /**
     * 构建分类查询条件：id / key / 名称 / 父分类与排序均由请求对象驱动。
     *
     * @param request 查询请求
     * @return 查询条件
     */
    QueryWrapper getQueryWrapper(CategoryQueryRequest request);
}
