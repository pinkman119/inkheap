package cn.inkheap.module.xiaoji.mapper;

import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Select;

import java.util.List;

/**
 * 小记关键词搜索（title / summary / location / content 的 OR 条件）。
 */
@Mapper
public interface BlogSearchMapper {

    @Select("SELECT id FROM blogs WHERE title ILIKE #{keyword} OR summary ILIKE #{keyword} "
            + "OR location ILIKE #{keyword} OR content ILIKE #{keyword}")
    List<String> searchIds(@Param("keyword") String keyword);
}
