package cn.inkheap.module.xiaoji.service.impl;

import cn.hutool.core.bean.BeanUtil;
import cn.hutool.core.util.IdUtil;
import cn.hutool.core.util.StrUtil;
import cn.inkheap.common.exception.BusinessException;
import cn.inkheap.common.response.ListPageVO;
import cn.inkheap.common.util.JsonUtils;
import cn.inkheap.module.about.entity.AboutFootprint;
import cn.inkheap.module.about.mapper.AboutFootprintMapper;
import cn.inkheap.module.digitallife.constant.RefTypes;
import cn.inkheap.module.digitallife.service.SummaryService;
import cn.inkheap.module.digitallife.service.TrainingService;
import cn.inkheap.module.view.service.ViewService;
import cn.inkheap.module.xiaoji.entity.Blog;
import cn.inkheap.module.xiaoji.entity.BlogCategory;
import cn.inkheap.module.xiaoji.mapper.BlogCategoryMapper;
import cn.inkheap.module.xiaoji.mapper.BlogMapper;
import cn.inkheap.module.xiaoji.mapper.BlogSearchMapper;
import cn.inkheap.module.xiaoji.model.dto.XiaojiQueryRequest;
import cn.inkheap.module.xiaoji.model.dto.XiaojiRequest;
import cn.inkheap.module.xiaoji.model.vo.BlogCardVO;
import cn.inkheap.module.xiaoji.model.vo.BlogDetailVO;
import cn.inkheap.module.xiaoji.model.vo.BlogVO;
import cn.inkheap.module.xiaoji.service.XiaojiService;
import com.mybatisflex.core.paginate.Page;
import com.mybatisflex.core.query.QueryWrapper;
import com.mybatisflex.spring.service.impl.ServiceImpl;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

@Slf4j
@Service
@RequiredArgsConstructor
public class XiaojiServiceImpl extends ServiceImpl<BlogMapper, Blog> implements XiaojiService {

    /** 随笔最多 9 张照片；相册（album）不限 */
    private static final int XIAOJI_MAX_PHOTOS = 9;

    /** 允许排序的字段白名单（实体属性名），防止排序字段注入 */
    private static final Set<String> XIAOJI_SORT_FIELDS =
            Set.of("createdAt", "updatedAt", "viewCount", "date", "title");

    /** 空结果哨兵：条件必然不成立时使用，避免拼出 IN () 语法错误 */
    private static final String NONE_VALUE = "__none__";

    private final BlogCategoryMapper blogCategoryMapper;

    private final BlogSearchMapper blogSearchMapper;

    private final AboutFootprintMapper aboutFootprintMapper;

    private final ViewService viewService;

    private final TrainingService trainingService;

    private final SummaryService summaryService;

    @Override
    public List<BlogVO> findPublished(String tag) {
        // 1、仅已发布
        QueryWrapper wrapper = QueryWrapper.create().eq(Blog::getPublished, true);

        // 2、按分类筛选：tags 为 JSON 字符串，用 substring 匹配
        if (StrUtil.isNotBlank(tag)) {
            wrapper.like(Blog::getTags, "\"" + tag + "\"");
        }

        // 3、按日期倒序 + 创建时间倒序
        wrapper.orderBy(Blog::getDate, false).orderBy(Blog::getCreatedAt, false);
        return getVoList(this.list(wrapper));
    }

    @Override
    public BlogDetailVO findBySlug(String slug, String ip) {
        // 1、查询已发布小记
        Blog blog = this.getOne(QueryWrapper.create()
                .eq(Blog::getSlug, slug)
                .eq(Blog::getPublished, true));
        if (blog == null) {
            throw BusinessException.notFound("小记不存在或未发布");
        }

        // 2、记录阅读量（同一 IP 每天最多一次）
        viewService.record("note", blog.getId(), ip);

        // 3、按同一排序口径计算 prev / next
        List<Blog> all = this.list(QueryWrapper.create()
                .eq(Blog::getPublished, true)
                .orderBy(Blog::getDate, false)
                .orderBy(Blog::getCreatedAt, false));
        int index = -1;
        for (int i = 0; i < all.size(); i++) {
            if (all.get(i).getId().equals(blog.getId())) {
                index = i;
                break;
            }
        }

        BlogDetailVO detail = new BlogDetailVO();
        BeanUtil.copyProperties(getVo(blog), detail, "prev", "next");
        detail.setPrev(index > 0 ? toCard(all.get(index - 1)) : null);
        detail.setNext(index >= 0 && index < all.size() - 1 ? toCard(all.get(index + 1)) : null);
        return detail;
    }

