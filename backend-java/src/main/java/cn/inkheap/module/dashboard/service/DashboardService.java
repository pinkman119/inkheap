package cn.inkheap.module.dashboard.service;

import cn.inkheap.common.response.ItemsVO;
import cn.inkheap.common.response.PageVO;

import java.util.List;
import java.util.Map;

/**
 * 后台仪表盘服务。
 */
public interface DashboardService {

    /**
     * 四项指标：来信 / 阅读量 / 访问量 / 用户量。
     *
     * @return 统计结果
     */
    Map<String, Object> getStats();

    /**
     * 文章阅读量排行（前 100）。
     *
     * @return {items,totalArticles,totalReads}
     */
    Map<String, Object> getArticleRanking();

    /**
     * 访问量趋势：period = 7 / 30 / 90 / all。
     *
     * @param period 区间
     * @return {series,sum,peak}
     */
    Map<String, Object> getVisitsTrend(String period);

    /**
     * 访问明细分页（不含 totalPages）。
     *
     * @param page     页码
     * @param pageSize 每页条数
     * @return 分页结果
     */
    PageVO<Map<String, Object>> getVisitLogs(int page, int pageSize);

    /**
     * 注册用户列表（附评论数与数字生命消息数）。
     *
     * @return {items,total}
     */
    ItemsVO<Map<String, Object>> getUsers();

    /**
     * 供内部复用的趋势序列构造。
     *
     * @param series 序列
     * @return 汇总
     */
    Map<String, Object> summarize(List<Map<String, Object>> series);
}
