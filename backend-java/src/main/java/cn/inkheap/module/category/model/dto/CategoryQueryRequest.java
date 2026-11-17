package cn.inkheap.module.category.model.dto;

import cn.inkheap.common.model.PageQueryRequest;
import lombok.Data;
import lombok.EqualsAndHashCode;

/**
 * 分类查询参数：前台与后台共用。
 */
@Data
@EqualsAndHashCode(callSuper = true)
public class CategoryQueryRequest extends PageQueryRequest {

    /** 主键 */
    private String id;

    /** 分类标识 */
    private String key;

    /** 分类名称（模糊匹配） */
    private String name;

    /** 上级分类标识：传入时只查该父分类下的子分类 */
    private String parentKey;
}