    @Override
    public Map<String, Object> getStats() {
        // 1、统计已发布小记
        List<Blog> blogs = this.list(QueryWrapper.create().eq(Blog::getPublished, true));
        int photos = 0;
        long albums = 0;
        for (Blog blog : blogs) {
            photos += JsonUtils.parseMapList(blog.getPhotos()).size();
            if ("album".equals(blog.getType())) {
                albums++;
            }
        }

        Map<String, Object> stats = new LinkedHashMap<>();
        stats.put("total", blogs.size());
        stats.put("albums", albums);
        stats.put("photos", photos);
        return stats;
    }

    @Override
    public List<Map<String, Object>> getCategories() {
        // 1、统计已发布小记实际使用的分类
        List<Blog> blogs = this.list(QueryWrapper.create().eq(Blog::getPublished, true));
        Map<String, Integer> counts = new LinkedHashMap<>();
        for (Blog blog : blogs) {
            for (String tag : JsonUtils.parseStringList(blog.getTags())) {
                counts.merge(tag, 1, Integer::sum);
            }
        }

        List<Map<String, Object>> used = new ArrayList<>();
        for (Map.Entry<String, Integer> entry : counts.entrySet()) {
            Map<String, Object> item = new LinkedHashMap<>();
            item.put("key", entry.getKey());
            item.put("name", entry.getKey());
            item.put("count", entry.getValue());
            used.add(item);
        }

        // 2、补充分类表中未被使用的项（count = 0）
        List<BlogCategory> rest = blogCategoryMapper.selectListByQuery(
                QueryWrapper.create().orderBy(BlogCategory::getCreatedAt, true));
        for (BlogCategory category : rest) {
            if (counts.containsKey(category.getKey())) {
                continue;
            }
            Map<String, Object> item = new LinkedHashMap<>();
            item.put("key", category.getKey());
            item.put("name", category.getName());
            item.put("count", 0);
            used.add(item);
        }
        return used;
    }

    @Override
    public ListPageVO<BlogVO> findAll(XiaojiQueryRequest request) {
        int page = request.pageOrDefault();
        int pageSize = request.pageSizeOrDefault();

        // 1、查询条件统一由 getQueryWrapper 构建
        QueryWrapper wrapper = getQueryWrapper(request);

        // 2、分页查询并转 VO
        Page<Blog> result = this.page(Page.of(page, pageSize), wrapper);

        return ListPageVO.of(getVoList(result.getRecords()), result.getTotalRow(), page, pageSize);
    }

