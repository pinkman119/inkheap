package cn.inkheap.module.category.service.impl;

import cn.hutool.core.bean.BeanUtil;
import cn.hutool.core.util.IdUtil;
import cn.hutool.core.util.StrUtil;
import cn.inkheap.common.exception.BusinessException;
import cn.inkheap.module.article.entity.Article;
import cn.inkheap.module.article.mapper.ArticleMapper;
import cn.inkheap.module.category.entity.Category;
import cn.inkheap.module.category.mapper.CategoryMapper;
import cn.inkheap.module.category.model.dto.CategoryQueryRequest;
import cn.inkheap.module.category.model.dto.CategoryRequest;
import cn.inkheap.module.category.model.vo.CategoryVO;
import cn.inkheap.module.category.service.CategoryService;
import com.mybatisflex.core.query.QueryWrapper;
import com.mybatisflex.spring.service.impl.ServiceImpl;
import jakarta.annotation.Resource;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

@Service
public class CategoryServiceImpl extends ServiceImpl<CategoryMapper, Category> implements CategoryService {

    @Resource
    private ArticleMapper articleMapper;

    /** 允许排序的字段白名单（实体属性名），防止排序字段注入 */
    private static final Set<String> CATEGORY_SORT_FIELDS = Set.of("sortOrder", "name", "createdAt");

    @Override
    public List<CategoryVO> findAll(CategoryQueryRequest request) {
        // 1、按查询条件取分类列表（统一走 getQueryWrapper）
        List<Category> categories = this.list(getQueryWrapper(request));

        // 2、统计已发布文章在各分类上的直接数量
        QueryWrapper countWrapper = QueryWrapper.create()
                .select(Article::getCategoryKey)
                .select("count(*) as cnt")
                .where(Article::getPublished).eq(true)
                .and(Article::getType).eq("article")
                .groupBy(Article::getCategoryKey);
        List<Map> rows = articleMapper.selectListByQueryAs(countWrapper, Map.class);
        Map<String, Integer> directMap = new LinkedHashMap<>();
        for (Map<?, ?> row : rows) {
            Object key = row.get("category_key");
            Object cnt = row.get("cnt");
            if (key != null && cnt != null) {
                directMap.put(String.valueOf(key), Integer.parseInt(String.valueOf(cnt)));
            }
        }

        // 3、构造父子关系，递归求「含子孙」文章数
        Map<String, List<String>> childrenMap = new LinkedHashMap<>();
        Set<String> keys = new LinkedHashSet<>();
        categories.forEach(cat -> keys.add(cat.getKey()));
        categories.forEach(cat -> {
            if (StrUtil.isNotBlank(cat.getParentKey()) && keys.contains(cat.getParentKey())) {
                childrenMap.computeIfAbsent(cat.getParentKey(), k -> new ArrayList<>()).add(cat.getKey());
            }
        });
        Map<String, Integer> withChildrenMap = new LinkedHashMap<>();

        List<CategoryVO> result = new ArrayList<>(categories.size());
        for (Category category : categories) {
            CategoryVO vo = getVo(category);
            vo.setArticleCount(directMap.getOrDefault(category.getKey(), 0));
            vo.setArticleCountWithChildren(sumWithChildren(category.getKey(), directMap, childrenMap, withChildrenMap));
            result.add(vo);
        }
        return result;
    }

    @Override
    public List<CategoryVO> findTree() {
        // 1、取带统计的扁平列表（树需要全部分类，不附加过滤条件）
        List<CategoryVO> all = findAll(new CategoryQueryRequest());

        // 2、按 parentKey 组装树
        Map<String, CategoryVO> map = new LinkedHashMap<>();
        all.forEach(item -> {
            item.setChildren(new ArrayList<>());
            map.put(item.getKey(), item);
        });
        List<CategoryVO> roots = new ArrayList<>();
        for (CategoryVO item : all) {
            CategoryVO parent = item.getParentKey() == null ? null : map.get(item.getParentKey());
            if (parent != null) {
                parent.getChildren().add(item);
            } else {
                roots.add(item);
            }
        }
        return roots;
    }

    @Override
    public Category findOne(String id) {
        Category category = this.getById(id);
        if (category == null) {
            throw BusinessException.notFound("分类不存在");
        }
        return category;
    }

