package cn.inkheap.module.about.model.dto;

import lombok.Data;

/**
 * 关于我 · 个人资料更新请求。
 */
@Data
public class UpdateAboutProfileRequest {

    private String kicker;

    private String lede;

    private String evaluationQuote;

    private String evaluationBy;
}
