package cn.inkheap.module.proxy.controller;

import cn.inkheap.common.constant.ApiPrefix;
import cn.inkheap.common.exception.BusinessException;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.io.InputStream;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;

/**
 * 图片代理：规避外链 CDN 的 ORB / 防盗链拦截。
 * 比原实现加固两点：连接与读取超时 10s、响应体最大 10MB（超出截断）。
 */
@Slf4j
@Tag(name = "图片代理")
@RestController
@RequestMapping(ApiPrefix.V1 + "/proxy")
public class ProxyController {

    private static final Duration TIMEOUT = Duration.ofSeconds(10);

    private static final int MAX_BYTES = 10 * 1024 * 1024;

    private final HttpClient httpClient = HttpClient.newBuilder()
            .connectTimeout(TIMEOUT)
            .followRedirects(HttpClient.Redirect.NORMAL)
            .build();

    @Operation(summary = "代理外链图片", description = "只允许 http/https；透传 Content-Type；Cache-Control: max-age=2592000")
    @GetMapping("image")
    public ResponseEntity<byte[]> image(@RequestParam(required = false) String url) {
        // 1、参数与协议校验（避免 file:// 等 SSRF 风险）
        if (url == null || url.isBlank()) {
            throw BusinessException.badRequest("url required");
        }
        URI target;
        try {
            target = URI.create(url);
        } catch (Exception e) {
            throw BusinessException.badRequest("invalid url");
        }
        String scheme = target.getScheme();
        if (!"http".equalsIgnoreCase(scheme) && !"https".equalsIgnoreCase(scheme)) {
            throw BusinessException.badRequest("unsupported protocol");
        }

        try {
            // 2、拉取上游内容
            HttpRequest upstreamRequest = HttpRequest.newBuilder(target)
                    .timeout(TIMEOUT)
                    .header("User-Agent", "Mozilla/5.0 (compatible; InkHeapBot/1.0; +https://inkheap.local)")
                    .header("Accept", "image/*,*/*")
                    .header("Referer", target.getScheme() + "://" + target.getAuthority() + "/")
                    .GET()
                    .build();
            HttpResponse<InputStream> upstream = httpClient.send(upstreamRequest, HttpResponse.BodyHandlers.ofInputStream());

            // 3、非 2xx 透传状态码
            if (upstream.statusCode() < 200 || upstream.statusCode() >= 300) {
                return ResponseEntity.status(upstream.statusCode()).build();
            }

            // 4、读取内容（最大 10MB）
            byte[] body;
            try (InputStream inputStream = upstream.body()) {
                body = inputStream.readNBytes(MAX_BYTES);
            }
            String contentType = upstream.headers().firstValue("content-type").orElse("application/octet-stream");
            return ResponseEntity.ok()
                    .contentType(parseContentType(contentType))
                    .header(HttpHeaders.CACHE_CONTROL, "public, max-age=2592000")
                    .header(HttpHeaders.ACCESS_CONTROL_ALLOW_ORIGIN, "*")
                    .body(body);
        } catch (Exception e) {
            log.error("proxy image failed: {}", target, e);
            return ResponseEntity.status(HttpStatus.BAD_GATEWAY).build();
        }
    }

    private MediaType parseContentType(String raw) {
        try {
            return MediaType.parseMediaType(raw);
        } catch (Exception e) {
            return MediaType.APPLICATION_OCTET_STREAM;
        }
    }
}
