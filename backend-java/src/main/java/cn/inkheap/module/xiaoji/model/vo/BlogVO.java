package cn.inkheap.module.xiaoji.model.vo;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.util.List;
import java.util.Map;

/**
 * 小记响应：tags / photos 解析为数组，并给出 displayViewCount。
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class BlogVO {

    private String id;

    private String slug;

    private String title;

    private String type;

    private List<String> tags;

    private String content;

    private String summary;

    private String quote;

    private String location;

    private String date;

    private List<Map<String, Object>> photos;

    private Boolean published;

    private Integer viewCount;

    private Integer virtualViewCount;

    private Integer displayViewCount;

    private Instant createdAt;

    private Instant updatedAt;

    private Integer trainType;
}
