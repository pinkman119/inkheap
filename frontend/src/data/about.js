/**
 * 「关于我」页的结构化内容 — 逐条搬自 prototypes/about-me.html，文案未做任何改动。
 */

export const profile = {
  avatar: 'https://picsum.photos/seed/mountain-cat/300/300',
  avatarAlt: '慕士塔格猫的头像',
  kicker: 'About Me',
  name: '慕士塔格猫',
  lede: 'AI 全栈工程师 · 摄影师 · 登山者。在代码与山野之间，试着把生活过成可被检索、可被对话的样子。',
}

/**
 * 01 年轮 — 按年份归档，每个年份下可有多条经历。
 * 渲染时按 year 倒序（最新的年轮在最上），同一年内按出现顺序。
 */
export const rings = [
  {
    year: '2015',
    items: [
      { title: '初遇代码', desc: '大学开始写 Python，做出第一个能跑的爬虫。那一刻发现：逻辑可以替人干活，挺迷人的。' },
      { title: '参加竞赛', desc: '蓝桥杯拿到国奖，第一次知道"把想法跑成程序"能换来实实在在的认可。' },
    ],
  },
  {
    year: '2018',
    items: [
      { title: '转做 AI 全栈', desc: '进入一支做推荐系统的团队，从特征工程到线上服务一手包办，第一次理解"系统"二字的分量。' },
    ],
  },
  {
    year: '2020',
    items: [
      { title: '登山启蒙', desc: '第一次进高原，爬上四姑娘山。高原反应很诚实，银河也很诚实——城市里没有这种坦诚。' },
    ],
  },
  {
    year: '2022',
    items: [
      { title: '登顶慕士塔格', desc: '7546 米，雪线之上风把人吹得很轻。在海拔几千米的地方，人会重新想清楚什么重要。' },
    ],
  },
  {
    year: '2024',
    items: [
      { title: '墨堆 · 数字生命', desc: '开始把文章、笔记与作品沉淀成一个可对话的"数字我"——用设计记录思考，用检索留住经历。' },
    ],
  },
]

/**
 * 02 我的足迹 — 城市(city) → 具体地点(places) 父子结构
 */
export const footprintData = [
  {
    province: '四川省',
    locations: [
      { city: '甘孜', places: ['那玛峰', '贡嘎雪山'] },
      { city: '阿坝', places: ['四姑娘山'] },
    ],
  },
  {
    province: '云南省',
    locations: [
      { city: '迪庆', places: ['梅里雪山'] },
      { city: '丽江', places: ['玉龙雪山'] },
      { city: '大理', places: ['苍山'] },
    ],
  },
  {
    province: '贵州省',
    locations: [
      { city: '黔东南', places: ['西江千户苗寨'] },
      { city: '安顺', places: ['黄果树瀑布'] },
    ],
  },
  {
    province: '新疆维吾尔自治区',
    locations: [
      { city: '喀什', places: ['帕米尔高原'] },
      { city: '阿勒泰', places: ['喀纳斯'] },
    ],
  },
  {
    province: '广西壮族自治区',
    locations: [
      { city: '崇左市', places: ['剑龙山', '德天大瀑布', '通灵大峡谷'] },
    ],
  },
]

/** 从 footprintData 提取省份名称列表（用于地图点亮） */
export const visitedProvinces = footprintData.map((f) => f.province)

/** 03 旅行介绍 */
export const travels = [
  {
    glyph: 'MT. Muztagh Ata',
    place: '慕士塔格峰',
    meta: '新疆 · 2022 · 7546m',
    note: '雪线之上，风把人吹得很轻。下撤那天，我才真正学会"慢"。',
  },
  {
    glyph: 'Siguniang',
    place: '四姑娘山',
    meta: '四川 · 2020 · 5025m',
    note: '第一次高原反应，也第一次在帐篷外看见横贯天际的银河。',
  },
  {
    glyph: 'Yubeng',
    place: '雨崩',
    meta: '云南 · 2019',
    note: '徒步进神瀑，走了很久。有些地方，开车到不了，只能走着靠近。',
  },
  {
    glyph: 'Iceland',
    place: '冰岛',
    meta: '欧洲 · 2023',
    note: '极光下面泡温泉，世界安静得只剩风声和自己的呼吸。',
  },
  {
    glyph: 'SE Guizhou',
    place: '黔东南',
    meta: '贵州 · 2021',
    note: '苗寨的酒和歌，比城市里的人诚实。一晚敬天地，一晚敬朋友。',
  },
  {
    glyph: 'Coming Soon',
    place: '下一座山',
    meta: '未定 · 计划中',
    note: '想试试更长的线。先把身体和心态都准备好，再出发。',
  },
]

/** 04 自我评价 */
export const selfEvaluation = {
  quote:
    '我不算聪明，只是比多数人更愿意把一件事做到底。代码、登山、摄影都一样——耐心比天赋更有用。我习惯把经历留下来，因为记忆会骗人，文字和影像不会。',
  by: '—— 慕士塔格猫，写给自己',
}

/**
 * 05 事件日历 — GitHub 风格绿色热力块。
 * 以 "YYYY-M-D" 为 key（月份、日期均不带前导零），value 为该日达成的事件列表。
 * 渲染时按所选年份生成热力图，当天事件越多方块越绿；点开某天可看当天事件。
 * 这里只放有意义的"大事件"日期，其余日子留空（不绿）。
 */
export const eventCalendar = {
  '2015-6-30': [
    { title: '大学毕业', desc: '拿到学士学位，正式结束学生身份，开始在社会里写自己的程序。' },
  ],
  '2016-9-12': [
    { title: '学会开车', desc: '科目三一次过，第一次独自把车从驾校开回小区，手握方向盘的踏实感很上头。' },
  ],
  '2023-11-5': [
    { title: '英雄联盟打到大师段位', desc: '单排冲上大师，证明坚持和系统训练真的能把段位打上去。' },
  ],
  '2024-3-18': [
    { title: '炉石传说上了传说', desc: '天梯冲上传说，卡组理解与读牌节奏终于磨到位的那一刻很爽。' },
  ],
  // 演示用的"同日多事件"——当天事件越多，热力块越绿
  '2026-8-11': [
    { title: '英雄联盟上钻石段位', desc: '新赛季定级后一路打到钻石，手感回来了。' },
    { title: '开始健身满一年', desc: '坚持健身整一年，体脂和心态都肉眼可见地变好。' },
    { title: '谈恋爱满一年', desc: '和 TA 在一起满一年，平凡日子里藏着最稳的幸福。' },
  ],
}

/** 事件日历 + 年轮 涉及的年份（用于切换） */
export const eventCalendarYears = [
  ...new Set([
    ...Object.keys(eventCalendar).map((k) => k.split('-')[0]),
    ...rings.map((r) => r.year),
  ]),
].sort((a, b) => b - a)

/** 各 section 的编号 / 标题 / 副标题（写给自己置顶） */
export const sections = [
  { index: '01', title: '写给自己', sub: '我眼中的自己' },
  { index: '02', title: '事件日历', sub: '绿色越深，那天越值得纪念' },
  { index: '03', title: '我的足迹', sub: '点亮每一个到达的省份' },
  { index: '04', title: '旅行介绍', sub: '去过的，和想再去的' },
]
