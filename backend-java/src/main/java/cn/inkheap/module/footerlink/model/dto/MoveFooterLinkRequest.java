package cn.inkheap.module.footerlink.model.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

/**
 * 页脚链接上移 / 下移请求。
 */
@Data
public class MoveFooterLinkRequest {

    @NotBlank(message = "id 不能为空")
    private String id;

    /** up / down */
    private String direction;
}
