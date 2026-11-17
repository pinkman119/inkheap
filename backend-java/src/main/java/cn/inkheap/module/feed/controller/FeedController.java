package cn.inkheap.module.feed.controller;

import cn.inkheap.common.constant.ApiPrefix;
import cn.inkheap.module.feed.service.FeedService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.annotation.Resource;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * RSS 订阅接口（无需鉴权），输出 /api/feed.xml。
 */
@Tag(name = "RSS")
@RestController
@RequestMapping(ApiPrefix.V1)
public class FeedController {

    private static final MediaType RSS = MediaType.parseMediaType("application/rss+xml;charset=utf-8");

    @Resource
    private FeedService feedService;

    @Operation(summary = "RSS 订阅", description = "Content-Type: application/rss+xml；响应头 X-Feed-Site-Url-Source 标识站点地址来源")
    @GetMapping(value = "feed.xml", produces = "application/rss+xml;charset=utf-8")
    public ResponseEntity<String> rss(HttpServletRequest request) {
        String scheme = request.getHeader("X-Forwarded-Proto");
        if (scheme == null || scheme.isBlank()) {
            scheme = request.getScheme();
        }
        String host = request.getHeader("X-Forwarded-Host");
        if (host == null || host.isBlank()) {
            host = request.getHeader("Host");
        }
        String requestBaseUrl = scheme + "://" + (host == null ? "" : host);
        String feedSelfUrl = requestBaseUrl + "/api/feed.xml";

        FeedService.FeedResult result = feedService.generateRss(requestBaseUrl, feedSelfUrl);
        return ResponseEntity.ok()
                .contentType(RSS)
                .header("X-Feed-Site-Url-Source", result.siteUrlSource())
                .body(result.xml());
    }
}
