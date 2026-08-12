/**
 * 小记页静态数据 — 逐条搬自 prototypes/xiaoji.html，文案 / 日期 / 顺序均未改动。
 */

/** 筛选标签，与原型 .filter-bar 里的 data-tag 一一对应 */
export const noteTags = [
  { key: 'all', label: '全部' },
  { key: 'brew', label: '酿酒' },
  { key: 'photo', label: '摄影' },
  { key: 'btc', label: 'BTC' },
  { key: 'misc', label: '杂谈' },
]

/** 小记卡片，顺序与原型 DOM 顺序一致 */
export const notes = [
  {
    id: 'plum-wine',
    tag: 'brew',
    glyph: '🍶',
    coverTag: '酿酒',
    meta: '2024-03-18 · 约 6 分钟',
    title: '第一次酿梅子酒',
    excerpt: '青梅、冰糖、白酒的比例，以及等待的浪漫。封坛那天我在纸上写：半年后再见。',
    href: '#',
  },
  {
    id: 'snow-night-long-exposure',
    tag: 'photo',
    glyph: '📷',
    coverTag: '摄影',
    meta: '2024-02-09 · 约 5 分钟',
    title: '雪夜里的长曝光',
    excerpt: '三脚架、ND 滤镜，和一杯等不到凉透的热咖啡。三十秒的快门，记下了一整条街的流动。',
    href: '#',
  },
  {
    id: 'hodl-three-years',
    tag: 'btc',
    glyph: '₿',
    coverTag: 'BTC',
    meta: '2024-01-22 · 约 8 分钟',
    title: '囤币三年的一些碎想',
    excerpt: '不是投资建议，只是我和时间的一场博弈。最难的从来不是买，而是什么都不做地拿着。',
    href: '#',
  },
  {
    id: 'why-i-keep-notes',
    tag: 'misc',
    glyph: '✎',
    coverTag: '杂谈',
    meta: '2023-12-30 · 约 4 分钟',
    title: '为什么我坚持写小记',
    excerpt: '记录本身就是一种抵抗——抵抗遗忘，也抵抗被算法替我们记住。手写不出的，就写在这里。',
    href: '#',
  },
  {
    id: 'homebrew-ale-fail',
    tag: 'brew',
    glyph: '🍺',
    coverTag: '酿酒',
    meta: '2023-11-11 · 约 7 分钟',
    title: '自酿艾尔的一次翻车',
    excerpt: '温控没做好，得到一桶酸掉的家伙。失败也是配方的一部分，下次我把发酵桶搬进了衣柜。',
    href: '#',
  },
  {
    id: 'street-photo-rejections',
    tag: 'photo',
    glyph: '🏙',
    coverTag: '摄影',
    meta: '2023-10-05 · 约 6 分钟',
    title: '扫街时被拒绝的十二次',
    excerpt: '关于边界、尊重与勇气。第十二次，对方笑着点了头——原来拒绝的不是镜头，是贸然。',
    href: '#',
  },
  {
    id: 'cold-wallet-amnesia',
    tag: 'btc',
    glyph: '🔑',
    coverTag: 'BTC',
    meta: '2023-09-14 · 约 5 分钟',
    title: '冷钱包与健忘症',
    excerpt:
      '把私钥写进纸质备份的那天，我才真正理解"掌握在自己手里"的分量，也理解了备份的焦虑。',
    href: '#',
  },
  {
    id: 'mountain-signal-city-anxiety',
    tag: 'misc',
    glyph: '⛰',
    coverTag: '杂谈',
    meta: '2023-08-02 · 约 5 分钟',
    title: '山里的信号与城市的焦虑',
    excerpt: '断网一周后，世界并没有塌。回到城市的第一天，手机震个不停，焦虑却准时上岗。',
    href: '#',
  },
  {
    id: 'milky-way-night',
    tag: 'photo',
    glyph: '🌌',
    coverTag: '摄影',
    meta: '2023-07-19 · 约 6 分钟',
    title: '拍下银河的那晚',
    excerpt: '高海拔、零光污染、和三脚架较劲两小时。当银河在屏幕上亮起来的瞬间，一切都值了。',
    href: '#',
  },
]
