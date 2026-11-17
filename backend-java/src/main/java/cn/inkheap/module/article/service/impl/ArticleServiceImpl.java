package cn.inkheap.module.article.service.impl;

import cn.hutool.core.bean.BeanUtil;
import cn.hutool.core.util.IdUtil;
import cn.hutool.core.util.StrUtil;
import cn.inkheap.common.exception.BusinessException;
import cn.inkheap.common.response.PageVO;
import cn.inkheap.common.util.JsonUtils;
import cn.inkheap.module.article.entity.Article;
import cn.inkheap.module.article.mapper.ArticleMapper;
import cn.inkheap.module.article.mapper.ArticleSearchMapper;
import cn.inkheap.module.article.model.dto.ArticleQueryRequest;
import cn.inkheap.module.article.model.dto.ArticleRequest;
import cn.inkheap.module.article.model.vo.ArticleVO;
import cn.inkheap.module.article.service.ArticleService;
import cn.inkheap.module.category.service.CategoryService;
import cn.inkheap.module.category.service.RecentCategoryService;
import cn.inkheap.module.digitallife.constant.RefTypes;
import cn.inkheap.module.digitallife.service.SummaryService;
import cn.inkheap.module.digitallife.service.TrainingService;
import cn.inkheap.module.view.service.ViewService;
import com.mybatisflex.core.paginate.Page;
import com.mybatisflex.core.query.QueryWrapper;
import com.mybatisflex.spring.service.impl.ServiceImpl;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

@Service
@RequiredArgsConstructor
public class ArticleServiceImpl extends ServiceImpl<ArticleMapper, Article> implements ArticleService {

    private final ArticleSearchMapper articleSearchMapper;

    private final CategoryService categoryService;

    private final RecentCategoryService recentCategoryService;

    private final ViewService viewService;

    private final TrainingService trainingService;

    private final SummaryService summaryService;

    /** 允许排序的字段白名单（实体属性名），防止排序字段注入 */
    private static final Set<String> ARTICLE_SORT_FIELDS =
            Set.of("createdAt", "updatedAt", "viewCount", "sortOrder", "title");

    /** 空结果哨兵：条件必然不成立时使用，避免拼出 IN () 语法错误 */
    private static final String NONE_VALUE = "__none__";

    @Override
    public PageVO<ArticleVO> findAll(ArticleQueryRequest request) {
        int page = request.pageOrDefault();
        int pageSize = request.pageSizeOrDefault();

        // 1、查询条件统一由 getQueryWrapper 构建
        QueryWrapper wrapper = getQueryWrapper(request);

        // 2、分页查询并转 VO
        Page<Article> result = this.page(Page.of(page, pageSize), wrapper);

        return PageVO.of(getVoList(result.getRecords()), result.getTotalRow(), page, pageSize);
    }

    @Override
    public ArticleVO findOne(String id) {
        Article article = this.getById(id);
        if (article == null) {
            throw BusinessException.notFound("文章不存在");
        }
        return getVo(article);
    }

    @Override
    public ArticleVO findOneBySlug(String slug, String ip) {
        // 1、按 slug + type=article 查询
        Article article = this.getOne(QueryWrapper.create()
                .eq(Article::getSlug, slug)
                .eq(Article::getType, "article"));

        // 2、未发布或不存在统一返回约定文案（前端按该文案判定 404 页）
        if (article == null || !Boolean.TRUE.equals(article.getPublished())) {
            throw BusinessException.notFound("文章不存在或未发布");
        }

        // 3、记录阅读量（同一 IP 每天最多一次）
        viewService.record("article", article.getId(), ip);

        return getVo(article);
    }

    @Override
    public ArticleVO create(ArticleRequest request) {
        // 1、slug 与排序位置：新文章取当前最小 sortOrder - 1
        String slug = StrUtil.isNotBlank(request.getSlug()) ? request.getSlug() : generateSlug(request.getTitle());
        Article first = this.getOne(QueryWrapper.create()
                .select(Article::getSortOrder)
                .orderBy(Article::getSortOrder, true)
                .limit(1));
        int sortOrder = (first == null || first.getSortOrder() == null ? 1 : first.getSortOrder()) - 1;

        // 2、构建实体并入库（Builder 一次性构造，避免逐行 set）
        Article article = Article.builder()
                .id(IdUtil.randomUUID())
                .slug(slug)
                .title(request.getTitle())
                .summary(request.getSummary())
                .content(request.getContent())
                .coverImage(normalizeCover(request.getCoverImage()))
                .categoryKey(request.getCategoryKey())
                .tags(JsonUtils.toJson(request.getTags() == null ? new ArrayList<>() : request.getTags()))
                .author(request.getAuthor())
                .authorUrl(request.getAuthorUrl())
                .published(request.getPublished() != null && request.getPublished())
                .featured(request.getFeatured() != null && request.getFeatured())
                .type(StrUtil.isBlank(request.getType()) ? "article" : request.getType())
                .virtualViewCount(request.getVirtualViewCount())
                .sortOrder(sortOrder)
                .viewCount(0)
                .trainType(0)
                .createdAt(Instant.now())
                .updatedAt(Instant.now())
                .build();
        this.save(article);

        // 3、记录最近使用的分类
        recentCategoryService.push(article.getCategoryKey());

        return getVo(article);
    }

