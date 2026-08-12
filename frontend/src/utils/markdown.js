/**
 * Markdown 渲染工具：集中配置 marked + highlight.js + DOMPurify。
 *
 * - marked：把 markdown 字符串编译成 HTML
 * - highlight.js：代码块语法高亮（自动识别语言，如 yaml / bash / js）
 * - DOMPurify：净化输出 HTML，防止未来接入后端 / 用户内容带来的 XSS
 *
 * 用法：
 *   import { renderMarkdown } from '@/utils/markdown'
 *   const html = renderMarkdown(mdSource)
 */
import { marked } from 'marked'
import { gfmHeadingId } from 'marked-gfm-heading-id'
import hljs from 'highlight.js/lib/common'
import DOMPurify from 'dompurify'

/**
 * 提示框扩展：支持 :::tip / :::warning / :::info 语法
 *   :::tip 小标题
 *   正文内容
 *   :::
 * 编译为 <div class="md-callout callout" data-type="tip"><div class="c-title">小标题</div><p>正文</p></div>
 * 复用详情页已有的 .callout 样式，无需新增 CSS。
 */
function calloutExtension() {
  return {
    name: 'callout',
    level: 'block',
    start(src) {
      return src.indexOf(':::')
    },
    tokenizer(src) {
      const rule = /^:::(\w+)(?:\s+(.*))?\n([\s\S]*?):::/
      const match = rule.exec(src)
      if (match) {
        const token = {
          type: 'callout',
          raw: match[0],
          calloutType: match[1].toLowerCase(),
          title: match[2] || '',
          text: match[3].trim(),
          tokens: [],
        }
        this.lexer.blockTokens(token.text, token.tokens)
        return token
      }
      return false
    },
    renderer(token) {
      const inner = this.parser.parse(token.tokens)
      const title = token.title
        ? `<div class="c-title">${token.title}</div>`
        : ''
      // 原型 .callout 结构：<div class="callout"><svg/><div> 包裹内容 </div></div>
      // 此处无 SVG 图标，用 .md-callout 以列方向排列，复用边框与底色
      return `<div class="md-callout callout" data-type="${token.calloutType}"><div class="md-callout-body">${title}${inner}</div></div>\n`
    },
  }
}

// v18: heading IDs 需通过 marked-gfm-heading-id 扩展生成
marked.use(gfmHeadingId())

marked.use({
  gfm: true,
  breaks: false,
  // 代码块交给 highlight.js
  highlight(code, lang) {
    const language = lang && hljs.getLanguage(lang) ? lang : ''
    const highlighted = language
      ? hljs.highlight(code, { language }).value
      : hljs.highlightAuto(code).value
    return `<pre class="code-block"><code class="hljs language-${language}">${highlighted}</code></pre>`
  },
  extensions: [calloutExtension()],
})

/** 把 markdown 源渲染为净化后的 HTML 字符串 */
export function renderMarkdown(source) {
  if (!source) return ''
  const rawHtml = marked.parse(source)
  return DOMPurify.sanitize(rawHtml, {
    ADD_ATTR: ['target'],
  })
}
