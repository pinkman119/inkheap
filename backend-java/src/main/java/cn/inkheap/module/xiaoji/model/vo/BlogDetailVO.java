package cn.inkheap.module.xiaoji.model.vo;

import lombok.Data;
import lombok.EqualsAndHashCode;

/**
 * 小记详情：在列表字段基础上附带 prev / next 导航。
 */
@Data
@EqualsAndHashCode(callSuper = true)
public class BlogDetailVO extends BlogVO {

    private BlogCardVO prev;

    private BlogCardVO next;
}
