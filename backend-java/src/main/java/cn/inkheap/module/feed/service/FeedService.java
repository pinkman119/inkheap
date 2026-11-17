package cn.inkheap.module.feed.service;

/**
 * RSS 2.0 feed 生成服务（内存缓存 5 分钟，site-config 更新时失效）。
 */
public interface FeedService {

    /**
     * 生成 RSS。
     *
     * @param requestBaseUrl 回退用的站点根地址（来自请求 Host）
     * @param feedSelfUrl    feed 自身的完整地址
     * @return XML 与站点地址来源（config / fallback / cache）
     */
    FeedResult generateRss(String requestBaseUrl, String feedSelfUrl);

    /**
     * 使缓存失效。
     */
    void invalidateCache();

    /**
     * 生成结果。
     *
     * @param xml           RSS 文本
     * @param siteUrlSource 站点地址来源
     */
    record FeedResult(String xml, String siteUrlSource) {
    }
}
