package cn.inkheap.module.digitallife.service.impl;

import cn.inkheap.module.digitallife.client.ModelClient;
import cn.inkheap.module.digitallife.mapper.VectorMapper;
import cn.inkheap.module.digitallife.service.ModelConfigService;
import cn.inkheap.module.digitallife.service.VectorService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@Slf4j
@Service
@RequiredArgsConstructor
public class VectorServiceImpl implements VectorService {

    private final VectorMapper vectorMapper;

    private final ModelConfigService modelConfigService;

    private final ModelClient modelClient;

    @Override
    public List<Map<String, Object>> search(String queryText, int topK, List<String> refTypes) {
        try {
            // 1、获取 Embedding 模型
            ModelConfigService.EmbeddingModel model = modelConfigService.resolveEmbeddingModel(null);

            // 2、将 queryText 转为向量表示
            List<float[]> vectors = modelClient.embed(
                    model.baseUrl(), model.apiKey(), model.modelId(),
                    List.of(queryText));
            if (vectors.isEmpty()) {
                return new ArrayList<>();
            }

            // 3、使用 pgvector 进行余弦检索
            String refTypeFilter = refTypes == null || refTypes.isEmpty() ? null : String.join(",", refTypes);
            List<Map<String, Object>> rows = vectorMapper.search(toVectorLiteral(vectors.get(0)), topK, refTypeFilter);
            List<Map<String, Object>> result = new ArrayList<>(rows.size());
            for (Map<String, Object> row : rows) {
                Object distance = row.get("distance");
                Map<String, Object> item = new java.util.LinkedHashMap<>();
                item.put("content", row.get("content"));
                item.put("refType", row.get("refType"));
                item.put("refId", row.get("refId"));
                item.put("chunkIndex", row.get("chunkIndex"));
                item.put("distance", distance instanceof Number number ? number.doubleValue() : 0d);
                result.add(item);
            }
            return result;
        } catch (Exception e) {
            // 检索失败不阻断聊天：降级为无 RAG 上下文
            log.warn("向量检索失败，降级为无上下文: {}", e.getMessage());
            return new ArrayList<>();
        }
    }

    @Override
    @Transactional(rollbackFor = Exception.class)
    public void replaceChunks(String refType, String refId, List<String> chunks, List<float[]> vectors) {
        if (chunks.size() != vectors.size()) {
            throw new IllegalStateException("chunks 与 vectors 数量不一致");
        }

        // 1、先删旧向量
        vectorMapper.deleteByRef(refType, refId);

        // 2、逐块写入
        for (int i = 0; i < chunks.size(); i++) {
            vectorMapper.insert(refType, refId, i, chunks.get(i), toVectorLiteral(vectors.get(i)));
        }
        log.info("向量替换完成: {}/{}，共 {} 个 chunk", refType, refId, chunks.size());
    }

    @Override
    public void deleteByRef(String refType, String refId) {
        vectorMapper.deleteByRef(refType, refId);
    }

    @Override
    public long countByRef(String refType, String refId) {
        return vectorMapper.countByRef(refType, refId);
    }

    /**
     * number[] → pgvector 字面量 '[1,2,3]'。
     */
    private String toVectorLiteral(float[] vector) {
        StringBuilder builder = new StringBuilder(vector.length * 10).append('[');
        for (int i = 0; i < vector.length; i++) {
            if (i > 0) {
                builder.append(',');
            }
            builder.append(vector[i]);
        }
        return builder.append(']').toString();
    }
}