    @Override
    public Category create(CategoryRequest request) {
        // 1、key 唯一校验
        Category existing = this.getOne(QueryWrapper.create().eq(Category::getKey, request.getKey()));
        if (existing != null) {
            throw BusinessException.conflict("分类 key 已存在");
        }

        // 2、构建实体并入库（Builder 一次性构造）
        Category category = Category.builder()
                .id(IdUtil.randomUUID())
                .key(request.getKey())
                .name(request.getName())
                .parentKey(request.getParentKey())
                .icon(request.getIcon())
                .sortOrder(request.getSortOrder() == null ? 0 : request.getSortOrder())
                .createdAt(Instant.now())
                .updatedAt(Instant.now())
                .build();
        this.save(category);
        return category;
    }

    @Override
    public Category update(String id, CategoryRequest request) {
        // 1、确认存在
        findOne(id);

        // 2、仅更新传入字段（Builder 构造，null 字段由 updateById 忽略）
        Category update = Category.builder()
                .id(id)
                .key(request.getKey())
                .name(request.getName())
                .parentKey(request.getParentKey())
                .sortOrder(request.getSortOrder())
                .icon(request.getIcon())
                .updatedAt(Instant.now())
                .build();
        this.updateById(update);
        return findOne(id);
    }

    @Override
    public Map<String, Object> remove(String id) {
        // 1、确认存在
        Category category = findOne(id);

        // 2、有文章引用时禁止删除
        long articleCount = articleMapper.selectCountByQuery(
                QueryWrapper.create().eq(Article::getCategoryKey, category.getKey()));
        if (articleCount > 0) {
            throw BusinessException.conflict("该分类下有 " + articleCount + " 篇文章，无法删除");
        }

        // 3、删除
        this.removeById(id);
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("message", "删除成功");
        return result;
    }

    @Override
    public List<String> collectDescendantKeys(String rootKey) {
        // 1、广度优先展开子分类（防环：最多 20 层）
        List<String> keys = new ArrayList<>();
        keys.add(rootKey);
        List<String> frontier = List.of(rootKey);
        for (int depth = 0; depth < 20 && !frontier.isEmpty(); depth++) {
            List<Category> children = this.list(QueryWrapper.create().in(Category::getParentKey, frontier));
            List<String> next = new ArrayList<>();
            for (Category child : children) {
                if (!keys.contains(child.getKey())) {
                    next.add(child.getKey());
                }
            }
            if (next.isEmpty()) {
                break;
            }
            keys.addAll(next);
            frontier = next;
        }
        return keys;
    }

    @Override
    public CategoryVO getVo(Category entity) {
        if (entity == null) {
            return null;
        }
        CategoryVO vo = new CategoryVO();
        BeanUtil.copyProperties(entity, vo);
        return vo;
    }

    @Override
    public List<CategoryVO> getVoList(List<Category> entities) {
        List<CategoryVO> list = new ArrayList<>();
        for (Category entity : entities) {
            list.add(getVo(entity));
        }
        return list;
    }

    @Override
    public QueryWrapper getQueryWrapper(CategoryQueryRequest request) {
        // 1、基础条件：id / key / 父分类精确匹配，名称模糊匹配
        QueryWrapper wrapper = QueryWrapper.create()
                .eq(Category::getId, request.getId(), StrUtil.isNotBlank(request.getId()))
                .eq(Category::getKey, request.getKey(), StrUtil.isNotBlank(request.getKey()))
                .eq(Category::getParentKey, request.getParentKey(), StrUtil.isNotBlank(request.getParentKey()))
                .like(Category::getName, request.getName(), StrUtil.isNotBlank(request.getName()));

        // 2、排序：sortField 命中白名单时按其排序，否则 sortOrder + name 升序
        String sortColumn = request.resolveSortColumn(CATEGORY_SORT_FIELDS);
        if (sortColumn != null) {
            wrapper.orderBy(sortColumn, request.sortAsc());
        } else {
            wrapper.orderBy(Category::getSortOrder, true).orderBy(Category::getName, true);
        }
        return wrapper;
    }

    private int sumWithChildren(String key,
                                Map<String, Integer> directMap,
                                Map<String, List<String>> childrenMap,
                                Map<String, Integer> memo) {
        Integer cached = memo.get(key);
        if (cached != null) {
            return cached;
        }
        int sum = directMap.getOrDefault(key, 0);
        for (String child : childrenMap.getOrDefault(key, List.of())) {
            sum += sumWithChildren(child, directMap, childrenMap, memo);
        }
        memo.put(key, sum);
        return sum;
    }
}
