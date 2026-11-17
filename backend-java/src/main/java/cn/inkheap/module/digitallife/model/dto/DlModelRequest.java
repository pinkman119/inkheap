package cn.inkheap.module.digitallife.model.dto;

import lombok.Data;

/**
 * 模型新增 / 更新请求。
 */
@Data
public class DlModelRequest {

    private String name;

    private String provider;

    private String modelId;

    /** general / embedding */
    private String modelType;

    private String apiKey;
}
