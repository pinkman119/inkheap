package cn.inkheap.module.digitallife.model.vo;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * 训练列表响应：在标准分页字段基础上附带 refType 与中文标签。
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TrainingListVO {

    private List<TrainingItemVO> items;

    private long total;

    private int page;

    private int pageSize;

    private int totalPages;

    private String refType;

    private String refTypeLabel;
}
