import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
// ip2region-ts：离线 xdb 库（国家|省份|城市|运营商），无需外部网络请求
import * as ip2region from 'ip2region-ts';

/**
 * IP 归属地解析：
 * - 启动时把 xdb 全量载入内存（loadContentFromFile），查询无磁盘 IO、线程安全
 * - 同一 IP 结果做进程内缓存，避免重复解析
 * - 解析失败/未就绪时返回「未知」，绝不阻塞上报主流程
 */
@Injectable()
export class GeoService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(GeoService.name);
  private searcher: { search: (ip: string) => Promise<string> } | null = null;
  private readonly cache = new Map<string, string>();

  onModuleInit() {
    try {
      const content = ip2region.loadContentFromFile(ip2region.defaultDbFile);
      this.searcher = ip2region.newWithBuffer(content) as unknown as {
        search: (ip: string) => Promise<string>;
      };
      this.logger.log('IP 归属地库（ip2region）已加载');
    } catch (e) {
      // 库加载失败只影响地区显示，不影响 PV 统计：降级为全部「未知」
      this.logger.warn(`IP 归属地库加载失败，地区将显示为「未知」: ${e?.message ?? e}`);
    }
  }

  onModuleDestroy() {
    this.cache.clear();
    this.searcher = null;
  }

  /** 解析 IP 的展示用地区，如「广东省 深圳市」；内网 IP 返回「内网」 */
  async lookup(rawIp: string): Promise<string> {
    const ip = String(rawIp ?? '').trim();
    if (!ip || ip === 'unknown') return '未知';
    if (/^(127\.|::1|0:0:0:0:0:0:0:1)/.test(ip)) return '内网';

    const cached = this.cache.get(ip);
    if (cached) return cached;
    if (!this.searcher) return '未知';

    try {
      const region = this.formatRegion(await this.searcher.search(ip));
      // 缓存上限保护，防止恶意刷接口把内存打爆
      if (this.cache.size >= 10000) this.cache.clear();
      this.cache.set(ip, region);
      return region;
    } catch {
      return '未知';
    }
  }

  /** 把 xdb 的「国家|区域|省份|城市|运营商」压缩成简洁展示串 */
  private formatRegion(region: string): string {
    const raw = String(region ?? '');
    if (!raw || raw === '0|0|0|0|0') return '未知';

    const [country = '', , province = '', city = ''] = raw.split('|');
    if (province === '内网IP' || city === '内网IP') return '内网';

    // 直辖市等场景 province 已含 city（如 北京/北京市），去重避免「北京 北京市」
    const parts: string[] = [];
    for (const p of [country, province, city]) {
      if (!p || p === '0') continue;
      if (parts.some((x) => x === p || x.includes(p) || p.includes(x))) continue;
      parts.push(p);
    }
    return parts.join(' ') || '未知';
  }
}
