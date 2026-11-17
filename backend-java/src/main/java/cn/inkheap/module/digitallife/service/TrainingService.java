package cn.inkheap.module.digitallife.service;

import cn.inkheap.module.digitallife.model.dto.TrainingQueryRequest;
import cn.inkheap.module.digitallife.model.vo.TrainingListVO;

import java.util.Map;

/**
 * 数字生命训练服务：切块 + 向量化 + 失效钩子。
 */
public interface TrainingService {

    /**
     * 已训练（trainType=1）的源数据被编辑：删除其向量并把 trainType 重置为 0。
     *
     * @param refType 数据源类型
     * @param refId   数据源 id
     */
    void invalidateIfTrained(String refType, String refId);

    /**
     * 源数据被删除：清除其全部向量（同时把 trainType 重置为 0，若记录仍存在）。
     *
     * @param refType 数据源类型
     * @param refId   数据源 id
     */
    void invalidateByRef(String refType, String refId);

    /**
     * 分页列出可训练内容及其训练状态。
     *
     * @param refType 数据源类型
     * @param request 查询参数
     * @return 分页结果
     */
    TrainingListVO list(String refType, TrainingQueryRequest request);

    /**
     * 训练单条数据：切块 → embedding → 写入 dl_vectors（唯一索引去重）。
     *
     * @param refType          数据源类型
     * @param refId            数据源 id
     * @param embeddingModelId embedding 模型 id（为空时取已启用的 embedding 模型）
     * @return 训练结果
     */
    Map<String, Object> trainOne(String refType, String refId, String embeddingModelId);

    /**
     * 移除单条数据的向量，并把 trainType 置为 2（需重新训练）。
     *
     * @param refType 数据源类型
     * @param refId   数据源 id
     * @return 移除结果
     */
    Map<String, Object> removeOne(String refType, String refId);
}
