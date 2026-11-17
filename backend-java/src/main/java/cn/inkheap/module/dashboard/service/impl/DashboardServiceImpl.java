package cn.inkheap.module.dashboard.service.impl;

import cn.inkheap.common.exception.BusinessException;
import cn.inkheap.common.response.ItemsVO;
import cn.inkheap.common.response.PageVO;
import cn.inkheap.common.util.TimeUtils;
import cn.inkheap.module.comment.mapper.CommentMapper;
import cn.inkheap.module.dashboard.mapper.DashboardMapper;
import cn.inkheap.module.dashboard.service.DashboardService;
import cn.inkheap.module.visit.service.VisitService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class DashboardServiceImpl implements DashboardService {

    private final DashboardMapper dashboardMapper;

    private final CommentMapper commentMapper;

    private final VisitService visitService;

    @Override
    public Map<String, Object> getStats() {
        // 1、来信总数 / 未读数
        Map<String, Object> contact = dashboardMapper.contactStats();

        // 2、阅读量、访问量、用户量
        Map<String, Object> messages = new LinkedHashMap<>();
        messages.put("total", toLong(contact == null ? null : contact.get("total")));
        messages.put("unread", toLong(contact == null ? null : contact.get("unread")));

        Map<String, Object> reads = new LinkedHashMap<>();
        reads.put("total", dashboardMapper.sumArticleReads());

        Map<String, Object> visits = new LinkedHashMap<>();
        visits.put("total", dashboardMapper.sumVisits());

        Map<String, Object> users = new LinkedHashMap<>();
        users.put("total", dashboardMapper.countUsers());

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("messages", messages);
        result.put("reads", reads);
        result.put("visits", visits);
        result.put("users", users);
        return result;
    }

    @Override
    public Map<String, Object> getArticleRanking() {
        // 1、按阅读量倒序取前 100
        List<Map<String, Object>> rows = dashboardMapper.articleRanking();
        List<Map<String, Object>> items = new ArrayList<>(rows.size());
        for (Map<String, Object> row : rows) {
            Map<String, Object> item = new LinkedHashMap<>();
            item.put("id", row.get("id"));
            item.put("title", row.get("title"));
            item.put("slug", row.get("slug"));
            item.put("viewCount", toLong(row.get("view_count")));
            items.add(item);
        }

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("items", items);
        result.put("totalArticles", dashboardMapper.countArticles());
        result.put("totalReads", dashboardMapper.sumArticleReads());
        return result;
    }

    @Override
    public Map<String, Object> getVisitsTrend(String period) {
        // 1、参数校验
        if (!List.of("7", "30", "90", "all").contains(period)) {
            throw BusinessException.badRequest("period 仅支持 7 / 30 / 90 / all");
        }

        // 2、按月或按天聚合
        if ("all".equals(period)) {
            return getVisitsTrendMonthly();
        }
        return getVisitsTrendDaily(Integer.parseInt(period));
    }

    @Override
    public PageVO<Map<String, Object>> getVisitLogs(int page, int pageSize) {
        return visitService.getLogs(page, pageSize);
    }

    @Override
    public ItemsVO<Map<String, Object>> getUsers() {
        // 1、最近 100 个注册用户
        List<Map<String, Object>> rows = dashboardMapper.recentUsers();

        // 2、评论数与聊天消息数
        Map<String, Long> commentByUser = new HashMap<>();
        for (Map<String, Object> row : commentMapper.countGroupByUser()) {
            commentByUser.put(String.valueOf(row.get("user_id")), toLong(row.get("cnt")));
        }
        Map<String, Long> messageByUser = new HashMap<>();
        for (Map<String, Object> row : commentMapper.countChatGroupByUser()) {
            messageByUser.put(String.valueOf(row.get("user_id")), toLong(row.get("cnt")));
        }

        // 3、组装列表（不返回 password）
        List<Map<String, Object>> items = new ArrayList<>(rows.size());
        for (Map<String, Object> row : rows) {
            String id = String.valueOf(row.get("id"));
            Map<String, Object> item = new LinkedHashMap<>();
            item.put("id", id);
            item.put("nickname", row.get("nickname"));
            item.put("email", row.get("email"));
            item.put("homepageUrl", row.get("homepage_url"));
            item.put("avatarUrl", row.get("avatar_url"));
            item.put("createdAt", row.get("created_at"));
            item.put("lastLoginAt", row.get("last_login_at"));
            item.put("commentCount", commentByUser.getOrDefault(id, 0L));
            item.put("messageCount", messageByUser.getOrDefault(id, 0L));
            items.add(item);
        }

        return ItemsVO.of(items, dashboardMapper.countUsers());
    }

    @Override
    public Map<String, Object> summarize(List<Map<String, Object>> series) {
        long sum = 0;
        long peak = 0;
        for (Map<String, Object> point : series) {
            long value = toLong(point.get("value"));
            sum += value;
            peak = Math.max(peak, value);
        }
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("series", series);
        result.put("sum", sum);
        result.put("peak", peak);
        return result;
    }

    private Map<String, Object> getVisitsTrendDaily(int days) {
        // 1、起点：Asia/Shanghai 今天往前 days-1 天
        ZoneId zone = TimeUtils.ZONE_SHANGHAI;
        LocalDate today = LocalDate.now(zone);
        LocalDate startDate = today.minusDays(days - 1L);
        Instant start = startDate.atStartOfDay(zone).toInstant();

        // 2、按天聚合
        Map<String, Long> byDay = new HashMap<>();
        for (Map<String, Object> row : dashboardMapper.visitsSince(start.toString())) {
            byDay.put(dayKey(row.get("day")), toLong(row.get("count")));
        }

        // 3、补齐空白日
        List<Map<String, Object>> series = new ArrayList<>(days);
        for (int i = 0; i < days; i++) {
            LocalDate date = startDate.plusDays(i);
            Map<String, Object> point = new LinkedHashMap<>();
            point.put("label", (date.getMonthValue()) + "/" + date.getDayOfMonth());
            point.put("value", byDay.getOrDefault(date.format(DateTimeFormatter.ISO_DATE), 0L));
            series.add(point);
        }
        return summarize(series);
    }

    private Map<String, Object> getVisitsTrendMonthly() {
        // 1、起点：11 个月前的 1 号
        ZoneId zone = TimeUtils.ZONE_SHANGHAI;
        LocalDate today = LocalDate.now(zone);
        LocalDate startDate = today.minusMonths(11).withDayOfMonth(1);
        Instant start = startDate.atStartOfDay(zone).toInstant();

        // 2、按月聚合
        Map<String, Long> byMonth = new HashMap<>();
        for (Map<String, Object> row : dashboardMapper.visitsSince(start.toString())) {
            Instant day = toInstant(row.get("day"));
            if (day == null) {
                continue;
            }
            LocalDate date = day.atZone(zone).toLocalDate();
            String key = date.getYear() + "-" + date.getMonthValue();
            byMonth.merge(key, toLong(row.get("count")), Long::sum);
        }

        // 3、补齐空白月
        List<Map<String, Object>> series = new ArrayList<>(12);
        for (int i = 11; i >= 0; i--) {
            LocalDate date = today.minusMonths(i);
            Map<String, Object> point = new LinkedHashMap<>();
            point.put("label", date.getMonthValue() + "月");
            point.put("value", byMonth.getOrDefault(date.getYear() + "-" + date.getMonthValue(), 0L));
            series.add(point);
        }
        return summarize(series);
    }

    private String dayKey(Object raw) {
        Instant instant = toInstant(raw);
        return instant == null ? "" : TimeUtils.dayKey(instant);
    }

    /**
     * 兼容 JDBC 返回的 Timestamp / OffsetDateTime / 字符串，统一转 Instant。
     */
    private Instant toInstant(Object raw) {
        if (raw == null) {
            return null;
        }
        if (raw instanceof Instant instant) {
            return instant;
        }
        if (raw instanceof java.util.Date date) {
            return date.toInstant();
        }
        if (raw instanceof java.time.OffsetDateTime offsetDateTime) {
            return offsetDateTime.toInstant();
        }
        if (raw instanceof java.time.LocalDateTime localDateTime) {
            return localDateTime.atZone(TimeUtils.ZONE_SHANGHAI).toInstant();
        }
        return TimeUtils.parseDate(String.valueOf(raw));
    }

    private long toLong(Object value) {
        if (value == null) {
            return 0L;
        }
        if (value instanceof Number number) {
            return number.longValue();
        }
        try {
            return Long.parseLong(String.valueOf(value));
        } catch (NumberFormatException e) {
            return 0L;
        }
    }
}
