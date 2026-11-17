package cn.inkheap.module.siteconfig.event;

/**
 * 站点配置更新事件：用于让 RSS 内存缓存立即失效（避免 Service 之间循环依赖）。
 */
public record SiteConfigUpdatedEvent(String siteUrl) {
}
