import { Controller, Get, Header, Req, Res } from '@nestjs/common';
import type { Request, Response } from 'express';
import { FeedService } from './feed.service';

/**
 * RSS 订阅接口（博客收录站 / RSS 阅读器使用，无需鉴权）。
 * 输出地址：GET /api/feed.xml，Content-Type: application/rss+xml
 */
@Controller('feed.xml')
export class FeedController {
  constructor(private readonly feedService: FeedService) {}

  @Get()
  @Header('Content-Type', 'application/rss+xml; charset=utf-8')
  async rss(@Req() req: Request, @Res() res: Response) {
    // 站点根地址回退来源：SiteConfig.siteUrl 未配置时用请求 Host 拼链接。
    // main.ts 已设置 trust proxy，Nginx 反代下会正确解析 X-Forwarded-Host / X-Forwarded-Proto。
    const requestBaseUrl = `${req.protocol}://${req.get('host') ?? ''}`;
    const feedSelfUrl = `${requestBaseUrl}/api/feed.xml`;

    const { xml, siteUrlSource } = await this.feedService.generateRss(
      requestBaseUrl,
      feedSelfUrl,
    );
    // 便于排查链接来源：config = 后台站点设置；fallback = 请求 Host（应尽快补配置）
    res.setHeader('X-Feed-Site-Url-Source', siteUrlSource);
    res.send(xml);
  }
}
