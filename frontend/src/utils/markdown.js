/**
 * Markdown 渲染工具：集中配置 marked + highlight.js + DOMPurify。
 *
 * - marked：把 markdown 字符串编译成 HTML
 * - highlight.js：代码块语法高亮（自动识别语言，如 yaml / bash / js）
 * - DOMPurify：净化输出 HTML，防止未来接入后端 / 用户内容带来的 XSS
 * - mermaid：文本绘图（时序图 / 流程图等），由 utils/diagram.js 在 DOM 挂载后异步渲染
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

/**
 * 文本绘图占位节点。源码放进 <pre> 文本节点（会被转义，不会破坏 HTML 结构），
 * 渲染成 DOM 后由 utils/diagram.js 调用 mermaid 编译成 SVG。
 */
function escapeHtml(text) {
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function diagramHtml(source) {
  return (
    `<div class="md-diagram" data-diagram="mermaid">` +
    `<pre class="md-diagram-src">${escapeHtml(String(source || '').trim())}</pre>` +
    `</div>\n`
  )
}

/**
 * 定位绘图注释的结束符。
 *
 * 不能直接用 /([\s\S]*?)-->/ 收尾：mermaid 的箭头语法 -->>、--> 本身就含 "-->"，
 * 会把源码拦腰截断。真正的注释结束符后面只可能跟「空白 + 换行/结尾」，
 * 而箭头后面必然紧跟参与者名，据此区分。
 */
function matchDiagramComment(src) {
  const head = /^<!--\s*[^>]*?(?:绘图|图表)[^>]*?源码为\s*[：:]\s*/.exec(src)
  if (!head) return null

  const rest = src.slice(head[0].length)
  const terminator = /-->\s*(?:\n|$)/g
  let hit = terminator.exec(rest)
  while (hit) {
    const text = rest.slice(0, hit.index)
    // 防止该注释没有合法结束符时，一路吞掉后续正文里的注释
    if (!text.includes('<!--')) {
      return { raw: src.slice(0, head[0].length + hit.index + hit[0].length), text }
    }
    hit = terminator.exec(rest)
  }
  return null
}

/**
 * 文本绘图扩展（语雀导出风格）：识别
 *   <!-- 这是一个文本绘图，源码为：sequenceDiagram
 *        U->>E: 点击上传
 *   -->
 * 编译为 <div class="md-diagram" ...>，由 utils/diagram.js 在 DOM 挂载后异步渲染。
 * 必须在 marked 的 html 块规则之前拦截，否则会退化成一条被 DOMPurify 丢掉的注释。
 */
function diagramExtension() {
  return {
    name: 'diagram',
    level: 'block',
    start(src) {
      return src.indexOf('<!--')
    },
    tokenizer(src) {
      const match = matchDiagramComment(src)
      if (!match || !match.text.trim()) return false
      return { type: 'diagram', raw: match.raw, text: match.text }
    },
    renderer(token) {
      return diagramHtml(token.text)
    },
  }
}

// v18: heading IDs 需通过 marked-gfm-heading-id 扩展生成
marked.use(gfmHeadingId())

marked.use({
  gfm: true,
  breaks: false,
  extensions: [calloutExtension(), diagramExtension()],
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
      // ```mermaid 标准写法：交给绘图渲染，而不是当普通代码高亮
      if (String(lang || '').trim().split(/\s+/)[0].toLowerCase() === 'mermaid') {
        return diagramHtml(text)
      }
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

/**
 * 语雀（Yuque）导出图片语法兼容预处理。
 *
 * 语雀新版导出会在图片前插入 OCR 占位注释，且常与图片紧贴同一行：
 *   <!-- 这是一张图片，ocr 内容为：... -->![](https://cdn.nlark.com/...)
 * marked 的 GFM 解析器会把整行当作 HTML 注释块，导致后面的 `![](url)`
 * 被吞掉、图片无法渲染。这里把“注释 + 图片”拆为独立成段的图片语法，
 * 丢弃无用的 OCR 注释，确保 marked 能正确渲染出 <img>。
 */
function normalizeYuqueImages(src) {
  return src
    // 注释与图片同行紧贴：<!-- ... -->![](url)
    .replace(
      /<!--\s*这是一张图片[^>]*-->\s*!\[([^\]]*)\]\(([^)\s]+)\)/g,
      '\n\n![$1]($2)\n\n'
    )
    // 注释独占一行、图片在其后（可能隔行）：<!-- ... -->\n... !(url)
    .replace(
      /<!--\s*这是一张图片[^>]*-->\s*\n+(\s*!\[[^\]]*\]\([^)\s]+\))/g,
      '\n\n$1\n\n'
    )
}

/**
 * 外链图片代理：语雀/第三方图床的图片直接 <img src> 引用时，部分 CDN 在
 * 浏览器侧会被 ORB（Opaque Response Blocking）或防盗链拦截，导致图片不显示。
 * 这里把所有非同源的外链图片改写为本站代理地址（/api/proxy/image?url=），
 * 由后端拉取并以正确的 image/* 响应转发，从而可靠显示。
 */
function isSameOrigin(url) {
  try {
    const u = new URL(url, window.location.origin)
    return u.origin === window.location.origin
  } catch {
    return false
  }
}

function shouldProxy(url) {
  if (!url) return false
  // 仅处理 http(s) 绝对地址中的外链；本站相对/绝对资源直连
  if (!/^https?:\/\//i.test(url)) return false
  return !isSameOrigin(url)
}

// 与 useApi 的 ASSET_BASE 保持一致：开发环境前端(5173)与后端(3000)不同源，
// 需补全为绝对地址；生产环境同域时用当前 origin 即可。
const ASSET_BASE =
  typeof window !== 'undefined' && window.location.port === '5173'
    ? 'http://localhost:3000'
    : typeof window !== 'undefined'
    ? window.location.origin
    : ''

// 注册一次（DOMPurify 为单例），渲染时对 img 的 src 做代理改写
DOMPurify.addHook('afterSanitizeAttributes', (node) => {
  if (node.tagName === 'IMG') {
    const src = node.getAttribute('src')
    if (src && shouldProxy(src)) {
      node.setAttribute('src', `${ASSET_BASE}/api/proxy/image?url=${encodeURIComponent(src)}`)
    }
  }
})

/**
 * 把 markdown 源渲染为净化后的 HTML 字符串。
 * @param {string} source markdown 源码
 * @param {object} [options] 透传给 marked.parse 的选项。对话场景可传 { breaks: true }，
 *   把单个换行也渲染成 <br>，避免 AI 的分行被合并成一整段。
 */
export function renderMarkdown(source, options = {}) {
  if (!source) return ''
  const normalized = normalizeYuqueImages(source)
  const rawHtml = marked.parse(normalized, options)
  return DOMPurify.sanitize(rawHtml, {
    ADD_ATTR: ['target'],
  })
}
