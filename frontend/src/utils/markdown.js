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
  extensions: [calloutExtension()],
})

// marked v5+ 已移除 highlight 选项，这里通过 renderer.code 手动接入 highlight.js，
// 生成 .code-block 容器与 hljs 高亮 token，以匹配详情页原型样式。
// 注意：marked v18 的 code renderer 接收的是 token 对象（fn.length 需 ≥ 1），
// 不要使用解构参数写法（function ({ text, lang }) 在 v18 下不生效）。
marked.use({
  renderer: {
    code(token) {
      const text = token.text
      const lang = token.lang
      const language = lang && hljs.getLanguage(lang) ? lang : ''
      const highlighted = language
        ? hljs.highlight(text, { language }).value
        : hljs.highlightAuto(text).value
      const langClass = language ? ` lang-${language}` : ''
      const langLabel = language || 'text'
      return (
        `<div class="code-block-wrap${langClass}">` +
        `<div class="code-block-header">` +
        `<span class="code-lang">${langLabel}</span>` +
        `<button type="button" class="code-copy" aria-label="复制代码">复制</button>` +
        `</div>` +
        `<pre class="code-block"><code class="hljs ${language}">${highlighted}</code></pre>` +
        `</div>\n`
      )
    },
  },
})

/** 把 markdown 源渲染为净化后的 HTML 字符串 */
export function renderMarkdown(source) {
  if (!source) return ''
  const rawHtml = marked.parse(source)
  return DOMPurify.sanitize(rawHtml, {
    ADD_ATTR: ['target'],
  })
}
