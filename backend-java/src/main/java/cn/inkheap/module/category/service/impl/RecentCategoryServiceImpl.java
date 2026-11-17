package cn.inkheap.module.category.service.impl;

import cn.inkheap.module.article.entity.Article;
import cn.inkheap.module.article.mapper.ArticleMapper;
import cn.inkheap.module.category.entity.Category;
import cn.inkheap.module.category.mapper.CategoryMapper;
import cn.inkheap.module.category.service.RecentCategoryService;
import com.mybatisflex.core.query.QueryWrapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Redis 列表实现；Redis 不可用时降级为按文章创建时间推导（可用性优先，语义一致）。
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class RecentCategoryServiceImpl implements RecentCategoryService {

    private static final String KEY = "article:recent-cats";

    private static final int LIMIT = 5;

    private final StringRedisTemplate redisTemplate;

    private final CategoryMapper categoryMapper;

    private final ArticleMapper articleMapper;

    @Override
    public void push(String categoryKey) {
        if (categoryKey == null || categoryKey.isEmpty()) {
            return;
        }
        try {
            // 1、去重后置顶，裁剪到 5 条
            redisTemplate.opsForList().remove(KEY, 0, categoryKey);
            redisTemplate.opsForList().leftPush(KEY, categoryKey);
            redisTemplate.opsForList().trim(KEY, 0, LIMIT - 1);
        } catch (Exception e) {
            // 2、Redis 不可用时降级跳过，不影响保存
            log.warn("Redis 不可用，本次使用记录跳过: {}", e.getMessage());
        }
    }

    @Override
    public List<Category> list() {
        // 1、优先读 Redis 列表
        List<String> keys = readKeys();

        // 2、列表为空时按文章数据推导
        if (keys.isEmpty()) {
            keys = fallbackKeys();
        }

        // 3、按顺序解析为分类对象（丢弃已删除的分类）
        if (keys.isEmpty()) {
            return new ArrayList<>();
        }
        List<Category> categories = categoryMapper.selectListByQuery(
                QueryWrapper.create().in(Category::getKey, keys));
        Map<String, Category> map = new LinkedHashMap<>();
        categories.forEach(category -> map.put(category.getKey(), category));
        List<Category> result = new ArrayList<>();
        for (String key : keys) {
            Category category = map.get(key);
            if (category != null) {
                result.add(category);
            }
        }
        return result;
    }

    private List<String> readKeys() {
        try {
            List<String> keys = redisTemplate.opsForList().range(KEY, 0, LIMIT - 1);
            if (keys == null) {
                return new ArrayList<>();
            }
            return keys.stream().filter(key -> key != null && !key.isEmpty()).toList();
        } catch (Exception e) {
            log.warn("Redis 不可用，最近使用分类按文章数据推导: {}", e.getMessage());
            return new ArrayList<>();
        }
    }

    private List<String> fallbackKeys() {
        // 1、取最近创建的 100 篇文章，按创建时间倒序
        List<Article> articles = articleMapper.selectListByQuery(QueryWrapper.create()
                .select(Article::getCategoryKey)
                .eq(Article::getType, "article")
                .orderBy(Article::getCreatedAt, false)
                .limit(100));

        // 2、去重后取前 5 个分类
        List<String> keys = new ArrayList<>();
        for (Article article : articles) {
            String key = article.getCategoryKey();
            if (key != null && !keys.contains(key)) {
                keys.add(key);
            }
            if (keys.size() >= LIMIT) {
                break;
            }
        }
        return keys;
    }
}
