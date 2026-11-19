package cn.inkheap.module.digitallife.service.impl;

import cn.hutool.core.util.IdUtil;
import cn.hutool.core.util.StrUtil;
import cn.inkheap.common.exception.BusinessException;
import cn.inkheap.common.util.CryptoUtils;
import cn.inkheap.module.digitallife.client.ModelClient;
import cn.inkheap.module.digitallife.constant.DigitalLifeDefaults;
import cn.inkheap.module.digitallife.entity.DlModel;
import cn.inkheap.module.digitallife.mapper.DlModelMapper;
import cn.inkheap.module.digitallife.model.dto.DlModelRequest;
import cn.inkheap.module.digitallife.model.vo.DlModelVO;
import cn.inkheap.module.digitallife.service.ModelConfigService;
import com.mybatisflex.core.query.QueryWrapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Slf4j
@Service
@RequiredArgsConstructor
public class ModelConfigServiceImpl implements ModelConfigService {

    private final DlModelMapper dlModelMapper;

    private final CryptoUtils cryptoUtils;

    private final ModelClient modelClient;

    @Override
    public List<DlModelVO> list() {
        List<DlModel> models = dlModelMapper.selectListByQuery(
                QueryWrapper.create().orderBy(DlModel::getSortOrder, true));
        List<DlModelVO> result = new ArrayList<>(models.size());
        for (DlModel model : models) {
            result.add(getVo(model));
        }
        return result;
    }

    @Override
    public Map<String, Object> toggle(String id) {
        // 1、读取模型
        DlModel model = ensureExists(id);
        boolean general = "general".equals(StrUtil.nullToEmpty(model.getModelType()));

        // 2、停用最后一个启用的通用模型时给出警告（仍允许停用）
        if (Boolean.TRUE.equals(model.getEnabled()) && general) {
            long enabledCount = dlModelMapper.selectCountByQuery(QueryWrapper.create()
                    .eq(DlModel::getEnabled, true)
                    .eq(DlModel::getModelType, "general"));
            if (enabledCount <= 1) {
                DlModel update = DlModel.builder()
                        .id(id)
                        .enabled(false)
                        .updatedAt(Instant.now())
                        .build();
                dlModelMapper.update(update);

                Map<String, Object> result = new LinkedHashMap<>();
                result.put("id", id);
                result.put("enabled", false);
                result.put("warning", "已停用全部通用模型，数字生命对话将暂不可用，请至少启用一个模型");
                return result;
            }
        }

        // 3、普通切换
        boolean next = !Boolean.TRUE.equals(model.getEnabled());
        DlModel update = DlModel.builder()
                .id(id)
                .enabled(next)
                .updatedAt(Instant.now())
                .build();
        dlModelMapper.update(update);

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("id", id);
        result.put("enabled", next);
        return result;
    }

    @Override
    public Map<String, Object> create(DlModelRequest request) {
        // 1、参数校验
        if (!DigitalLifeDefaults.MODEL_TYPES.contains(request.getModelType())) {
            throw BusinessException.badRequest("不支持的模型类型：" + request.getModelType());
        }
        if (!DigitalLifeDefaults.PROVIDER_BASE_URLS.containsKey(request.getProvider())) {
            throw BusinessException.badRequest("不支持的厂商：" + request.getProvider());
        }
        String name = StrUtil.nullToEmpty(request.getName()).trim();
        String modelId = StrUtil.nullToEmpty(request.getModelId()).trim();
        if (name.isEmpty()) {
            throw BusinessException.badRequest("显示名称不能为空");
        }
        if (modelId.isEmpty()) {
            throw BusinessException.badRequest("模型 ID 不能为空");
        }

        // 2、追加到列表末尾，默认停用
        DlModel last = dlModelMapper.selectOneByQuery(QueryWrapper.create()
                .orderBy(DlModel::getSortOrder, false).limit(1));
        DlModel model = DlModel.builder()
                .id(IdUtil.randomUUID())
                .name(name)
                .provider(request.getProvider())
                .modelId(modelId)
                .modelType(request.getModelType())
                .apiKeyEnc(StrUtil.isBlank(request.getApiKey()) ? null : cryptoUtils.encrypt(request.getApiKey().trim()))
                .enabled(false)
                .sortOrder((last == null || last.getSortOrder() == null ? -1 : last.getSortOrder()) + 1)
                .createdAt(Instant.now())
                .updatedAt(Instant.now())
                .build();
        dlModelMapper.insert(model);

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("id", model.getId());
        result.put("success", true);
        return result;
    }

