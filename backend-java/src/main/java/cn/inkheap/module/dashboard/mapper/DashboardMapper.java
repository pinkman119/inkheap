package cn.inkheap.module.dashboard.mapper;

import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Select;

import java.util.List;
import java.util.Map;

/**
 * 看板聚合查询（多表统计，走原生 SQL）。
 */
@Mapper
public interface DashboardMapper {

    @Select("SELECT count(*) AS total, count(*) FILTER (WHERE \"read\" = FALSE) AS unread FROM contact_messages")
    Map<String, Object> contactStats();

    @Select("SELECT COALESCE(sum(view_count), 0) AS total FROM articles WHERE type = 'article'")
    long sumArticleReads();

    @Select("SELECT COALESCE(sum(count), 0) AS total FROM site_visits")
    long sumVisits();

    @Select("SELECT count(*) AS total FROM email_users")
    long countUsers();

    @Select("SELECT id, title, slug, view_count FROM articles WHERE type = 'article' "
            + "ORDER BY view_count DESC LIMIT 100")
    List<Map<String, Object>> articleRanking();

    @Select("SELECT count(*) AS total FROM articles WHERE type = 'article'")
    long countArticles();

    @Select("SELECT day, count FROM site_visits WHERE day >= #{start}::timestamptz ORDER BY day ASC")
    List<Map<String, Object>> visitsSince(String start);

    @Select("SELECT id, email, nickname, homepage_url, avatar_url, last_login_at, created_at, password "
            + "FROM email_users ORDER BY created_at DESC LIMIT 100")
    List<Map<String, Object>> recentUsers();
}
