package cn.inkheap.module.siteconfig.service.impl;

import cn.hutool.core.util.StrUtil;
import cn.inkheap.module.siteconfig.entity.SiteConfig;
import cn.inkheap.module.siteconfig.event.SiteConfigUpdatedEvent;
import cn.inkheap.module.siteconfig.mapper.SiteConfigMapper;
import cn.inkheap.module.siteconfig.model.dto.UpdateSiteConfigRequest;
import cn.inkheap.module.siteconfig.service.SiteConfigService;
import com.mybatisflex.spring.service.impl.ServiceImpl;
import lombok.RequiredArgsConstructor;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;

import java.time.Instant;

@Service
@RequiredArgsConstructor
public class SiteConfigServiceImpl extends ServiceImpl<SiteConfigMapper, SiteConfig> implements SiteConfigService {

    private static final String SITE_ID = "site";

    private final ApplicationEventPublisher eventPublisher;

    @Override
    public SiteConfig findOne() {
        // 1、查询单例记录
        SiteConfig record = this.getById(SITE_ID);

        // 2、无记录返回兜底值
        if (record == null) {
            return SiteConfig.builder()
                    .id(SITE_ID)
                    .siteUrl("")
                    .siteTitle("")
                    .siteDescription("")
                    .author("")
                    .build();
        }
        return record;
    }

    @Override
    public SiteConfig update(UpdateSiteConfigRequest request) {
        // 1、读取现有记录，不存在则创建
        SiteConfig existing = this.getById(SITE_ID);
        String siteUrl = request.getSiteUrl() == null ? null : request.getSiteUrl().trim().replaceAll("/+$", "");

        if (existing == null) {
            SiteConfig created = SiteConfig.builder()
                    .id(SITE_ID)
                    .siteUrl(siteUrl == null ? "" : siteUrl)
                    .siteTitle(request.getSiteTitle() == null ? "" : request.getSiteTitle().trim())
                    .siteDescription(request.getSiteDescription() == null ? "" : request.getSiteDescription().trim())
                    .author(request.getAuthor() == null ? "" : request.getAuthor().trim())
                    .createdAt(Instant.now())
                    .updatedAt(Instant.now())
                    .build();
            this.save(created);
            eventPublisher.publishEvent(new SiteConfigUpdatedEvent(created.getSiteUrl()));
            return findOne();
        }

        // 2、仅更新传入字段
        SiteConfig update = SiteConfig.builder()
                .id(SITE_ID)
                .siteUrl(siteUrl)
                .siteTitle(request.getSiteTitle() == null ? null : request.getSiteTitle().trim())
                .siteDescription(request.getSiteDescription() == null ? null : request.getSiteDescription().trim())
                .author(request.getAuthor() == null ? null : request.getAuthor().trim())
                .updatedAt(Instant.now())
                .build();
        this.updateById(update);

        // 3、让 RSS 缓存立即反映新配置
        SiteConfig latest = findOne();
        eventPublisher.publishEvent(new SiteConfigUpdatedEvent(latest.getSiteUrl()));
        return latest;
    }
}