    @Override
    public Map<String, Object> update(String id, DlModelRequest request) {
        // 1、确认模型存在
        ensureExists(id);

        // 2、类型校验
        if (request.getModelType() != null && !DigitalLifeDefaults.MODEL_TYPES.contains(request.getModelType())) {
            throw BusinessException.badRequest("不支持的模型类型：" + request.getModelType());
        }

        // 3、组装更新字段
        // provider 由新增时确定、不支持编辑；enabled / sortOrder 走 toggle 与排序接口，这里都不传
        // apiKey：null 表示未改动（保留原值），空串表示清除，其余按新值加密
        boolean clearApiKey = request.getApiKey() != null && request.getApiKey().trim().isEmpty();
        Instant now = Instant.now();
        DlModel update = DlModel.builder()
                .id(id)
                .name(request.getName() == null ? null : request.getName().trim())
                .modelId(request.getModelId() == null ? null : request.getModelId().trim())
                .modelType(request.getModelType())
                .apiKeyEnc(clearApiKey || request.getApiKey() == null
                        ? null : cryptoUtils.encrypt(request.getApiKey().trim()))
                .updatedAt(now)
                .build();
        // 忽略 null 字段：未传的列保持原值，否则会把 provider / enabled / sort_order 等非空列写成 null
        dlModelMapper.update(update);

        // 4、清除 Key 需单独置空：上面的 update 会跳过 null 字段
        if (clearApiKey) {
            dlModelMapper.clearApiKey(id, now);
        }

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("success", true);
        return result;
    }

    @Override
    public Map<String, Object> remove(String id) {
        ensureExists(id);
        dlModelMapper.deleteById(id);

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("success", true);
        return result;
    }

    @Override
    public Map<String, Object> test(String id) {
        // 1、确认模型与 Key
        DlModel model = ensureExists(id);
        Map<String, Object> result = new LinkedHashMap<>();
        if (StrUtil.isBlank(model.getApiKeyEnc())) {
            result.put("success", false);
            result.put("message", "「" + model.getName() + "」尚未配置 API Key，无法测试");
            return result;
        }

        // 2、按类型测对话或测向量
        long started = System.currentTimeMillis();
        try {
            String apiKey = cryptoUtils.decrypt(model.getApiKeyEnc());
            String baseUrl = DigitalLifeDefaults.baseUrlOf(model.getProvider());
            boolean embedding = "embedding".equals(StrUtil.nullToEmpty(model.getModelType()));
            if (embedding) {
                List<float[]> vectors = modelClient.embed(baseUrl, apiKey, model.getModelId(), List.of("你好"));
                long latency = System.currentTimeMillis() - started;
                int dimensions = vectors.isEmpty() ? 0 : vectors.get(0).length;
                result.put("success", true);
                result.put("message", "连接成功（" + latency + "ms）：向量维度 " + dimensions);
                result.put("latencyMs", latency);
                return result;
            }
            String reply = modelClient.chat(baseUrl, apiKey, model.getModelId(),
                    List.of(Map.of("role", "user", "content", "你好")));
            long latency = System.currentTimeMillis() - started;
            String preview = reply.length() > 80 ? reply.substring(0, 80) : reply;
            result.put("success", true);
            result.put("message", "连接成功（" + latency + "ms）：" + (preview.isEmpty() ? "（模型返回空）" : preview));
            result.put("latencyMs", latency);
            return result;
        } catch (Exception e) {
            log.warn("模型「{}」测试失败: {}", model.getName(), e.getMessage());
            result.put("success", false);
            result.put("message", "连接失败：" + (e.getMessage() == null ? "未知错误" : e.getMessage()));
            return result;
        }
    }

