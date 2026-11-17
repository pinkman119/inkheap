package cn.inkheap.module.digitallife.service.impl;

import cn.hutool.core.util.StrUtil;
import cn.inkheap.common.exception.BusinessException;
import cn.inkheap.common.util.JsonUtils;
import cn.inkheap.common.util.TimeUtils;
import cn.inkheap.module.about.entity.AboutEvent;
import cn.inkheap.module.about.entity.AboutFootprint;
import cn.inkheap.module.about.entity.AboutProfile;
import cn.inkheap.module.about.entity.AboutTravel;
import cn.inkheap.module.about.mapper.AboutEventMapper;
import cn.inkheap.module.about.mapper.AboutFootprintMapper;
import cn.inkheap.module.about.mapper.AboutProfileMapper;
import cn.inkheap.module.about.mapper.AboutTravelMapper;
import cn.inkheap.module.article.entity.Article;
import cn.inkheap.module.article.mapper.ArticleMapper;
import cn.inkheap.module.digitallife.client.ModelClient;
import cn.inkheap.module.digitallife.constant.DigitalLifeDefaults;
import cn.inkheap.module.digitallife.constant.RefTypes;
import cn.inkheap.module.digitallife.model.dto.TrainingQueryRequest;
import cn.inkheap.module.digitallife.model.vo.TrainingItemVO;
import cn.inkheap.module.digitallife.model.vo.TrainingListVO;
import cn.inkheap.module.digitallife.service.ModelConfigService;
import cn.inkheap.module.digitallife.service.TrainingService;
import cn.inkheap.module.digitallife.service.VectorService;
import cn.inkheap.module.resume.entity.Resume;
import cn.inkheap.module.resume.mapper.ResumeMapper;
import cn.inkheap.module.xiaoji.entity.Blog;
import cn.inkheap.module.xiaoji.mapper.BlogMapper;
import com.mybatisflex.core.paginate.Page;
import com.mybatisflex.core.query.QueryWrapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * RAG 训练服务：源表行 → 文本拼装（含来源标签）→ 切分（800/100）→ embedding（1024 维）→ dl_vectors 替换写入。
 * 训练与列表都不做 published 过滤（草稿同样可训练）；简历仅生效版本参与。
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class TrainingServiceImpl implements TrainingService {

    private static final int CHUNK_SIZE = 800;

    private static final int CHUNK_OVERLAP = 100;

    private static final String[] SEPARATORS = {"\n\n", "\n", "。", "；", "，", " ", ""};

    private final ArticleMapper articleMapper;

    private final BlogMapper blogMapper;

    private final ResumeMapper resumeMapper;

    private final AboutProfileMapper aboutProfileMapper;

    private final AboutFootprintMapper aboutFootprintMapper;

    private final AboutTravelMapper aboutTravelMapper;

    private final AboutEventMapper aboutEventMapper;

    private final ModelConfigService modelConfigService;

    private final VectorService vectorService;

    private final ModelClient modelClient;

    @Override
    public void invalidateIfTrained(String refType, String refId) {
        // 1、行不存在（删除场景）交给 invalidateByRef 兜底
        Integer trainType = getTrainType(refType, refId);
        if (trainType == null || trainType != 1) {
            return;
        }

        // 2、删向量 + 置 0（需重新训练）
        vectorService.deleteByRef(refType, refId);
        updateTrainType(refType, refId, 0);
        log.info("训练失效（数据已编辑）: {}/{}", refType, refId);
    }

    @Override
    public void invalidateByRef(String refType, String refId) {
        vectorService.deleteByRef(refType, refId);
    }

    @Override
    public TrainingListVO list(String refType, TrainingQueryRequest request) {
        if (!RefTypes.isValid(refType)) {
            throw BusinessException.badRequest("无效的数据源类型：" + refType);
        }
        int page = request.pageOrDefault();
        int pageSize = request.pageSizeOrDefault();

        // 1、按类型分页查询（更新优先；事件按 sortOrder；简历仅生效版本）
        List<TrainingItemVO> items = new ArrayList<>();
        long total;
        switch (refType) {
            case RefTypes.ARTICLE -> {
                Page<Article> result = articleMapper.paginate(page, pageSize,
                        QueryWrapper.create().orderBy(Article::getUpdatedAt, false));
                total = result.getTotalRow();
                result.getRecords().forEach(row -> items.add(toItem(refType, row)));
            }
            case RefTypes.BLOG -> {
                Page<Blog> result = blogMapper.paginate(page, pageSize,
                        QueryWrapper.create().orderBy(Blog::getUpdatedAt, false));
                total = result.getTotalRow();
                result.getRecords().forEach(row -> items.add(toItem(refType, row)));
            }
            case RefTypes.RESUME -> {
                Page<Resume> result = resumeMapper.paginate(page, pageSize, QueryWrapper.create()
                        .eq(Resume::getIsActive, true)
                        .orderBy(Resume::getUpdatedAt, false));
                total = result.getTotalRow();
                result.getRecords().forEach(row -> items.add(toItem(refType, row)));
            }
            case RefTypes.ABOUT_PROFILE -> {
                Page<AboutProfile> result = aboutProfileMapper.paginate(page, pageSize,
                        QueryWrapper.create().orderBy(AboutProfile::getUpdatedAt, false));
                total = result.getTotalRow();
                result.getRecords().forEach(row -> items.add(toItem(refType, row)));
            }
            case RefTypes.ABOUT_FOOTPRINT -> {
                Page<AboutFootprint> result = aboutFootprintMapper.paginate(page, pageSize,
                        QueryWrapper.create().orderBy(AboutFootprint::getUpdatedAt, false));
                total = result.getTotalRow();
                result.getRecords().forEach(row -> items.add(toItem(refType, row)));
            }
            case RefTypes.ABOUT_TRAVEL -> {
                Page<AboutTravel> result = aboutTravelMapper.paginate(page, pageSize,
                        QueryWrapper.create().orderBy(AboutTravel::getUpdatedAt, false));
                total = result.getTotalRow();
                result.getRecords().forEach(row -> items.add(toItem(refType, row)));
            }
            case RefTypes.ABOUT_EVENT -> {
                Page<AboutEvent> result = aboutEventMapper.paginate(page, pageSize, QueryWrapper.create()
                        .orderBy(AboutEvent::getSortOrder, true)
                        .orderBy(AboutEvent::getUpdatedAt, false));
                total = result.getTotalRow();
                result.getRecords().forEach(row -> items.add(toItem(refType, row)));
            }
            default -> throw BusinessException.badRequest("无效的数据源类型：" + refType);
        }

        // 2、组装响应（附 refType 与中文标签）
        return TrainingListVO.builder()
                .items(items)
                .total(total)
                .page(page)
                .pageSize(pageSize)
                .totalPages((int) Math.max(1, Math.ceil(total / (double) pageSize)))
                .refType(refType)
                .refTypeLabel(DigitalLifeDefaults.refTypeLabel(refType))
                .build();
    }

    @Override
    public Map<String, Object> trainOne(String refType, String refId, String embeddingModelId) {
        if (!RefTypes.isValid(refType)) {
            throw BusinessException.badRequest("无效的数据源类型：" + refType);
        }

        // 1、取源数据（简历仅生效版本可训练）
        Object row = findRow(refType, refId);
        if (row == null) {
            throw BusinessException.notFound(DigitalLifeDefaults.refTypeLabel(refType) + "记录不存在");
        }
        if (RefTypes.RESUME.equals(refType) && !Boolean.TRUE.equals(((Resume) row).getIsActive())) {
            throw BusinessException.badRequest("仅当前生效的简历版本可训练");
        }

        // 2、拼装文本并切分
        String text = buildText(refType, row).trim();
        if (text.isEmpty()) {
            throw BusinessException.badRequest("该条数据内容为空，无法训练");
        }
        List<String> chunks = splitText(text);
        if (chunks.isEmpty()) {
            throw BusinessException.badRequest("切分后无有效文本，无法训练");
        }

        // 3、embedding（可指定嵌入模型）
        ModelConfigService.EmbeddingModel model = modelConfigService.resolveEmbeddingModel(embeddingModelId);
        List<float[]> vectors;
        try {
            vectors = modelClient.embed(model.baseUrl(), model.apiKey(), model.modelId(), chunks);
        } catch (Exception e) {
            throw BusinessException.badRequest(e.getMessage() == null ? "向量化失败" : e.getMessage());
        }

        // 4、替换写入 + trainType=1
        vectorService.replaceChunks(refType, refId, chunks, vectors);
        updateTrainType(refType, refId, 1);

        // 5、指定了嵌入模型时设为唯一启用（训练与检索保持一致）
        if (StrUtil.isNotBlank(embeddingModelId)) {
            modelConfigService.setActiveEmbeddingModel(embeddingModelId);
        }

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("refType", refType);
        result.put("refId", refId);
        result.put("trainType", 1);
        result.put("chunkCount", chunks.size());
        return result;
    }

    @Override
    public Map<String, Object> removeOne(String refType, String refId) {
        if (!RefTypes.isValid(refType)) {
            throw BusinessException.badRequest("无效的数据源类型：" + refType);
        }
        if (findRow(refType, refId) == null) {
            throw BusinessException.notFound(DigitalLifeDefaults.refTypeLabel(refType) + "记录不存在");
        }

        // 1、删向量 + trainType=2
        vectorService.deleteByRef(refType, refId);
        updateTrainType(refType, refId, 2);

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("refType", refType);
        result.put("refId", refId);
        result.put("trainType", 2);
        return result;
    }

    // ==================== 文本拼装 ====================

    private String buildText(String refType, Object row) {
        return switch (refType) {
            case RefTypes.ARTICLE -> {
                Article article = (Article) row;
                yield "【知识库文章】" + article.getTitle() + "\n"
                        + StrUtil.nullToEmpty(article.getSummary()) + "\n\n"
                        + StrUtil.nullToEmpty(article.getContent());
            }
            case RefTypes.BLOG -> {
                Blog blog = (Blog) row;
                List<String> lines = new ArrayList<>();
                lines.add("【小记】" + blog.getTitle());
                lines.add(StrUtil.nullToEmpty(blog.getSummary()));
                lines.add(StrUtil.isBlank(blog.getQuote()) ? "" : "「" + blog.getQuote() + "」");
                lines.add(java.util.stream.Stream.of(blog.getLocation(), blog.getDate())
                        .filter(StrUtil::isNotBlank).reduce((a, b) -> a + " " + b).orElse(""));
                lines.add("");
                lines.add(StrUtil.nullToEmpty(blog.getContent()));
                yield String.join("\n", lines);
            }
            case RefTypes.RESUME -> serializeResume((Resume) row);
            case RefTypes.ABOUT_PROFILE -> {
                AboutProfile profile = (AboutProfile) row;
                yield String.join("\n", List.of(
                        "【关于我·个人简介】",
                        StrUtil.nullToEmpty(profile.getLede()),
                        StrUtil.isBlank(profile.getEvaluationQuote()) ? ""
                                : "「" + profile.getEvaluationQuote() + "」—— "
                                + StrUtil.nullToEmpty(profile.getEvaluationBy())));
            }
            case RefTypes.ABOUT_FOOTPRINT -> {
                AboutFootprint footprint = (AboutFootprint) row;
                yield "【关于我·足迹】" + footprint.getProvince() + "·" + footprint.getPlace()
                        + "（" + footprint.getTime() + "，" + footprint.getLocation()
                        + "，海拔" + footprint.getElevation() + "）：" + StrUtil.nullToEmpty(footprint.getNote());
            }
            case RefTypes.ABOUT_TRAVEL -> {
                AboutTravel travel = (AboutTravel) row;
                yield "【关于我·旅行】" + travel.getPlace() + "（" + travel.getMeta() + "）："
                        + StrUtil.nullToEmpty(travel.getNote());
            }
            case RefTypes.ABOUT_EVENT -> {
                AboutEvent event = (AboutEvent) row;
                yield "【关于我·事件】" + StrUtil.nullToEmpty(TimeUtils.formatDate(event.getDate())) + " "
                        + event.getTitle() + "：" + StrUtil.nullToEmpty(event.getDesc());
            }
            default -> "";
        };
    }

    /**
     * 简历 content JSON → 「区块：值」逐行序列化。
     */
    private String serializeResume(Resume resume) {
        List<String> lines = new ArrayList<>();
        lines.add("【简历】" + (StrUtil.isBlank(resume.getName()) ? "" : "版本「" + resume.getName() + "」"));
        walk(JsonUtils.parseMap(resume.getContent()), "", lines);
        return String.join("\n", lines);
    }

    private void walk(Object node, String prefix, List<String> lines) {
        if (node == null) {
            return;
        }
        if (node instanceof Map<?, ?> map) {
            for (Map.Entry<?, ?> entry : map.entrySet()) {
                String key = String.valueOf(entry.getKey());
                walk(entry.getValue(), prefix.isEmpty() ? key : prefix + "·" + key, lines);
            }
            return;
        }
        if (node instanceof List<?> list) {
            for (int i = 0; i < list.size(); i++) {
                walk(list.get(i), prefix + "[" + (i + 1) + "]", lines);
            }
            return;
        }
        String text = String.valueOf(node).replaceAll("<[^>]+>", "").trim();
        if (!text.isEmpty()) {
            lines.add(prefix + "：" + text);
        }
    }

    // ==================== 切分（近似 RecursiveCharacterTextSplitter） ====================

    private List<String> splitText(String text) {
        List<String> pieces = splitRecursively(text, 0);
        return mergeWithOverlap(pieces);
    }

    private List<String> splitRecursively(String text, int separatorIndex) {
        List<String> result = new ArrayList<>();
        if (text.length() <= CHUNK_SIZE || separatorIndex >= SEPARATORS.length) {
            // 按固定长度硬切
            for (int i = 0; i < text.length(); i += CHUNK_SIZE) {
                String piece = text.substring(i, Math.min(text.length(), i + CHUNK_SIZE)).trim();
                if (!piece.isEmpty()) {
                    result.add(piece);
                }
            }
            return result;
        }

        String separator = SEPARATORS[separatorIndex];
        if (separator.isEmpty()) {
            return splitRecursively(text, SEPARATORS.length);
        }
        if (!text.contains(separator)) {
            return splitRecursively(text, separatorIndex + 1);
        }

        // 1、按分隔符切分（保留分隔符在片段尾部）
        List<String> parts = new ArrayList<>();
        int start = 0;
        int index;
        while ((index = text.indexOf(separator, start)) >= 0) {
            parts.add(text.substring(start, index + separator.length()));
            start = index + separator.length();
        }
        if (start < text.length()) {
            parts.add(text.substring(start));
        }

        // 2、超长片段用下一级分隔符继续切
        for (String part : parts) {
            if (part.length() > CHUNK_SIZE) {
                result.addAll(splitRecursively(part, separatorIndex + 1));
            } else {
                result.add(part);
            }
        }
        return result;
    }

    /**
     * 合并小片段到不超过 CHUNK_SIZE 的块，并与上一块保留 CHUNK_OVERLAP 字符重叠。
     */
    private List<String> mergeWithOverlap(List<String> pieces) {
        List<String> chunks = new ArrayList<>();
        StringBuilder current = new StringBuilder();
        for (String piece : pieces) {
            if (current.length() + piece.length() > CHUNK_SIZE && current.length() > 0) {
                chunks.add(current.toString().trim());
                String previous = chunks.get(chunks.size() - 1);
                String overlap = previous.length() > CHUNK_OVERLAP
                        ? previous.substring(previous.length() - CHUNK_OVERLAP) : previous;
                current = new StringBuilder(overlap);
            }
            current.append(piece);
        }
        if (!current.toString().trim().isEmpty()) {
            chunks.add(current.toString().trim());
        }
        return chunks;
    }

    // ==================== 数据访问 ====================

    private Object findRow(String refType, String refId) {
        return switch (refType) {
            case RefTypes.ARTICLE -> articleMapper.selectOneById(refId);
            case RefTypes.BLOG -> blogMapper.selectOneById(refId);
            case RefTypes.RESUME -> resumeMapper.selectOneById(refId);
            case RefTypes.ABOUT_PROFILE -> aboutProfileMapper.selectOneById(refId);
            case RefTypes.ABOUT_FOOTPRINT -> aboutFootprintMapper.selectOneById(refId);
            case RefTypes.ABOUT_TRAVEL -> aboutTravelMapper.selectOneById(refId);
            case RefTypes.ABOUT_EVENT -> aboutEventMapper.selectOneById(refId);
            default -> null;
        };
    }

    private Integer getTrainType(String refType, String refId) {
        Object row = findRow(refType, refId);
        if (row == null) {
            return null;
        }
        return switch (refType) {
            case RefTypes.ARTICLE -> ((Article) row).getTrainType();
            case RefTypes.BLOG -> ((Blog) row).getTrainType();
            case RefTypes.RESUME -> ((Resume) row).getTrainType();
            case RefTypes.ABOUT_PROFILE -> ((AboutProfile) row).getTrainType();
            case RefTypes.ABOUT_FOOTPRINT -> ((AboutFootprint) row).getTrainType();
            case RefTypes.ABOUT_TRAVEL -> ((AboutTravel) row).getTrainType();
            case RefTypes.ABOUT_EVENT -> ((AboutEvent) row).getTrainType();
            default -> null;
        };
    }

    private void updateTrainType(String refType, String refId, int trainType) {
        switch (refType) {
            case RefTypes.ARTICLE -> {
                Article update = Article.builder()
                        .id(refId)
                        .trainType(trainType)
                        .build();
                articleMapper.update(update);
            }
            case RefTypes.BLOG -> {
                Blog update = Blog.builder()
                        .id(refId)
                        .trainType(trainType)
                        .build();
                blogMapper.update(update);
            }
            case RefTypes.RESUME -> {
                Resume update = Resume.builder()
                        .id(refId)
                        .trainType(trainType)
                        .build();
                resumeMapper.update(update);
            }
            case RefTypes.ABOUT_PROFILE -> {
                AboutProfile update = AboutProfile.builder()
                        .id(refId)
                        .trainType(trainType)
                        .build();
                aboutProfileMapper.update(update);
            }
            case RefTypes.ABOUT_FOOTPRINT -> {
                AboutFootprint update = AboutFootprint.builder()
                        .id(refId)
                        .trainType(trainType)
                        .build();
                aboutFootprintMapper.update(update);
            }
            case RefTypes.ABOUT_TRAVEL -> {
                AboutTravel update = AboutTravel.builder()
                        .id(refId)
                        .trainType(trainType)
                        .build();
                aboutTravelMapper.update(update);
            }
            case RefTypes.ABOUT_EVENT -> {
                AboutEvent update = AboutEvent.builder()
                        .id(refId)
                        .trainType(trainType)
                        .build();
                aboutEventMapper.update(update);
            }
            default -> {
            }
        }
    }

    private TrainingItemVO toItem(String refType, Object row) {
        return switch (refType) {
            case RefTypes.ARTICLE -> {
                Article article = (Article) row;
                yield TrainingItemVO.builder()
                        .id(article.getId())
                        .title(article.getTitle())
                        .summary(StrUtil.nullToEmpty(article.getSummary()))
                        .trainType(orZero(article.getTrainType()))
                        .updatedAt(article.getUpdatedAt())
                        .createdAt(article.getCreatedAt())
                        .build();
            }
            case RefTypes.BLOG -> {
                Blog blog = (Blog) row;
                yield TrainingItemVO.builder()
                        .id(blog.getId())
                        .title(blog.getTitle())
                        .summary(StrUtil.isBlank(blog.getSummary()) ? StrUtil.nullToEmpty(blog.getQuote()) : blog.getSummary())
                        .trainType(orZero(blog.getTrainType()))
                        .updatedAt(blog.getUpdatedAt())
                        .createdAt(blog.getCreatedAt())
                        .build();
            }
            case RefTypes.RESUME -> {
                Resume resume = (Resume) row;
                yield TrainingItemVO.builder()
                        .id(resume.getId())
                        .title("简历版本「" + resume.getName() + "」")
                        .summary("当前生效版本")
                        .trainType(orZero(resume.getTrainType()))
                        .updatedAt(resume.getUpdatedAt())
                        .createdAt(resume.getCreatedAt())
                        .build();
            }
            case RefTypes.ABOUT_PROFILE -> {
                AboutProfile profile = (AboutProfile) row;
                yield TrainingItemVO.builder()
                        .id(profile.getId())
                        .title("个人简介")
                        .summary(StrUtil.maxLength(StrUtil.nullToEmpty(profile.getLede()), 80))
                        .trainType(orZero(profile.getTrainType()))
                        .updatedAt(profile.getUpdatedAt())
                        .createdAt(profile.getCreatedAt())
                        .build();
            }
            case RefTypes.ABOUT_FOOTPRINT -> {
                AboutFootprint footprint = (AboutFootprint) row;
                yield TrainingItemVO.builder()
                        .id(footprint.getId())
                        .title(footprint.getPlace())
                        .summary(StrUtil.nullToEmpty(footprint.getProvince()) + " · " + StrUtil.nullToEmpty(footprint.getTime()))
                        .trainType(orZero(footprint.getTrainType()))
                        .updatedAt(footprint.getUpdatedAt())
                        .createdAt(footprint.getCreatedAt())
                        .build();
            }
            case RefTypes.ABOUT_TRAVEL -> {
                AboutTravel travel = (AboutTravel) row;
                yield TrainingItemVO.builder()
                        .id(travel.getId())
                        .title(travel.getPlace())
                        .summary(StrUtil.maxLength(StrUtil.nullToEmpty(travel.getMeta()), 80))
                        .trainType(orZero(travel.getTrainType()))
                        .updatedAt(travel.getUpdatedAt())
                        .createdAt(travel.getCreatedAt())
                        .build();
            }
            case RefTypes.ABOUT_EVENT -> {
                AboutEvent event = (AboutEvent) row;
                yield TrainingItemVO.builder()
                        .id(event.getId())
                        .title(StrUtil.nullToEmpty(TimeUtils.formatDate(event.getDate())) + " · " + event.getTitle())
                        .summary(StrUtil.maxLength(StrUtil.nullToEmpty(event.getDesc()), 80))
                        .trainType(orZero(event.getTrainType()))
                        .updatedAt(event.getUpdatedAt())
                        .createdAt(event.getCreatedAt())
                        .build();
            }
            default -> TrainingItemVO.builder().build();
        };
    }

    private int orZero(Integer value) {
        return value == null ? 0 : value;
    }
}
