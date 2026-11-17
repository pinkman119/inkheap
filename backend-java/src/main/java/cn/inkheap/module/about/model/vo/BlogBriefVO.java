package cn.inkheap.module.about.model.vo;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * 足迹绑定小记的最小字段集。
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class BlogBriefVO {

    private String slug;

    private String title;
}
