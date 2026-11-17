package cn.inkheap.common.model;

import cn.hutool.core.util.StrUtil;
import lombok.Data;

import java.util.Collection;

/**
 * 分页与排序查询基类：所有业务的 XxxQueryRequest 统一继承此类。
 *
 * <p>约定：
 * <ul>
 *     <li>page / pageSize：分页参数，子类可调整默认 pageSize</li>
 *     <li>sortField：排序字段（实体属性名），为空时使用各业务默认排序</li>
 *     <li>sortOrder：ascend / descend，遵循开发规范</li>
 * </ul>
 */
@Data
public class PageQueryRequest {

    /** 页码，从 1 开始 */
    private Integer page = 1;

    /** 每页条数，默认 20，上限 100 */
    private Integer pageSize = 20;

    /** 排序字段（实体属性名），为空时走业务默认排序 */
    private String sortField;

    /** 排序方向：ascend / descend */
    private String sortOrder;

    /**
     * 页码兜底：null 或小于 1 时返回 1。
     */
    public int pageOrDefault() {
        return page == null || page < 1 ? 1 : page;
    }

    /**
     * 每页条数兜底：默认 20，限制在 [1, 100]。
     */
    public int pageSizeOrDefault() {
        int size = pageSize == null ? 20 : pageSize;
        return Math.min(Math.max(size, 1), 100);
    }

    /**
     * 是否指定了排序字段。
     */
    public boolean hasSortField() {
        return StrUtil.isNotBlank(sortField);
    }

    /**
     * 是否升序：只有显式传 ascend 才升序，其余按倒序处理。
     */
    public boolean sortAsc() {
        return "ascend".equals(sortOrder);
    }

    /**
     * 解析排序字段：仅当字段命中白名单时返回下划线列名，否则返回 null。
     *
     * <p>排序字段直接来自请求参数，必须经白名单过滤后才能拼进 SQL，避免注入。
     *
     * @param allowedFields 允许排序的实体属性名集合（驼峰）
     * @return 数据库列名，或 null 表示按业务默认排序
     */
    public String resolveSortColumn(Collection<String> allowedFields) {
        if (!hasSortField() || allowedFields == null || !allowedFields.contains(sortField)) {
            return null;
        }
        return StrUtil.toUnderlineCase(sortField);
    }
}
