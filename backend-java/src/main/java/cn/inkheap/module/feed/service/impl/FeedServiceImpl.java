package cn.inkheap.module.feed.service.impl;

import cn.hutool.core.util.StrUtil;
import cn.inkheap.common.util.JsonUtils;
import cn.inkheap.common.util.MarkdownUtils;
import cn.inkheap.module.article.entity.Article;
import cn.inkheap.module.article.mapper.ArticleMapper;
import cn.inkheap.module.feed.service.FeedService;
import cn.inkheap.module.siteconfig.entity.SiteConfig;
import cn.inkheap.module.siteconfig.event.SiteConfigUpdatedEvent;
import cn.inkheap.module.siteconfig.service.SiteConfigService;
import cn.inkheap.module.xiaoji.entity.Blog;
import cn.inkheap.module.xiaoji.mapper.BlogMapper;
import com.mybatisflex.core.query.QueryWrapper;
import jakarta.annotation.Resource;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import java.util.Map;

@Slf4j
@Service
public class FeedServiceImpl implements FeedService {

    /** feed 最多输出的条目数 */
    private static final int FEED_ITEM_LIMIT = 50;

    /** 摘要回退截断长度（按码点） */
    private static final int SUMMARY_FALLBACK_LENGTH = 150;

    private static final String FEED_LANGUAGE = "zh-CN";

    private static final String FEED_GENERATOR = "INKHEAP";

    private static final long FEED_CACHE_TTL_MS = 5 * 60 * 1000L;

    private static final DateTimeFormatter RFC822 =
            DateTimeFormatter.ofPattern("EEE, dd MMM yyyy HH:mm:ss 'GMT'", Locale.ENGLISH);

    @Resource
    private ArticleMapper articleMapper;

    @Resource
    private BlogMapper blogMapper;

    @Resource
    private SiteConfigService siteConfigService;

    private volatile String cachedXml;

    private volatile long cacheExpiresAt;

    @Override
    public FeedResult generateRss(String requestBaseUrl, String feedSelfUrl) {
        // 1、命中缓存直接返回
        if (cachedXml != null && cacheExpiresAt > System.currentTimeMillis()) {
            return new FeedResult(cachedXml, "cache");
        }

        // 2、优先使用后台配置的站点地址，未配置则回退请求 Host
        SiteConfig config = siteConfigService.findOne();
        boolean configured = StrUtil.isNotBlank(config.getSiteUrl());
        String siteUrl = configured ? config.getSiteUrl() : requestBaseUrl;
        if (!configured) {
            log.warn("SiteConfig.siteUrl 未配置，feed 链接回退到请求 Host；请在后台「站点设置」中填写站点地址");
        }

        // 3、组装并缓存
        String xml = buildXml(config, siteUrl, feedSelfUrl, collectItems(siteUrl));
        cachedXml = xml;
        cacheExpiresAt = System.currentTimeMillis() + FEED_CACHE_TTL_MS;
        return new FeedResult(xml, configured ? "config" : "fallback");
    }

    @Override
    public void invalidateCache() {
        cachedXml = null;
        cacheExpiresAt = 0;
    }

    @EventListener
    public void onSiteConfigUpdated(SiteConfigUpdatedEvent event) {
        invalidateCache();
    }

