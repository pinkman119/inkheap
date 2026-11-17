package cn.inkheap.common.util;

import cn.hutool.core.util.StrUtil;
import jakarta.servlet.http.HttpServletRequest;

/**
 * 客户端 IP 归一化：取 X-Forwarded-For 首段，剥离 IPv4-mapped IPv6 前缀、收敛环回地址，
 * 与原 Node 实现保持同一口径（否则同一台机器每天能贡献两次阅读）。
 */
public class IpUtils {

    private IpUtils() {
    }

    public static String getClientIp(HttpServletRequest request) {
        if (request == null) {
            return "unknown";
        }
        String forwarded = request.getHeader("X-Forwarded-For");
        String raw;
        if (StrUtil.isNotBlank(forwarded) && !"unknown".equalsIgnoreCase(forwarded.trim())) {
            raw = forwarded.split(",")[0].trim();
        } else {
            String realIp = request.getHeader("X-Real-IP");
            raw = StrUtil.isNotBlank(realIp) ? realIp.trim() : request.getRemoteAddr();
        }
        return normalize(raw);
    }

    /**
     * 归一化：::ffff:1.2.3.4 → 1.2.3.4；::1 与 127.0.0.0/8 → 127.0.0.1；统一小写。
     */
    public static String normalize(String raw) {
        String ip = StrUtil.isBlank(raw) ? "" : raw.trim();
        if (ip.isEmpty()) {
            return "unknown";
        }
        if (ip.regionMatches(true, 0, "::ffff:", 0, 7)) {
            String tail = ip.substring(7);
            if (tail.matches("\\d{1,3}(\\.\\d{1,3}){3}")) {
                return normalizeLoopback(tail);
            }
        }
        return normalizeLoopback(ip.toLowerCase());
    }

    private static String normalizeLoopback(String ip) {
        if ("::1".equals(ip) || "0:0:0:0:0:0:0:1".equals(ip)) {
            return "127.0.0.1";
        }
        if (ip.matches("^127\\.\\d{1,3}\\.\\d{1,3}\\.\\d{1,3}$")) {
            return "127.0.0.1";
        }
        return ip;
    }
}
