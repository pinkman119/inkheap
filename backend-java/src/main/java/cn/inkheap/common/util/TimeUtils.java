package cn.inkheap.common.util;

import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.time.format.DateTimeFormatter;

/**
 * 时区工具：所有「每天一次」的统计一律以 Asia/Shanghai 自然日 0 点为界，
 * 不依赖 JVM 默认时区（容器默认 UTC 会让中国用户的一天在早上 8 点才翻篇）。
 */
public class TimeUtils {

    public static final ZoneId ZONE_SHANGHAI = ZoneId.of("Asia/Shanghai");

    private static final DateTimeFormatter DATE_FORMATTER = DateTimeFormatter.ofPattern("yyyy-MM-dd");

    private TimeUtils() {
    }

    /**
     * 当前时刻所属自然日（Asia/Shanghai）的 0 点，返回 UTC Instant。
     */
    public static Instant startOfDay() {
        return startOfDay(Instant.now());
    }

    public static Instant startOfDay(Instant moment) {
        ZonedDateTime local = moment.atZone(ZONE_SHANGHAI);
        return local.toLocalDate().atStartOfDay(ZONE_SHANGHAI).toInstant();
    }

    /**
     * 某时刻对应的自然日字符串（yyyy-MM-dd，Asia/Shanghai）。
     */
    public static String formatDate(Instant moment) {
        if (moment == null) {
            return null;
        }
        return moment.atZone(ZONE_SHANGHAI).toLocalDate().format(DATE_FORMATTER);
    }

    public static String formatDate(LocalDate date) {
        return date == null ? null : date.format(DATE_FORMATTER);
    }

    /**
     * 解析 yyyy-MM-dd（或带时间的 ISO 字符串）为 Instant。
     */
    public static Instant parseDate(String text) {
        if (text == null || text.isBlank()) {
            return null;
        }
        String value = text.trim();
        if (value.length() == 10) {
            return LocalDate.parse(value).atStartOfDay(ZONE_SHANGHAI).toInstant();
        }
        try {
            return Instant.parse(value);
        } catch (Exception ignored) {
            return ZonedDateTime.parse(value).toInstant();
        }
    }

    /**
     * 自然日字符串（yyyy-MM-dd），用于按天分桶。
     */
    public static String dayKey(Instant moment) {
        return moment.atZone(ZONE_SHANGHAI).toLocalDate().format(DATE_FORMATTER);
    }

    public static Instant now() {
        return Instant.now();
    }
}
