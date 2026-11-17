package cn.inkheap.module.digitallife.service;

import cn.inkheap.module.digitallife.entity.DlModel;
import cn.inkheap.module.digitallife.model.dto.DlModelRequest;
import cn.inkheap.module.digitallife.model.vo.DlModelVO;

import java.util.List;
import java.util.Map;

/**
 * 数字生命模型配置服务。
 */
public interface ModelConfigService {

    /**
     * 模型列表（按 sortOrder），只输出 hasApiKey / apiKeyMasked。
     *
     * @return 列表
     */
    List<DlModelVO> list();

    /**
     * 启用 / 停用切换；停用最后一个启用的通用模型时附带 warning。
     *
     * @param id 主键
     * @return {id,enabled,warning?}
     */
    Map<String, Object> toggle(String id);

    /**
     * 新增模型（追加到末尾，默认停用）。
     *
     * @param request 请求
     * @return {id,success}
     */
    Map<String, Object> create(DlModelRequest request);

    /**
     * 更新模型；apiKey 提供则更新密文，空串清除。
     *
     * @param id      主键
     * @param request 请求
     * @return {success:true}
     */
    Map<String, Object> update(String id, DlModelRequest request);

    /**
     * 删除模型。
     *
     * @param id 主键
     * @return {success:true}
     */
    Map<String, Object> remove(String id);

    /**
     * 单模型连通性测试（通用测对话、嵌入测向量）。
     *
     * @param id 主键
     * @return {success,message,latencyMs?}
     */
    Map<String, Object> test(String id);

    /**
     * 前台可选的通用模型（启用且有 Key）。
     *
     * @return 列表
     */
    List<Map<String, Object>> listGeneralModels();

    /**
     * 聊天预检：至少存在一个「启用且有 Key」的通用模型。
     *
     * @param modelId 可指定模型 id
     */
    void ensureActiveModel(String modelId);

    /**
     * 取「启用且有 Key」的通用模型（按 sortOrder），可指定单个模型。
     *
     * @param modelId 可指定模型 id
     * @return 模型与明文 Key
     */
    List<ActiveModel> getActiveModels(String modelId);

    /**
     * 解析训练 / 检索使用的嵌入模型。
     *
     * @param embeddingModelId 指定模型 id（可选）
     * @return 嵌入模型配置
     */
    EmbeddingModel resolveEmbeddingModel(String embeddingModelId);

    /**
     * 把指定嵌入模型设为「当前唯一启用」。
     *
     * @param embeddingModelId 模型 id
     */
    void setActiveEmbeddingModel(String embeddingModelId);

    /**
     * 启用的模型及其明文 Key。
     *
     * @param model  模型实体
     * @param apiKey 明文 Key
     */
    record ActiveModel(DlModel model, String apiKey) {
    }

    /**
     * 嵌入模型解析结果。
     *
     * @param name    模型名（用于日志）
     * @param modelId 模型 ID
     * @param baseUrl 端点
     * @param apiKey  明文 Key
     */
    record EmbeddingModel(String name, String modelId, String baseUrl, String apiKey) {
    }
}
