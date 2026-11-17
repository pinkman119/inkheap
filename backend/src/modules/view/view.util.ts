/**
 * 阅读统计的通用工具：自然日切分、客户端 IP 归一化、展示值口径。
 */

/** 自然日按该时区切分（站点面向中国用户，固定 Asia/Shanghai） */
export const VIEW_DAY_TIMEZONE = 'Asia/Shanghai';

const DAY_MS = 24 * 60 * 60 * 1000;

/** 取某一时刻在指定时区下的 UTC 偏移量（毫秒） */
function tzOffsetMs(date: Date, timeZone: string): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hour12: false,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).formatToParts(date);

  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value ?? 0);
  const asUtc = Date.UTC(
    get('year'),
    get('month') - 1,
    get('day'),
    get('hour') % 24, // 部分环境下午夜会格式化为 24
    get('minute'),
    get('second'),
  );
  // 格式化结果只有秒级精度，直接相减会残留毫秒误差（导致「当天零点」算出来带毫秒，
  // 唯一索引失效、同一 IP 被重复计数）。所有真实时区偏移都是整分钟，取整即可对齐。
  return Math.round((asUtc - date.getTime()) / 60000) * 60000;
}

/**
 * 指定时区当天零点对应的 UTC 时刻。
 * 不直接用服务器本地时区：容器默认 UTC 会让中国用户的「一天」在早上 8 点才翻篇。
 */
export function startOfViewDay(now: Date = new Date(), timeZone = VIEW_DAY_TIMEZONE): Date {
  const offset = tzOffsetMs(now, timeZone);
  const localMidnight = Math.floor((now.getTime() + offset) / DAY_MS) * DAY_MS;
  // 用「零点」这一时刻的偏移量反推 UTC，避免跨夏令时产生 1 小时误差
  const offsetAtMidnight = tzOffsetMs(new Date(localMidnight - offset), timeZone);
  return new Date(localMidnight - offsetAtMidnight);
}

/**
 * 归一化客户端 IP：
 * - 剥离 IPv4-mapped IPv6 前缀（::ffff:116.25.1.2 → 116.25.1.2），否则同一用户会被算成两种 IP
 * - 统一小写，避免 IPv6 大小写差异造成重复计数
 */
export function normalizeClientIp(raw?: string): string {
  const ip = String(raw ?? '').trim();
  if (!ip) return 'unknown';

  // IPv4-mapped IPv6（::ffff:116.25.1.2）还原成 IPv4，否则同一用户会被算成两种 IP
  const mapped = ip.match(/^::ffff:(\d{1,3}(?:\.\d{1,3}){3})$/i);
  if (mapped) return normalizeLoopback(mapped[1]);

  return normalizeLoopback(ip.toLowerCase());
}

/**
 * 环回地址统一成 127.0.0.1。
 * 双栈环境下 localhost 可能解析成 ::1 或 127.0.0.1，
 * 不归一的话同一台机器当天能贡献两次阅读（开发环境尤其明显）。
 * 整个 127.0.0.0/8 都是环回段，一并收敛。
 */
function normalizeLoopback(ip: string): string {
  if (ip === '::1' || ip === '0:0:0:0:0:0:0:1') return '127.0.0.1';
  if (/^127\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(ip)) return '127.0.0.1';
  return ip;
}

/**
 * 前台展示的阅读量口径：设置了虚拟阅读量则直接展示虚拟值，否则展示真实值。
 * 0 是合法值（强制显示 0），只有 null / undefined / 负数表示「未设置」。
 */
export function resolveDisplayViews(
  viewCount?: number | null,
  virtualViewCount?: number | null,
): number {
  const real = Number(viewCount ?? 0);
  if (virtualViewCount === null || virtualViewCount === undefined) return real;
  const virtual = Number(virtualViewCount);
  return Number.isFinite(virtual) && virtual >= 0 ? virtual : real;
}
