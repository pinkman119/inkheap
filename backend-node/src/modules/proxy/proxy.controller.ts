import {
  Controller,
  Get,
  Query,
  Res,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import type { Response } from 'express';
import { Readable } from 'stream';

/**
 * 图片代理：语雀/外链图片直接 <img src> 引用时，部分 CDN 在浏览器侧
 * 会被 ORB（Opaque Response Blocking）或防盗链拦截导致图片不显示。
 * 这里由后端拉取图片再以同源、正确的 image/* Content-Type 转发，
 * 彻底规避上述限制。
 */
@Controller('proxy')
export class ProxyController {
  private readonly logger = new Logger(ProxyController.name);

  @Get('image')
  async image(@Query('url') url: string, @Res() res: Response) {
    if (!url || typeof url !== 'string') {
      throw new BadRequestException('url required');
    }

    let target: URL;
    try {
      target = new URL(url);
    } catch {
      throw new BadRequestException('invalid url');
    }

    // 仅允许 http/https，避免 file://、gopher 等 SSRF 风险
    if (target.protocol !== 'http:' && target.protocol !== 'https:') {
      throw new BadRequestException('unsupported protocol');
    }

    try {
      const upstream = await fetch(target.toString(), {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (compatible; InkHeapBot/1.0; +https://inkheap.local)',
          Accept: 'image/*,*/*',
          Referer: target.origin + '/',
        },
      });

      if (!upstream.ok) {
        res.status(upstream.status).end();
        return;
      }

      const contentType =
        upstream.headers.get('content-type') || 'application/octet-stream';
      res.setHeader('Content-Type', contentType);
      res.setHeader('Cache-Control', 'public, max-age=2592000');
      res.setHeader('Access-Control-Allow-Origin', '*');

      const body = upstream.body;
      if (body && typeof (body as any).pipe === 'function') {
        (body as any).pipe(res);
      } else {
        const buf = Buffer.from(await upstream.arrayBuffer());
        res.end(buf);
      }
    } catch (err) {
      this.logger.error(`proxy image failed: ${target.toString()}`, err as Error);
      if (!res.headersSent) res.status(502).end();
    }
  }
}
