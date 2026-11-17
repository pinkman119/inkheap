package cn.inkheap.module.digitallife.service;

import java.util.List;
import java.util.Map;

/**
 * pgvector 向量存储服务（dl_vectors 表由原生 SQL 管理）。
 */
public interface VectorService {

    /**
     * 余弦相似度检索 top-K（distance 升序 = 相似度降序）；embedding 失败时返回空列表。
     *
     * @param queryText 查询文本
     * @param topK      top-K
     * @return 片段列表
     */
    List<Map<String, Object>> search(String queryText, int topK);

    /**
     * 替换写入：先删旧向量再插入新 chunks。
     *
     * @param refType 数据源类型
     * @param refId   数据源 id
     * @param chunks  文本块
     * @param vectors 向量
     */
    void replaceChunks(String refType, String refId, List<String> chunks, List<float[]> vectors);

    /**
     * 删除指定源数据的全部向量。
     *
     * @param refType 数据源类型
     * @param refId   数据源 id
     */
    void deleteByRef(String refType, String refId);

    /**
     * 统计某源数据的向量数。
     *
     * @param refType 数据源类型
     * @param refId   数据源 id
     * @return 数量
     */
    long countByRef(String refType, String refId);
}
