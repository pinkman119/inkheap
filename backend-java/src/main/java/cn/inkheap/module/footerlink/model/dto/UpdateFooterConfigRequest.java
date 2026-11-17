package cn.inkheap.module.footerlink.model.dto;

import lombok.Data;

/**
 * 页脚备案信息更新请求。
 */
@Data
public class UpdateFooterConfigRequest {

    private String icpNo;

    private String icpUrl;
}
