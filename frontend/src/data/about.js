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

/** 01 个人经历 */
export const timeline = [
  {
    year: '2015',
    title: '初遇代码',
    desc: '大学开始写 Python，做出第一个能跑的爬虫。那一刻发现：逻辑可以替人干活，挺迷人的。',
  },
  {
    year: '2018',
    title: '转做 AI 全栈',
    desc: '进入一支做推荐系统的团队，从特征工程到线上服务一手包办，第一次理解"系统"二字的分量。',
  },
  {
    year: '2020',
    title: '登山启蒙',
    desc: '第一次进高原，爬上四姑娘山。高原反应很诚实，银河也很诚实——城市里没有这种坦诚。',
  },
  {
    year: '2022',
    title: '登顶慕士塔格',
    desc: '7546 米，雪线之上风把人吹得很轻。在海拔几千米的地方，人会重新想清楚什么重要。',
  },
  {
    year: '2024',
    title: '墨堆 · 数字生命',
    desc: '开始把文章、笔记与作品沉淀成一个可对话的"数字我"——用设计记录思考，用检索留住经历。',
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

/** 05 朋友评价 */
export const testimonials = [
  {
    quote: '"和猫一起出差最省心，行程、预算、备选方案他全想好了。但真到了山上，他又是最能扛的那个。"',
    initial: '阿',
    name: '阿哲',
    relation: '大学同学 · 产品经理',
  },
  {
    quote: '"他写的代码和他的人一样：不花哨，但该在的地方一定在。出了问题从不甩锅，先一起扛。"',
    initial: 'L',
    name: 'Luna',
    relation: '前同事 · 算法工程师',
  },
  {
    quote: '"登山队里最安静的那个，但每次最关键的结都是他打的。靠谱，是能救命的那种靠谱。"',
    initial: '山',
    name: '山叔',
    relation: '登山搭档 · 向导',
  },
]

/** 各 section 的编号 / 标题 / 副标题 */
export const sections = [
  { index: '01', title: '个人经历', sub: '一条从代码走向山野的轨迹' },
  { index: '02', title: '我的足迹', sub: '点亮每一个到达的省份' },
  { index: '03', title: '旅行介绍', sub: '去过的，和想再去的' },
  { index: '04', title: '自我评价', sub: '我眼中的自己' },
  { index: '05', title: '我的标签', sub: '我眼中的自己与他人' },
]
