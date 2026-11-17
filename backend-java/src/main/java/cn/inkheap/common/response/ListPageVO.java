package cn.inkheap.common.response;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.Data;

import java.util.List;

/**
 * 键为 list 的分页响应：{list,total,page,pageSize,totalPages}。
 * 仅后台小记列表（GET /api/admin/xiaoji）使用，前端按 list 取值。
 */
@Data
@JsonInclude(JsonInclude.Include.NON_NULL)
public class ListPageVO<T> {

    private List<T> list;

    private long total;

    private int page;

    private int pageSize;

    private Integer totalPages;

    public static <T> ListPageVO<T> of(List<T> list, long total, int page, int pageSize) {
        ListPageVO<T> vo = new ListPageVO<>();
        vo.setList(list);
        vo.setTotal(total);
        vo.setPage(page);
        vo.setPageSize(pageSize);
        vo.setTotalPages((int) Math.ceil(total / (double) pageSize));
        return vo;
    }
}
