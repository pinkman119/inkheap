package cn.inkheap.module.xiaoji.model.vo;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * 小记导航卡片（prev / next 的最小字段集）。
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class BlogCardVO {

    private String id;

    private String slug;

    private String title;

    private String type;

    private String date;

    private String cover;

    private String quote;
}
