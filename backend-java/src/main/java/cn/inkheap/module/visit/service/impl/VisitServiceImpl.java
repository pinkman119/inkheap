package cn.inkheap.module.visit.service.impl;

import cn.hutool.core.util.IdUtil;
import cn.inkheap.common.response.PageVO;
import cn.inkheap.common.util.IpUtils;
import cn.inkheap.common.util.TimeUtils;
import cn.inkheap.config.AppProperties;
import cn.inkheap.module.visit.entity.SiteVisit;
import cn.inkheap.module.visit.entity.VisitLog;
import cn.inkheap.module.visit.mapper.SiteVisitMapper;
import cn.inkheap.module.visit.mapper.VisitLogMapper;
import cn.inkheap.module.visit.service.GeoService;
import cn.inkheap.module.visit.service.VisitService;
import com.mybatisflex.core.paginate.Page;
import com.mybatisflex.core.query.QueryWrapper;
import jakarta.annotation.Resource;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Slf4j
@Service
public class VisitServiceImpl implements VisitService {

    @Resource
    private SiteVisitMapper siteVisitMapper;

    @Resource
    private VisitLogMapper visitLogMapper;

    @Resource
    private GeoService geoService;

    @Resource
    private AppProperties appProperties;

    @Override
    public Map<String, Object> report(String path, String rawIp) {
        // 1、按自然日聚合自增
        Instant day = TimeUtils.startOfDay();
        String ip = IpUtils.normalize(rawIp);
        siteVisitMapper.upsertIncrement(IdUtil.randomUUID(), day);

        // 2、明细落库失败不影响聚合计数
        try {
            VisitLog visitLog = VisitLog.builder()
                    .id(IdUtil.randomUUID())
                    .day(day)
                    .ip(ip)
                    .region(geoService.lookup(ip))
                    .path(path == null ? "/" : path)
                    .createdAt(Instant.now())
                    .build();
            visitLogMapper.insert(visitLog);
        } catch (Exception e) {
            log.warn("访问明细落库失败: {}", e.getMessage());
        }

        // 3、返回当天计数
        SiteVisit visit = siteVisitMapper.selectOneByQuery(QueryWrapper.create().eq(SiteVisit::getDay, day));
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("day", visit == null ? day : visit.getDay());
        result.put("count", visit == null ? 1 : visit.getCount());
        return result;
    }

    @Override
    public PageVO<Map<String, Object>> getLogs(int page, int pageSize) {
        // 1、分页参数裁剪
        int current = Math.max(1, page);
        int size = Math.min(100, Math.max(1, pageSize));

        // 2、按时间倒序查明细
        Page<VisitLog> result = visitLogMapper.paginate(current, size, QueryWrapper.create()
                .orderBy(VisitLog::getCreatedAt, false));

        // 3、只输出列表所需字段
        List<Map<String, Object>> items = new ArrayList<>(result.getRecords().size());
        for (VisitLog visitLog : result.getRecords()) {
            Map<String, Object> item = new LinkedHashMap<>();
            item.put("id", visitLog.getId());
            item.put("ip", visitLog.getIp());
            item.put("region", visitLog.getRegion());
            item.put("path", visitLog.getPath());
            item.put("createdAt", visitLog.getCreatedAt());
            items.add(item);
        }
        return PageVO.ofNoTotalPages(items, result.getTotalRow(), current, size);
    }

    @Override
    @Scheduled(cron = "0 0 3 * * ?")
    public void purgeExpired() {
        int days = appProperties.getRetention().getVisitLogDays();
        if (days <= 0) {
            return;
        }
        try {
            Instant before = Instant.now().minus(Duration.ofDays(days));
            int removed = visitLogMapper.deleteByQuery(QueryWrapper.create().lt(VisitLog::getCreatedAt, before));
            if (removed > 0) {
                log.info("已清理 {} 条超过 {} 天的访问明细", removed, days);
            }
        } catch (Exception e) {
            log.warn("清理访问明细失败: {}", e.getMessage());
        }
    }
}