    @Override
    public List<Map<String, Object>> listGeneralModels() {
        List<DlModel> models = dlModelMapper.selectListByQuery(QueryWrapper.create()
                .eq(DlModel::getEnabled, true)
                .eq(DlModel::getModelType, "general")
                .isNotNull(DlModel::getApiKeyEnc)
                .orderBy(DlModel::getSortOrder, true));
        List<Map<String, Object>> items = new ArrayList<>(models.size());
        for (DlModel model : models) {
            Map<String, Object> item = new LinkedHashMap<>();
            item.put("id", model.getId());
            item.put("name", model.getName());
            item.put("provider", model.getProvider());
            item.put("modelId", model.getModelId());
            items.add(item);
        }
        return items;
    }

    @Override
    public void ensureActiveModel(String modelId) {
        QueryWrapper wrapper = QueryWrapper.create()
                .eq(DlModel::getEnabled, true)
                .eq(DlModel::getModelType, "general")
                .isNotNull(DlModel::getApiKeyEnc);
        if (StrUtil.isNotBlank(modelId)) {
            wrapper.eq(DlModel::getId, modelId);
        }
        if (dlModelMapper.selectCountByQuery(wrapper) == 0) {
            throw BusinessException.conflict("后台未配置可用模型（需启用并填写 API Key），请前往「数字生命 → 模型管理」");
        }
    }

    @Override
    public List<ActiveModel> getActiveModels(String modelId) {
        // 1、启用的通用模型
        QueryWrapper wrapper = QueryWrapper.create()
                .eq(DlModel::getEnabled, true)
                .eq(DlModel::getModelType, "general")
                .orderBy(DlModel::getSortOrder, true);
        if (StrUtil.isNotBlank(modelId)) {
            wrapper.eq(DlModel::getId, modelId);
        }
        List<DlModel> models = dlModelMapper.selectListByQuery(wrapper);
        if (models.isEmpty()) {
            throw BusinessException.conflict("后台未启用任何通用模型，请前往「数字生命 → 模型管理」启用");
        }

        // 2、过滤未配置 Key 的模型
        List<ActiveModel> result = new ArrayList<>();
        for (DlModel model : models) {
            if (StrUtil.isBlank(model.getApiKeyEnc())) {
                continue;
            }
            result.add(new ActiveModel(model, cryptoUtils.decrypt(model.getApiKeyEnc())));
        }
        if (result.isEmpty()) {
            throw BusinessException.conflict("启用的通用模型均未配置 API Key，请前往「数字生命 → 模型管理」为模型配置 Key");
        }
        return result;
    }

