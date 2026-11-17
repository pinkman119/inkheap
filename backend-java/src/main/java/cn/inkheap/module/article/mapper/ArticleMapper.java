package cn.inkheap.module.article.mapper;

import cn.inkheap.module.article.entity.Article;
import com.mybatisflex.core.BaseMapper;
import org.apache.ibatis.annotations.Mapper;

@Mapper
public interface ArticleMapper extends BaseMapper<Article> {
}
