package cn.inkheap.common.model;

import lombok.Data;

/**
 * 通用分页参数：page 从 1 开始，pageSize 上限 100（对齐原 Node 的裁剪口径）。
 */
@Data
public class PageRequest {

    private Integer page = 1;

    private Integer pageSize = 20;

    public int pageOrDefault() {
        return page == null || page < 1 ? 1 : page;
    }

    public int pageSizeOrDefault() {
        int size = pageSize == null ? 20 : pageSize;
        if (size < 1) {
            return 20;
        }
        return Math.min(size, 100);
    }

    public int offset() {
        return (pageOrDefault() - 1) * pageSizeOrDefault();
    }
}
