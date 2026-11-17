package cn.inkheap.module.view.service.impl;

import cn.hutool.core.util.IdUtil;
import cn.inkheap.common.util.IpUtils;
import cn.inkheap.common.util.TimeUtils;
import cn.inkheap.config.AppProperties;
import cn.inkheap.module.article.entity.Article;
import cn.inkheap.module.article.mapper.ArticleMapper;
import cn.inkheap.module.view.mapper.ContentViewMapper;
import cn.inkheap.module.view.service.ViewService;
import cn.inkheap.module.xiaoji.entity.Blog;
import cn.inkheap.module.xiaoji.mapper.BlogMapper;
import jakarta.annotation.Resource;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.time.Instant;

@Slf4j
@Service
public class ViewServiceImpl implements ViewService {

    @Resource
    private ContentViewMapper contentViewMapper;

    @Resource
    private ArticleMapper articleMapper;

    @Resource
    private BlogMapper blogMapper;

    @Resource
    private AppProperties appProperties;

    @Override
    public boolean record(String targetType, String targetId, String rawIp) {
        // 1、按自然日去重写入明细（唯一索引保证并发安全）
        String ip = IpUtils.normalize(rawIp);
        Instant day = TimeUtils.startOfDay();
        int inserted;
        try {
            inserted = contentViewMapper.insertIfAbsent(
                    IdUtil.randomUUID(), targetType, targetId, ip, day, Instant.now());
        } catch (Exception e) {
            // 计数失败不影响详情页返回
            log.error("记录阅读明细失败 {}/{}: {}", targetType, targetId, e.getMessage());
            return false;
        }

        // 2、只有真正插入成功才自增
        if (inserted <= 0) {
            return false;
        }
        bump(targetType, targetId);
        return true;
    }

    @Override
    @Scheduled(cron = "0 30 3 * * ?")
    public void purgeExpired() {
        int days = appProperties.getRetention().getContentViewDays();
        if (days <= 0) {
            return;
        }
        try {
            Instant before = Instant.now().minus(Duration.ofDays(days));
            int removed = contentViewMapper.deleteByQuery(com.mybatisflex.core.query.QueryWrapper.create()
                    .lt(cn.inkheap.module.view.entity.ContentView::getCreatedAt, before));
            if (removed > 0) {
                log.info("已清理 {} 条超过 {} 天的阅读明细", removed, days);
            }
        } catch (Exception e) {
            log.warn("清理阅读明细失败: {}", e.getMessage());
        }
    }

    /**
     * 自增阅读量：只更新 view_count，显式回写原 updated_at（否则点开老文章会把它顶到首页动态最前）。
     */
    private void bump(String targetType, String targetId) {
        try {
            if ("article".equals(targetType)) {
                Article article = articleMapper.selectOneById(targetId);
                if (article == null) {
                    return;
                }
                Article update = Article.builder()
                        .id(targetId)
                        .viewCount((article.getViewCount() == null ? 0 : article.getViewCount()) + 1)
                        .updatedAt(article.getUpdatedAt())
                        .build();
                articleMapper.update(update);
            } else {
                Blog note = blogMapper.selectOneById(targetId);
                if (note == null) {
                    return;
                }
                Blog update = Blog.builder()
                        .id(targetId)
                        .viewCount((note.getViewCount() == null ? 0 : note.getViewCount()) + 1)
                        .updatedAt(note.getUpdatedAt())
                        .build();
                blogMapper.update(update);
            }
        } catch (Exception e) {
            log.warn("阅读量自增失败 {}/{}: {}", targetType, targetId, e.getMessage());
        }
    }
}
