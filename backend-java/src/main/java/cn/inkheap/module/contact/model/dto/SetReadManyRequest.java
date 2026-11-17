package cn.inkheap.module.contact.model.dto;

import lombok.Data;

import java.util.List;

/**
 * 批量标记已读请求。
 */
@Data
public class SetReadManyRequest {

    private List<String> ids;

    private Boolean read;
}