    @Override
    public EmbeddingModel resolveEmbeddingModel(String embeddingModelId) {
        // 1、显式指定模型
        if (StrUtil.isNotBlank(embeddingModelId)) {
            DlModel model = ensureExists(embeddingModelId);
            if (!"embedding".equals(StrUtil.nullToEmpty(model.getModelType()))) {
                throw BusinessException.badRequest("所选模型不是「嵌入」类型，无法用于训练");
            }
            if (StrUtil.isBlank(model.getApiKeyEnc())) {
                throw BusinessException.conflict(
                        "嵌入模型「" + model.getName() + "」尚未配置 API Key：请在「数字生命 → 模型管理」配置");
            }
            return new EmbeddingModel(model.getName(), model.getModelId(),
                    DigitalLifeDefaults.baseUrlOf(model.getProvider()), cryptoUtils.decrypt(model.getApiKeyEnc()));
        }

        // 2、启用中的嵌入模型
        DlModel enabled = dlModelMapper.selectOneByQuery(QueryWrapper.create()
                .eq(DlModel::getModelType, "embedding")
                .eq(DlModel::getEnabled, true)
                .isNotNull(DlModel::getApiKeyEnc)
                .orderBy(DlModel::getSortOrder, true)
                .limit(1));
        if (enabled != null) {
            return new EmbeddingModel(enabled.getName(), enabled.getModelId(),
                    DigitalLifeDefaults.baseUrlOf(enabled.getProvider()), cryptoUtils.decrypt(enabled.getApiKeyEnc()));
        }

        // 3、任意已配置 Key 的嵌入模型
        DlModel withKey = dlModelMapper.selectOneByQuery(QueryWrapper.create()
                .eq(DlModel::getModelType, "embedding")
                .isNotNull(DlModel::getApiKeyEnc)
                .orderBy(DlModel::getSortOrder, true)
                .limit(1));
        if (withKey != null) {
            return new EmbeddingModel(withKey.getName(), withKey.getModelId(),
                    DigitalLifeDefaults.baseUrlOf(withKey.getProvider()), cryptoUtils.decrypt(withKey.getApiKeyEnc()));
        }

        // 4、兜底：智谱 Key + embedding-3
        DlModel zhipu = dlModelMapper.selectOneByQuery(QueryWrapper.create()
                .eq(DlModel::getProvider, "zhipu")
                .isNotNull(DlModel::getApiKeyEnc)
                .orderBy(DlModel::getEnabled, false)
                .orderBy(DlModel::getSortOrder, true)
                .limit(1));
        if (zhipu == null) {
            throw BusinessException.conflict(
                    "训练需要嵌入模型的 API Key：请在「数字生命 → 模型管理」为任一嵌入模型（或 GLM 模型）配置 Key");
        }
        return new EmbeddingModel(zhipu.getName(), "embedding-3",
                DigitalLifeDefaults.baseUrlOf("zhipu"), cryptoUtils.decrypt(zhipu.getApiKeyEnc()));
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public void setActiveEmbeddingModel(String embeddingModelId) {
        // 1、校验类型
        DlModel model = ensureExists(embeddingModelId);
        if (!"embedding".equals(StrUtil.nullToEmpty(model.getModelType()))) {
            throw BusinessException.badRequest("所选模型不是「嵌入」类型，无法作为嵌入模型");
        }

        // 2、其余嵌入模型置为停用
        DlModel reset = DlModel.builder()
                .enabled(false)
                .updatedAt(Instant.now())
                .build();
        dlModelMapper.updateByQuery(reset, QueryWrapper.create()
                .eq(DlModel::getModelType, "embedding")
                .ne(DlModel::getId, embeddingModelId));

        // 3、当前模型启用
        DlModel activate = DlModel.builder()
                .id(embeddingModelId)
                .enabled(true)
                .updatedAt(Instant.now())
                .build();
        dlModelMapper.update(activate);
    }

    private DlModel ensureExists(String id) {
        DlModel model = dlModelMapper.selectOneById(id);
        if (model == null) {
            throw BusinessException.notFound("模型不存在");
        }
        return model;
    }

    private DlModelVO getVo(DlModel model) {
        boolean hasKey = StrUtil.isNotBlank(model.getApiKeyEnc());
        return DlModelVO.builder()
                .id(model.getId())
                .name(model.getName())
                .provider(model.getProvider())
                .modelId(model.getModelId())
                .modelType(StrUtil.isBlank(model.getModelType()) ? "general" : model.getModelType())
                .enabled(model.getEnabled())
                .sortOrder(model.getSortOrder())
                .hasApiKey(hasKey)
                .apiKeyMasked(hasKey ? cryptoUtils.mask(cryptoUtils.decrypt(model.getApiKeyEnc())) : "")
                .build();
    }
}