    @Override
    public BlogVO findOne(String id) {
        Blog blog = this.getById(id);
        if (blog == null) {
            throw BusinessException.notFound("小记不存在");
        }
        return getVo(blog);
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public BlogVO create(XiaojiRequest request) {
        // 1、照片数量校验（随笔最多 9 张）
        String type = StrUtil.isBlank(request.getType()) ? "album" : request.getType();
        assertPhotoLimit(type, request.getPhotos());

        // 2、分类落库 + slug 唯一化
        List<String> tags = saveTags(request.getTags());
        String slug = buildUniqueSlug(StrUtil.isNotBlank(request.getSlug()) ? request.getSlug() : request.getTitle(), null);

        // 3、地点来自所选足迹
        AboutFootprint footprint = resolveFootprint(request.getFootprintId());

        // 4、构建实体并入库（Builder 一次性构造，避免逐行 set）
        Blog blog = Blog.builder()
                .id(IdUtil.randomUUID())
                .title(request.getTitle())
                .slug(slug)
                .type(type)
                .tags(JsonUtils.toJson(tags))
                .content(request.getContent() == null ? "" : request.getContent())
                .summary(StrUtil.emptyToNull(request.getSummary()))
                .quote(StrUtil.emptyToNull(request.getQuote()))
                .location(footprint == null ? null : footprint.getPlace())
                .date(StrUtil.emptyToNull(request.getDate()))
                .photos(JsonUtils.toJson(request.getPhotos() == null ? new ArrayList<>() : request.getPhotos()))
                .published(request.getPublished() != null && request.getPublished())
                .virtualViewCount(request.getVirtualViewCount())
                .viewCount(0)
                .trainType(0)
                .createdAt(Instant.now())
                .updatedAt(Instant.now())
                .build();
        this.save(blog);

        // 5、同步足迹绑定
        syncFootprintBinding(blog.getId(), footprint == null ? null : footprint.getId());

        return getVo(blog);
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public BlogVO update(String id, XiaojiRequest request) {
        // 1、确认小记存在
        Blog existing = this.getById(id);
        if (existing == null) {
            throw BusinessException.notFound("小记不存在");
        }

        // 2、以更新后的最终状态校验照片数量
        String finalType = request.getType() == null ? existing.getType() : request.getType();
        List<Map<String, Object>> finalPhotos = request.getPhotos() == null
                ? JsonUtils.parseMapList(existing.getPhotos())
                : request.getPhotos();
        assertPhotoLimit(finalType, finalPhotos);

        // 3、地点：选择足迹则派生，否则允许手填（null 表示不更新）
        AboutFootprint selectedFootprint = null;
        String location = null;
        if (request.getFootprintId() != null) {
            selectedFootprint = resolveFootprint(request.getFootprintId());
            location = selectedFootprint == null ? null : selectedFootprint.getPlace();
        } else if (request.getLocation() != null) {
            location = StrUtil.emptyToNull(request.getLocation());
        }

        // 4、slug 变更需唯一化
        String slug = null;
        if (request.getSlug() != null) {
            String base = StrUtil.isNotBlank(request.getSlug()) ? request.getSlug()
                    : StrUtil.isNotBlank(request.getTitle()) ? request.getTitle() : existing.getTitle();
            slug = buildUniqueSlug(base, id);
        }

        // 5、在原值上回写：updateById(..., false) 会把实体里的 null 一并写库，
        //    先复制原值可保证 slug / content / published 等非空列不被清成 null
        Blog update = new Blog();
        BeanUtil.copyProperties(existing, update);
        if (request.getTitle() != null) {
            update.setTitle(request.getTitle());
        }
        if (request.getType() != null) {
            update.setType(request.getType());
        }
        if (request.getContent() != null) {
            update.setContent(request.getContent());
        }
        // 空字符串表示清空可选字段
        if (request.getSummary() != null) {
            update.setSummary(StrUtil.emptyToNull(request.getSummary()));
        }
        if (request.getQuote() != null) {
            update.setQuote(StrUtil.emptyToNull(request.getQuote()));
        }
        if (request.getPhotos() != null) {
            update.setPhotos(JsonUtils.toJson(request.getPhotos()));
        }
        if (request.getDate() != null) {
            update.setDate(StrUtil.emptyToNull(request.getDate()));
        }
        if (request.getPublished() != null) {
            update.setPublished(request.getPublished());
        }
        if (request.getVirtualViewCount() != null) {
            update.setVirtualViewCount(request.getVirtualViewCount());
        }
        if (request.getTags() != null) {
            update.setTags(JsonUtils.toJson(saveTags(request.getTags())));
        }
        if (request.getFootprintId() != null || request.getLocation() != null) {
            update.setLocation(location);
        }
        if (slug != null) {
            update.setSlug(slug);
        }
        update.setUpdatedAt(Instant.now());
        this.updateById(update, false);

        // 6、同步足迹绑定（footprintId 传入即生效，空串表示解绑）
        if (request.getFootprintId() != null) {
            syncFootprintBinding(id, selectedFootprint == null ? null : selectedFootprint.getId());
        }

        // 7、数字生命：已训练数据被编辑 → 删向量 + trainType 归零
        trainingService.invalidateIfTrained(RefTypes.BLOG, id);

        return getVo(this.getById(id));
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public Map<String, Object> remove(String id) {
        // 1、确认存在
        Blog existing = this.getById(id);
        if (existing == null) {
            throw BusinessException.notFound("小记不存在");
        }

        // 2、清向量 + 解绑足迹
        trainingService.invalidateByRef(RefTypes.BLOG, id);
        aboutFootprintMapper.unbindByBlog(id, null);

        // 3、删记录
        this.removeById(id);

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("success", true);
        return result;
    }

    @Override
    public Map<String, Object> generateSummary(String content, String title) {
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("summary", summaryService.generateNote(content, title));
        return result;
    }

    @Override
    public BlogVO getVo(Blog entity) {
        if (entity == null) {
            return null;
        }
        return BlogVO.builder()
                .id(entity.getId())
                .slug(entity.getSlug())
                .title(entity.getTitle())
                .type(entity.getType())
                .tags(JsonUtils.parseStringList(entity.getTags()))
                .content(entity.getContent())
                .summary(entity.getSummary())
                .quote(entity.getQuote())
                .location(entity.getLocation())
                .date(entity.getDate())
                .photos(JsonUtils.parseMapList(entity.getPhotos()))
                .published(entity.getPublished())
                .viewCount(entity.getViewCount())
                .virtualViewCount(entity.getVirtualViewCount())
                .displayViewCount(resolveDisplayViews(entity.getViewCount(), entity.getVirtualViewCount()))
                .createdAt(entity.getCreatedAt())
                .updatedAt(entity.getUpdatedAt())
                .trainType(entity.getTrainType())
                .build();
    }

    @Override
    public List<BlogVO> getVoList(List<Blog> entities) {
        List<BlogVO> list = new ArrayList<>();
        for (Blog entity : entities) {
            list.add(getVo(entity));
        }
        return list;
    }

    @Override
    public QueryWrapper getQueryWrapper(XiaojiQueryRequest request) {
        // 1、基础条件：状态三态、类型、标签（JSON 字符串内匹配）
        QueryWrapper wrapper = QueryWrapper.create()
                .eq(Blog::getId, request.getId(), StrUtil.isNotBlank(request.getId()))
                .eq(Blog::getType, request.getType(), StrUtil.isNotBlank(request.getType()))
                .like(Blog::getTags, request.getTag(), StrUtil.isNotBlank(request.getTag()));
        if ("published".equals(request.getStatus())) {
            wrapper.eq(Blog::getPublished, true);
        } else if ("draft".equals(request.getStatus())) {
            wrapper.eq(Blog::getPublished, false);
        }

        // 2、关键词：先查出命中的 id 再走 in，避免 OR 条件与外层条件优先级冲突
        if (StrUtil.isNotBlank(request.getSearch())) {
            List<String> ids = blogSearchMapper.searchIds("%" + request.getSearch().trim() + "%");
            wrapper.in(Blog::getId, ids.isEmpty() ? List.of(NONE_VALUE) : ids);
        }

        // 3、排序：sortField 命中白名单时按其排序，否则按更新时间倒序
        String sortColumn = request.resolveSortColumn(XIAOJI_SORT_FIELDS);
        if (sortColumn != null) {
            wrapper.orderBy(sortColumn, request.sortAsc());
        } else {
            wrapper.orderBy(Blog::getUpdatedAt, false);
        }
        return wrapper;
    }

    private Integer resolveDisplayViews(Integer viewCount, Integer virtualViewCount) {
        int real = viewCount == null ? 0 : viewCount;
        if (virtualViewCount == null) {
            return real;
        }
        return virtualViewCount >= 0 ? virtualViewCount : real;
    }

    private BlogCardVO toCard(Blog blog) {
        BlogVO serialized = getVo(blog);

        // 1、封面取第一张照片
        String cover = null;
        List<Map<String, Object>> photos = serialized.getPhotos();
        if (photos != null && !photos.isEmpty()) {
            Object url = photos.get(0).get("url");
            cover = url == null ? null : String.valueOf(url);
        }

        // 2、构建导航卡片
        return BlogCardVO.builder()
                .id(serialized.getId())
                .slug(serialized.getSlug())
                .title(serialized.getTitle())
                .type(serialized.getType())
                .date(serialized.getDate())
                .cover(cover)
                .quote(serialized.getQuote())
                .build();
    }

    private void assertPhotoLimit(String type, List<Map<String, Object>> photos) {
        if ("album".equals(type)) {
            return;
        }
        if (photos != null && photos.size() > XIAOJI_MAX_PHOTOS) {
            throw BusinessException.badRequest("随笔最多上传 " + XIAOJI_MAX_PHOTOS + " 张照片");
        }
    }

    /**
     * 分类同步：同名 key 复用，不存在则自动新建。
     */
    private List<String> saveTags(List<String> names) {
        List<String> keys = new ArrayList<>();
        if (names == null) {
            return keys;
        }
        for (String raw : names) {
            String name = StrUtil.trim(raw);
            if (StrUtil.isBlank(name) || keys.contains(name)) {
                continue;
            }
            BlogCategory existing = blogCategoryMapper.selectOneByQuery(
                    QueryWrapper.create().eq(BlogCategory::getKey, name));
            if (existing != null) {
                keys.add(existing.getKey());
                continue;
            }
            BlogCategory created = BlogCategory.builder()
                    .id(IdUtil.randomUUID())
                    .key(name)
                    .name(name)
                    .createdAt(Instant.now())
                    .updatedAt(Instant.now())
                    .build();
            blogCategoryMapper.insert(created);
            keys.add(created.getKey());
        }
        return keys;
    }

    /**
     * 生成唯一 slug：清洗标题 + 冲突时追加短随机后缀。
     */
    private String buildUniqueSlug(String base, String excludeId) {
        String slug = StrUtil.nullToEmpty(base).toLowerCase()
                .trim()
                .replaceAll("\\s+", "-")
                .replaceAll("[^\\w\\-\\u4e00-\\u9fa5]+", "")
                .replaceAll("-{2,}", "-")
                .replaceAll("^-|-$", "");
        if (slug.isEmpty()) {
            slug = "xiaoji";
        }

        QueryWrapper wrapper = QueryWrapper.create().eq(Blog::getSlug, slug);
        if (StrUtil.isNotBlank(excludeId)) {
            wrapper.ne(Blog::getId, excludeId);
        }
        Blog conflict = this.getOne(wrapper.limit(1));
        if (conflict != null) {
            slug = slug + "-" + Long.toString(System.currentTimeMillis(), 36);
        }
        return slug;
    }

    /**
     * 解析足迹：空值视为不绑定；指定了 id 但不存在时报 404。
     */
    private AboutFootprint resolveFootprint(String footprintId) {
        String id = StrUtil.trim(footprintId);
        if (StrUtil.isBlank(id)) {
            return null;
        }
        AboutFootprint footprint = aboutFootprintMapper.selectOneById(id);
        if (footprint == null) {
            throw BusinessException.notFound("绑定的足迹不存在，请重新选择地点");
        }
        return footprint;
    }

    /**
     * 同步足迹 ↔ 小记 1-1 绑定。
     */
    private void syncFootprintBinding(String blogId, String footprintId) {
        // 1、解绑这篇小记名下、本次未选中的足迹
        aboutFootprintMapper.unbindByBlog(blogId, footprintId);

        // 2、未选中足迹时仅解绑
        if (StrUtil.isBlank(footprintId)) {
            return;
        }

        // 3、目标足迹已绑定别的小记：那篇小记失去该足迹，地点一并清空
        AboutFootprint target = aboutFootprintMapper.selectOneById(footprintId);
        if (target == null) {
            return;
        }
        if (StrUtil.isNotBlank(target.getBlogId()) && !target.getBlogId().equals(blogId)) {
            this.getMapper().clearLocation(target.getBlogId());
        }

        // 4、写入新绑定
        aboutFootprintMapper.bindBlog(footprintId, blogId);
    }
}
