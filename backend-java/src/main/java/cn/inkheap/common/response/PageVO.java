package cn.inkheap.common.response;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.Data;

import java.util.List;

/**
 * 标准分页响应：{items,total,page,pageSize,totalPages}。
 * totalPages 为 null 时不输出（对齐原 Node 中不带 totalPages 的接口）。
 */
@Data
@JsonInclude(JsonInclude.Include.NON_NULL)
public class PageVO<T> {

    private List<T> items;

    private long total;

    private int page;

    private int pageSize;

    private Integer totalPages;

    public PageVO() {
    }

    public PageVO(List<T> items, long total, int page, int pageSize, boolean withTotalPages) {
        this.items = items;
        this.total = total;
        this.page = page;
        this.pageSize = pageSize;
        this.totalPages = withTotalPages ? (int) Math.ceil(total / (double) pageSize) : null;
    }

    public static <T> PageVO<T> of(List<T> items, long total, int page, int pageSize) {
        return new PageVO<>(items, total, page, pageSize, true);
    }

    public static <T> PageVO<T> ofNoTotalPages(List<T> items, long total, int page, int pageSize) {
        return new PageVO<>(items, total, page, pageSize, false);
    }
}
