package cn.inkheap.module.digitallife.vector;

import cn.inkheap.module.digitallife.constant.RefTypes;
import cn.inkheap.module.digitallife.service.VectorService;
import lombok.RequiredArgsConstructor;
import org.springframework.ai.document.Document;
import org.springframework.ai.vectorstore.SearchRequest;
import org.springframework.ai.vectorstore.VectorStore;
import org.springframework.ai.vectorstore.filter.Filter;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * VectorStore 适配层（设计文档 4.4）。
 * - 复用 {@link VectorService} 的 embedding + pgvector 检索，业务表仍是 dl_vectors，不引入 vector_store 表
 * - 在 Java 侧补相似度阈值过滤：pgvector 的 {@code <=>} 返回余弦距离，similarity = 1 - distance
 * - 只实现检索；写入 / 删除仍走 VectorService，避免绕过 chunk 覆盖与事务语义
 */
@Component
@RequiredArgsConstructor
public class DlVectorStore implements VectorStore {

    private final VectorService vectorService;

    @Override
    public List<Document> similaritySearch(SearchRequest request) {
        List<Map<String, Object>> rows = vectorService.search(request.getQuery(), request.getTopK(), RefTypes.ALL);
        double threshold = request.getSimilarityThreshold();
        List<Document> documents = new ArrayList<>(rows.size());
        for (Map<String, Object> row : rows) {
            double distance = toDouble(row.get("distance"));
            double similarity = 1 - distance;
            if (similarity < threshold) {
                continue;
            }
            Map<String, Object> metadata = new LinkedHashMap<>();
            metadata.put("refType", row.get("refType"));
            metadata.put("refId", row.get("refId"));
            metadata.put("chunkIndex", row.get("chunkIndex"));
            metadata.put("distance", distance);
            documents.add(new Document(String.valueOf(row.get("content")), metadata));
        }
        return documents;
    }

    /**
     * 写入统一走 {@link VectorService#replaceChunks}：那里按 refType/refId 先删后插，保证 chunk 不重复。
     */
    @Override
    public void add(List<Document> documents) {
        throw new UnsupportedOperationException("向量写入请走 VectorService.replaceChunks");
    }

    /**
     * 删除统一走 {@link VectorService#deleteByRef}：业务删除维度是「数据源」而非向量主键。
     */
    @Override
    public void delete(List<String> idList) {
        throw new UnsupportedOperationException("向量删除请走 VectorService.deleteByRef");
    }

    @Override
    public void delete(Filter.Expression filterExpression) {
        throw new UnsupportedOperationException("向量删除请走 VectorService.deleteByRef");
    }

    @Override
    public String getName() {
        return "dl_vectors";
    }

    private double toDouble(Object value) {
        return value instanceof Number number ? number.doubleValue() : 0d;
    }
}
