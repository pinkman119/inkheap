package cn.inkheap.module.contact.model.dto;

import lombok.Data;

/**
 * 标记单条已读 / 未读请求。
 */
@Data
public class SetReadRequest {

    private Boolean read;
}
