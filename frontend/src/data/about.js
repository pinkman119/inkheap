/**
 * 「关于我」页内容来源。
 *
 * 业务数据（profile / rings / footprints / events / selfEvaluation）
 * 由后端 /about/* 接口提供，通过 loadAboutData() 异步加载。
 * 头像与署名（name）取自 /public/home-page（与首页同源）。
 *
 * 以下为前端常量（纯展示文案 / 固定映射，不进数据库）：
 * - PROVINCE_FULL / PROVINCE_SHORT  省份全称 ↔ 简称映射（地图点亮用）
 * - sections                        各 section 编号 / 标题 / 副标题
 * - letterToTravelers               「你好，陌生人」一封信（定稿文案，暂不进后台）
 */
import { useApi } from '@/composables/useApi'

const DEFAULT_AVATAR = 'https://picsum.photos/seed/mountain-cat/300/300'

/** 省份全称 → 简称映射（用于显示抽屉标题、悬停 tooltip） */
export const PROVINCE_FULL = {
  新疆: '新疆维吾尔自治区',
  四川: '四川省',
  云南: '云南省',
  贵州: '贵州省',
  广东: '广东省',
}

/** 反向映射：全称 → 简称 */
export const PROVINCE_SHORT = Object.fromEntries(
  Object.entries(PROVINCE_FULL).map(([short, full]) => [full, short]),
)

/** 各 section 的编号 / 标题 / 副标题 */
export const sections = [
  { index: '01', title: '你好，陌生人', sub: '一些写在最前面的话' },
  { index: '02', title: '事件日历', sub: '绿色越深，那天越值得纪念' },
  { index: '03', title: '我的足迹', sub: '点击地图上的省份，看看在这片土地上去过哪里' },
  { index: '04', title: '写给自己', sub: '我眼中的自己' },
]

/** 「你好，陌生人」一封信（定稿文案，前端常量） */
export const letterToTravelers = {
  tag: 'A LETTER TO YOU',
  greeting: '你好，陌生人：',
  body: [
    '如果你偶然路过这里，欢迎停下来歇一歇。',
    '这里没有刻意讨好，也没有标准答案——只是一些代码、一些山路、一些按下快门的瞬间，被慢慢堆叠成现在的样子。',
    '愿你也正在认真生活。',
  ],
  signoff: '—— 慕士塔格猫',
  time: '写于 2026 年夏',
}

/**
 * 把后端的 YYYY-MM-DD 归一化为「YYYY-M-D」（与 calWeeks 生成的 key 对齐）。
 * @param {string} s
 */
function normalizeDateKey(s) {
  if (!s) return s
  const [y, m, d] = s.split('-')
  return `${y}-${Number(m)}-${Number(d)}`
}

/**
 * 事件按日期分组：把后端返回的扁平事件数组聚合成 { 'YYYY-M-D': [{title,desc}] }。
 * @param {Array<{date:string,title:string,desc:string}>} events
 */
export function groupEventsByDate(events) {
  const map = {}
  for (const ev of events || []) {
    const key = normalizeDateKey(ev.date) // 后端 YYYY-MM-DD → YYYY-M-D
    if (!map[key]) map[key] = []
    map[key].push({ title: ev.title, desc: ev.desc })
  }
  return map
}

/**
 * 足迹按省份聚合：把后端返回的扁平足迹数组聚合成 [{ province, records:[...] }]。
 * @param {Array} footprints
 */
function groupByProvince(footprints) {
  const map = {}
  const order = []
  for (const f of footprints || []) {
    if (!map[f.province]) {
      map[f.province] = { province: f.province, records: [] }
      order.push(f.province)
    }
    map[f.province].records.push({
      place: f.place,
      time: f.time,
      location: f.location,
      elevation: f.elevation,
      note: f.note,
    })
  }
  return order.map((p) => map[p])
}

/**
 * 一次性并发拉取「关于我」页所需的全部数据。
 * 返回结构与原静态导出一致，供 AboutMeView 直接装配。
 */
export async function loadAboutData() {
  const api = useApi()
  const [home, profile, rings, footprints, events] = await Promise.all([
    api.get('/public/home-page'),
    api.get('/about/profile'),
    api.get('/about/rings'),
    api.get('/about/footprints'),
    api.get('/about/events'),
  ])

  return {
    profile: {
      avatar: api.assetUrl(home.avatar) || DEFAULT_AVATAR,
      avatarAlt: (home.siteName || 'INKHEAP') + '的头像',
      kicker: profile.kicker || 'About Me',
      name: home.siteName || 'INKHEAP',
      lede: profile.lede || '',
    },
    selfEvaluation: {
      quote: profile.evaluationQuote || '',
      by: profile.evaluationBy || '',
    },
    rings: rings.map((r) => ({ year: r.year, title: r.title, desc: r.desc })),
    footprintData: groupByProvince(footprints),
    visitedProvinces: [...new Set(footprints.map((f) => f.province))],
    eventCalendar: groupEventsByDate(events),
  }
}