    private List<FeedItem> collectItems(String siteUrl) {
        // 1、已发布知识库文章与小记各取最近 50 条
        List<Article> articles = articleMapper.selectListByQuery(QueryWrapper.create()
                .eq(Article::getPublished, true)
                .eq(Article::getType, "article")
                .orderBy(Article::getCreatedAt, false)
                .limit(FEED_ITEM_LIMIT));
        List<Blog> blogs = blogMapper.selectListByQuery(QueryWrapper.create()
                .eq(Blog::getPublished, true)
                .orderBy(Blog::getCreatedAt, false)
                .limit(FEED_ITEM_LIMIT));

        List<FeedItem> items = new ArrayList<>();
        for (Article article : articles) {
            String description = StrUtil.isNotBlank(article.getSummary())
                    ? article.getSummary()
                    : MarkdownUtils.truncate(MarkdownUtils.strip(article.getContent()), SUMMARY_FALLBACK_LENGTH);
            items.add(new FeedItem(article.getTitle(), siteUrl + "/#/articles/" + article.getSlug(),
                    description, article.getCreatedAt(), JsonUtils.parseStringList(article.getTags())));
        }
        for (Blog blog : blogs) {
            String description = StrUtil.isNotBlank(blog.getSummary()) ? blog.getSummary()
                    : StrUtil.isNotBlank(blog.getQuote()) ? blog.getQuote()
                    : MarkdownUtils.truncate(MarkdownUtils.strip(blog.getContent()), SUMMARY_FALLBACK_LENGTH);
            if ("album".equals(blog.getType())) {
                int photoCount = JsonUtils.parseMapList(blog.getPhotos()).size();
                if (photoCount > 0) {
                    String hint = "（含 " + photoCount + " 张图片）";
                    description = description.isEmpty() ? hint : description + hint;
                }
            }
            items.add(new FeedItem(blog.getTitle(), siteUrl + "/#/xiaoji/" + blog.getSlug(),
                    description, blog.getCreatedAt(), JsonUtils.parseStringList(blog.getTags())));
        }

        // 2、合并后按时间倒序截断
        items.sort(Comparator.comparing((FeedItem item) -> item.pubDate).reversed());
        return items.size() > FEED_ITEM_LIMIT ? items.subList(0, FEED_ITEM_LIMIT) : items;
    }

    private String buildXml(SiteConfig config, String siteUrl, String feedSelfUrl, List<FeedItem> items) {
        String title = StrUtil.isBlank(config.getSiteTitle()) ? "墨堆" : config.getSiteTitle();
        Instant lastBuildDate = items.isEmpty() ? Instant.now() : items.get(0).pubDate;

        StringBuilder xml = new StringBuilder(8192);
        xml.append("<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n");
        xml.append("<rss version=\"2.0\" xmlns:atom=\"http://www.w3.org/2005/Atom\">\n");
        xml.append("  <channel>\n");
        xml.append("    <title>").append(escapeXml(title)).append("</title>\n");
        xml.append("    <link>").append(escapeXml(siteUrl)).append("</link>\n");
        xml.append("    <description>").append(escapeXml(config.getSiteDescription())).append("</description>\n");
        xml.append("    <language>").append(FEED_LANGUAGE).append("</language>\n");
        if (StrUtil.isNotBlank(config.getAuthor())) {
            xml.append("    <managingEditor>").append(escapeXml(config.getAuthor())).append("</managingEditor>\n");
        }
        xml.append("    <lastBuildDate>").append(toRfc822(lastBuildDate)).append("</lastBuildDate>\n");
        xml.append("    <generator>").append(FEED_GENERATOR).append("</generator>\n");
        xml.append("    <atom:link href=\"").append(escapeXml(feedSelfUrl))
                .append("\" rel=\"self\" type=\"application/rss+xml\"/>\n");
        for (FeedItem item : items) {
            xml.append("    <item>\n");
            xml.append("      <title>").append(escapeXml(item.title)).append("</title>\n");
            xml.append("      <link>").append(escapeXml(item.link)).append("</link>\n");
            xml.append("      <guid isPermaLink=\"true\">").append(escapeXml(item.link)).append("</guid>\n");
            xml.append("      <pubDate>").append(toRfc822(item.pubDate)).append("</pubDate>\n");
            xml.append("      <description>").append(escapeXml(item.description)).append("</description>\n");
            for (String category : item.categories) {
                xml.append("      <category>").append(escapeXml(category)).append("</category>\n");
            }
            xml.append("    </item>\n");
        }
        xml.append("  </channel>\n");
        xml.append("</rss>\n");
        return xml.toString();
    }

    private String escapeXml(String value) {
        return StrUtil.nullToEmpty(value)
                .replace("&", "&amp;")
                .replace("<", "&lt;")
                .replace(">", "&gt;")
                .replace("\"", "&quot;")
                .replace("'", "&apos;");
    }

    private String toRfc822(Instant instant) {
        return RFC822.format(instant.atZone(ZoneOffset.UTC));
    }

    /**
     * feed 条目（内部中间结构）。
     */
    private record FeedItem(String title, String link, String description, Instant pubDate, List<String> categories) {
    }
}
