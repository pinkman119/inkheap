package cn.inkheap.module.category.service;

import cn.inkheap.module.category.entity.Category;

import java.util.List;

/**
 * 「最近使用的分类」（Redis 列表，所有管理员共享）。
 * Redis 不可用时降级为「按文章创建时间推导」。
 */
public interface RecentCategoryService {

    /**
     * 记录一次分类使用：去重后置顶，只保留最近的 5 条。
     *
     * @param categoryKey 分类 key
     */
    void push(String categoryKey);

    /**
     * 最近的分类（按使用时间倒序，已过滤删除的分类）。
     *
     * @return 分类列表
     */
    List<Category> list();
}
