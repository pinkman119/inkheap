/**
 * 数字生命页文案 —— 已接入真实后端（RAG + GLM + muztagh-cat 人格）。
 * 欢迎文案的称呼动态取自首页配置（siteName），此处不再硬编码人名。
 */

/** 欢迎态建议 chips：对齐慕士塔格猫人格（登山 / inkheap / 数字生命） */
export const quickQuestions = [
  '介绍一下你自己',
  '讲讲那玛峰的登山故事',
  'inkheap 是个什么项目？',
  '你是怎么被创造出来的？',
]

/** 欢迎态描述（称呼 {name} 由页面以 siteName 动态替换） */
export const welcomeDesc =
  '这是{name}的「数字生命」—— 由他的性格、经历、文字与作品提炼而成的数字化分身。' +
  '现在和我聊聊他的登山故事、他打磨的项目，或者随便聊点什么。'