    @Override
    public ArticleVO update(String id, ArticleRequest request) {
        // 1、确认文章存在
        Article current = this.getById(id);
        if (current == null) {
            throw BusinessException.notFound("文章不存在");
        }

        // 2、标题变化且未指定 slug 时重新生成，其余字段按「传了才更新」的语义处理
        boolean regenerateSlug = StrUtil.isNotBlank(request.getTitle()) && StrUtil.isBlank(request.getSlug());
        Article update = Article.builder()
                .id(id)
                .slug(regenerateSlug ? generateSlug(request.getTitle()) : request.getSlug())
                .title(request.getTitle())
                .summary(request.getSummary())
                .content(request.getContent())
                .coverImage(request.getCoverImage() == null ? null : normalizeCover(request.getCoverImage()))
                .categoryKey(request.getCategoryKey())
                .tags(request.getTags() == null ? null : JsonUtils.toJson(request.getTags()))
                .author(request.getAuthor())
                .authorUrl(request.getAuthorUrl())
                .published(request.getPublished())
                .featured(request.getFeatured())
                .type(request.getType())
                .virtualViewCount(request.getVirtualViewCount())
                .updatedAt(Instant.now())
                .build();
        this.updateById(update);

        // 3、数字生命：已训练数据被编辑 → 删向量并重置 trainType
        trainingService.invalidateIfTrained(RefTypes.ARTICLE, id);

        // 4、记录最近使用的分类
        Article latest = this.getById(id);
        recentCategoryService.push(latest.getCategoryKey());

        return getVo(latest);
    }

