package cn.inkheap.module.article.mapper;

import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Select;

import java.util.List;

/**
 * 关键词搜索（title / summary / tags 的 OR 条件），避免在组合查询里拼嵌套条件。
 */
@Mapper
public interface ArticleSearchMapper {

    @Select("SELECT id FROM articles WHERE type = 'article' "
            + "AND (title ILIKE #{keyword} OR summary ILIKE #{keyword} OR tags ILIKE #{keyword})")
    List<String> searchIds(@Param("keyword") String keyword);
}
