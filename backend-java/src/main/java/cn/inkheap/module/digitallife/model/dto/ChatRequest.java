package cn.inkheap.module.digitallife.model.dto;

import lombok.Data;

/**
 * 数字生命聊天请求。
 */
@Data
public class ChatRequest {

    private String content;

    private String sessionId;

    private String modelId;
}