    @Override
    public Map<String, Object> remove(String id) {
        // 1、确认存在
        findOne(id);

        // 2、清向量 + 删记录
        trainingService.invalidateByRef(RefTypes.ARTICLE, id);
        this.removeById(id);

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("message", "删除成功");
        return result;
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public Map<String, Object> reorder(List<String> ids) {
        // 1、去重并过滤空值
        List<String> orderedIds = new ArrayList<>();
        if (ids != null) {
            for (String id : ids) {
                if (StrUtil.isNotBlank(id) && !orderedIds.contains(id)) {
                    orderedIds.add(id);
                }
            }
        }
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("message", "顺序已更新");
        if (orderedIds.size() <= 1) {
            return result;
        }

        // 2、历史数据 sortOrder 全为 0 时先整体归一化，否则槽位重复会导致拖拽无效
        ensureSortOrderNormalized();

        // 3、取出可见文章当前槽位（升序），按目标顺序重新分配
        List<Article> rows = this.list(QueryWrapper.create().in(Article::getId, orderedIds));
        Map<String, Article> byId = new LinkedHashMap<>();
        rows.forEach(row -> byId.put(row.getId(), row));
        List<String> validIds = orderedIds.stream().filter(byId::containsKey).toList();
        if (validIds.size() <= 1) {
            return result;
        }
        List<Integer> slots = new ArrayList<>();
        for (String id : validIds) {
            slots.add(byId.get(id).getSortOrder() == null ? 0 : byId.get(id).getSortOrder());
        }
        slots.sort(Integer::compareTo);

        // 4、写回 sortOrder，并显式保持原 updated_at（避免拖拽把文章顶到首页动态最前）
        for (int i = 0; i < validIds.size(); i++) {
            Article origin = byId.get(validIds.get(i));
            Article update = Article.builder()
                    .id(origin.getId())
                    .sortOrder(slots.get(i))
                    .updatedAt(origin.getUpdatedAt())
                    .build();
            this.updateById(update);
        }
        return result;
    }

    @Override
    public Map<String, Object> generateSummary(String content, String title) {
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("summary", summaryService.generate(content, title));
        return result;
    }

    @Override
    public PageVO<ArticleVO> findLatestUpdated(ArticleQueryRequest request) {
        int page = request.pageOrDefault();
        int pageSize = request.pageSizeOrDefault();

        // 1、固定按 createdAt 倒序（阅读量自增不刷新 updated_at，但 createdAt 才是「动态」语义）
        QueryWrapper wrapper = QueryWrapper.create()
                .eq(Article::getPublished, true)
                .eq(Article::getType, "article")
                .orderBy(Article::getCreatedAt, false);
        Page<Article> result = this.page(Page.of(page, pageSize), wrapper);

        return PageVO.of(getVoList(result.getRecords()), result.getTotalRow(), page, pageSize);
    }

    @Override
    public ArticleVO getVo(Article entity) {
        if (entity == null) {
            return null;
        }
        return ArticleVO.builder()
                .id(entity.getId())
                .slug(entity.getSlug())
                .title(entity.getTitle())
                .summary(entity.getSummary())
                .content(entity.getContent())
                .coverImage(entity.getCoverImage())
                .categoryKey(entity.getCategoryKey())
                .tags(JsonUtils.parseStringList(entity.getTags()))
                .author(entity.getAuthor())
                .authorUrl(entity.getAuthorUrl())
                .published(entity.getPublished())
                .featured(entity.getFeatured())
                .viewCount(entity.getViewCount())
                .virtualViewCount(entity.getVirtualViewCount())
                .displayViewCount(resolveDisplayViews(entity.getViewCount(), entity.getVirtualViewCount()))
                .type(entity.getType())
                .sortOrder(entity.getSortOrder())
                .createdAt(entity.getCreatedAt())
                .updatedAt(entity.getUpdatedAt())
                .trainType(entity.getTrainType())
                .build();
    }

    @Override
    public List<ArticleVO> getVoList(List<Article> entities) {
        List<ArticleVO> list = new ArrayList<>();
        for (Article entity : entities) {
            list.add(getVo(entity));
        }
        return list;
    }

    @Override
    public QueryWrapper getQueryWrapper(ArticleQueryRequest request) {
        // 1、基础条件：type 固定 article；status=draft 才查草稿（与原有行为一致，all 不含草稿）
        QueryWrapper wrapper = QueryWrapper.create()
                .eq(Article::getId, request.getId(), StrUtil.isNotBlank(request.getId()))
                .eq(Article::getSlug, request.getSlug(), StrUtil.isNotBlank(request.getSlug()))
                .eq(Article::getAuthor, request.getAuthor(), StrUtil.isNotBlank(request.getAuthor()))
                .eq(Article::getType, "article")
                .eq(Article::getPublished, !"draft".equals(request.getStatus()));

        // 2、分类：父分类展开为「自身 + 全部后代」，无有效 key 时用哨兵条件返回空集
        if (StrUtil.isNotBlank(request.getCategoryKey())) {
            Set<String> keys = new LinkedHashSet<>();
            for (String key : request.getCategoryKey().split(",")) {
                String trimmed = key.trim();
                if (!trimmed.isEmpty()) {
                    keys.addAll(categoryService.collectDescendantKeys(trimmed));
                }
            }
            wrapper.in(Article::getCategoryKey, keys.isEmpty() ? List.of(NONE_VALUE) : keys);
        }

        // 3、关键词：先查出命中的 id 再走 in，避免 OR 条件与外层条件优先级冲突
        if (StrUtil.isNotBlank(request.getSearch())) {
            List<String> ids = articleSearchMapper.searchIds("%" + request.getSearch().trim() + "%");
            wrapper.in(Article::getId, ids.isEmpty() ? List.of(NONE_VALUE) : ids);
        }

        // 4、排序：sortField 命中白名单时按其排序，否则 sortOrder 升序 + createdAt 倒序
        String sortColumn = request.resolveSortColumn(ARTICLE_SORT_FIELDS);
        if (sortColumn != null) {
            wrapper.orderBy(sortColumn, request.sortAsc());
        } else {
            wrapper.orderBy(Article::getSortOrder, true).orderBy(Article::getCreatedAt, false);
        }
        return wrapper;
    }

    /**
     * 归一化全库 sortOrder：仅在检测到重复值时按当前展示顺序重排为 0..n-1。
     */
    private void ensureSortOrderNormalized() {
        long total = this.count();
        if (total <= 1) {
            return;
        }
        QueryWrapper distinctWrapper = QueryWrapper.create()
                .select("count(distinct sort_order) as distinct_count");
        List<Map> rows = this.getMapper().selectListByQueryAs(distinctWrapper, Map.class);
        Object distinctCount = rows.isEmpty() ? null : rows.get(0).get("distinct_count");
        if (distinctCount != null && Long.parseLong(String.valueOf(distinctCount)) == total) {
            return;
        }

        List<Article> ordered = this.list(QueryWrapper.create()
                .orderBy(Article::getSortOrder, true)
                .orderBy(Article::getCreatedAt, false));
        for (int index = 0; index < ordered.size(); index++) {
            Article article = ordered.get(index);
            if (article.getSortOrder() != null && article.getSortOrder() == index) {
                continue;
            }
            Article update = Article.builder()
                    .id(article.getId())
                    .sortOrder(index)
                    .updatedAt(article.getUpdatedAt())
                    .build();
            this.updateById(update);
        }
    }

    private Integer resolveDisplayViews(Integer viewCount, Integer virtualViewCount) {
        int real = viewCount == null ? 0 : viewCount;
        if (virtualViewCount == null) {
            return real;
        }
        return virtualViewCount >= 0 ? virtualViewCount : real;
    }

    private String normalizeCover(String cover) {
        String value = cover == null ? "" : cover.trim();
        return value.isEmpty() ? null : value;
    }

    /**
     * slug 生成：标题小写 → 空格转 - → 去掉特殊字符 → 拼 base36 时间戳。
     */
    private String generateSlug(String title) {
        String base = StrUtil.nullToEmpty(title).toLowerCase()
                .replaceAll("\\s+", "-")
                .replaceAll("[^\\w\\-\\u4e00-\\u9fa5]+", "")
                .replaceAll("-{2,}", "-")
                .replaceAll("^-|-$", "");
        return base + "-" + Long.toString(System.currentTimeMillis(), 36);
    }
}
