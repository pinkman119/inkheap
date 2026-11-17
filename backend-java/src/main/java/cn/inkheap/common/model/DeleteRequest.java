package cn.inkheap.common.model;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

/**
 * 通用删除请求（仅参数超过 2 个或需要实体接收时使用）。
 */
@Data
public class DeleteRequest {

    @NotBlank(message = "id 不能为空")
    private String id;
}
