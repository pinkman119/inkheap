package cn.inkheap.common.response;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * 列表包装：{items,total?}（评论、数字生命模型/消息、看板用户列表）。
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class ItemsVO<T> {

    private List<T> items;

    private Long total;

    public static <T> ItemsVO<T> of(List<T> items) {
        return new ItemsVO<>(items, null);
    }

    public static <T> ItemsVO<T> of(List<T> items, long total) {
        return new ItemsVO<>(items, total);
    }
}
