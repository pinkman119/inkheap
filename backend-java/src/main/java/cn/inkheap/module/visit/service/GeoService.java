package cn.inkheap.module.visit.service;

import cn.hutool.core.util.StrUtil;
import org.springframework.stereotype.Service;

import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * IP 归属地解析：本地 / 内网直接标注，公网地址在未加载离线库时返回「未知」。
 * 解析失败绝不阻塞上报主流程（与原实现的降级口径一致）。
 */
@Service
public class GeoService {

    private static final int CACHE_LIMIT = 10000;

    private final Map<String, String> cache = new ConcurrentHashMap<>();

    /**
     * 解析 IP 的展示用地区。
     *
     * @param rawIp 归一化后的 IP
     * @return 地区文案
     */
    public String lookup(String rawIp) {
        String ip = StrUtil.nullToEmpty(rawIp).trim();
        if (ip.isEmpty() || "unknown".equals(ip)) {
            return "未知";
        }
        if (ip.startsWith("127.") || "::1".equals(ip) || ip.startsWith("0:0:0:0:0:0:0:1")
                || ip.startsWith("192.168.") || ip.startsWith("10.") || ip.startsWith("172.16.")) {
            return "内网";
        }
        String cached = cache.get(ip);
        if (cached != null) {
            return cached;
        }
        // 未接入离线 IP 库时统一降级为「未知」，不影响 PV 统计
        if (cache.size() >= CACHE_LIMIT) {
            cache.clear();
        }
        cache.put(ip, "未知");
        return "未知";
    }
}
