/**
 * 文本绘图（Mermaid）运行时渲染。
 *
 * utils/markdown.js 会把正文里的绘图源码标记成：
 *   <div class="md-diagram" data-diagram="mermaid"><pre class="md-diagram-src">源码</pre></div>
 * 本模块在 v-html 挂载到 DOM 之后，把这些占位节点编译成 SVG。
 *
 * 设计要点：
 * - mermaid 体积较大（约 1MB），用动态 import 按需加载：正文没有绘图时完全不加载
 * - securityLevel: 'strict'：正文可能来自用户投稿，禁用 HTML 标签与点击回调
 * - 主题跟随全站 data-theme，切换深浅色时会重绘
 */
let mermaidPromise = null
let uid = 0

/** 节点 -> 原始绘图源码（渲染后 <pre> 会被 SVG 替换，缓存用于主题切换时重绘） */
const sourceCache = new WeakMap()

const FONT_STACK = "'Noto Sans SC', 'PingFang SC', 'Microsoft YaHei', sans-serif"

function isDarkTheme() {
  return (
    typeof document !== 'undefined' && document.documentElement.getAttribute('data-theme') === 'dark'
  )
}

function buildConfig() {
  const dark = isDarkTheme()
  return {
    startOnLoad: false,
    // 内容可能来自用户投稿：禁用 HTML 标签、点击回调与同源外链
    securityLevel: 'strict',
    // 宽图不压缩，改为容器内横向滚动 + 「放大」查看，避免文字缩到不可读
    useMaxWidth: false,
    fontFamily: FONT_STACK,
    theme: dark ? 'dark' : 'base',
    themeVariables: {
      fontFamily: FONT_STACK,
      fontSize: '15px',
      lineColor: dark ? '#5fc59a' : '#2d8264',
      primaryBorderColor: dark ? '#3d6b56' : '#8fc7ad',
      primaryColor: dark ? '#182b23' : '#eef6f1',
      primaryTextColor: dark ? '#f5f5f5' : '#1a1a1a',
      secondaryColor: dark ? '#133028' : '#e9f4ef',
      tertiaryColor: dark ? '#1d201e' : '#f7f9f7',
    },
  }
}

function loadMermaid() {
  if (!mermaidPromise) {
    mermaidPromise = import('mermaid').then((mod) => {
      const mermaid = mod.default || mod
      mermaid.initialize(buildConfig())
      return mermaid
    })
  }
  return mermaidPromise
}

function getSource(node) {
  let source = sourceCache.get(node)
  if (source == null) {
    const pre = node.querySelector('.md-diagram-src')
    source = (pre?.textContent || '').trim()
    sourceCache.set(node, source)
  }
  return source
}

function createToolbar(node) {
  const toolbar = document.createElement('div')
  toolbar.className = 'md-diagram__toolbar'

  const copyBtn = document.createElement('button')
  copyBtn.type = 'button'
  copyBtn.className = 'md-diagram__btn'
  copyBtn.dataset.act = 'copy'
  copyBtn.textContent = '复制源码'

  const zoomBtn = document.createElement('button')
  zoomBtn.type = 'button'
  zoomBtn.className = 'md-diagram__btn'
  zoomBtn.dataset.act = 'zoom'
  zoomBtn.textContent = '放大'

  toolbar.append(copyBtn, zoomBtn)
  toolbar.addEventListener('click', (e) => {
    const act = e.target.closest('[data-act]')?.dataset.act
    if (act === 'copy') copySource(copyBtn, getSource(node))
    else if (act === 'zoom') openZoom(node.querySelector('.md-diagram__canvas'))
  })
  return toolbar
}

function copySource(btn, text) {
  const done = () => {
    const old = btn.textContent
    btn.textContent = '已复制'
    setTimeout(() => {
      btn.textContent = old
    }, 1500)
  }
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text).then(done).catch(fallbackCopy)
  } else {
    fallbackCopy()
  }
  function fallbackCopy() {
    const ta = document.createElement('textarea')
    ta.value = text
    ta.style.position = 'fixed'
    ta.style.opacity = '0'
    document.body.appendChild(ta)
    ta.select()
    try {
      document.execCommand('copy')
      done()
    } catch (_) {
      /* 忽略：不支持剪贴板时静默失败 */
    }
    document.body.removeChild(ta)
  }
}

function openZoom(canvas) {
  if (!canvas) return
  const overlay = document.createElement('div')
  overlay.className = 'md-diagram-overlay'
  overlay.setAttribute('role', 'dialog')
  overlay.setAttribute('aria-label', '放大查看绘图')

  const inner = document.createElement('div')
  inner.className = 'md-diagram-overlay__inner'
  const clone = canvas.cloneNode(true)
  inner.appendChild(clone)
  overlay.appendChild(inner)
  document.body.appendChild(overlay)

  const close = () => {
    overlay.remove()
    document.removeEventListener('keydown', onKey)
  }
  function onKey(e) {
    if (e.key === 'Escape') close()
  }
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay || e.target === inner) close()
  })
  document.addEventListener('keydown', onKey)
}

function paint(node, svg, themeKey) {
  node.textContent = ''
  const canvas = document.createElement('div')
  canvas.className = 'md-diagram__canvas'
  // mermaid 在 strict 安全等级下会自行消毒输出，这里可以直接写入
  canvas.innerHTML = svg
  node.appendChild(createToolbar(node))
  node.appendChild(canvas)
  node.dataset.state = 'ok'
  node.dataset.theme = themeKey
}

function markFailure(node, message) {
  const source = getSource(node)
  node.textContent = ''
  const tip = document.createElement('div')
  tip.className = 'md-diagram__error'
  tip.textContent = `绘图渲染失败：${message}`
  const pre = document.createElement('pre')
  pre.className = 'md-diagram-src md-diagram-src--fallback'
  pre.textContent = source
  node.append(tip, pre)
  node.dataset.state = 'error'
}

function errorText(err) {
  const raw = (err && (err.str || err.message)) || String(err || '未知错误')
  return raw.replace(/\s+/g, ' ').slice(0, 160)
}

/**
 * 渲染容器内的所有文本绘图。
 * @param {HTMLElement|null} root 正文容器（.markdown-body / .d-prose 等的祖先）
 * @param {{ force?: boolean }} options force=true 时忽略缓存强制重绘（主题切换）
 */
export async function renderDiagrams(root, options = {}) {
  if (!root || typeof window === 'undefined') return
  const nodes = Array.from(root.querySelectorAll('.md-diagram[data-diagram="mermaid"]'))
  if (!nodes.length) return

  let mermaid
  try {
    mermaid = await loadMermaid()
  } catch (err) {
    nodes.forEach((n) => markFailure(n, '绘图引擎加载失败'))
    console.error('[mermaid] 加载失败', err)
    return
  }

  const themeKey = isDarkTheme() ? 'dark' : 'light'
  mermaid.initialize(buildConfig())

  for (const node of nodes) {
    if (!options.force && node.dataset.state === 'ok' && node.dataset.theme === themeKey) continue
    const source = getSource(node)
    if (!source) {
      markFailure(node, '绘图源码为空')
      continue
    }
    const id = `md-diagram-${++uid}-${Math.random().toString(36).slice(2, 8)}`
    try {
      const { svg } = await mermaid.render(id, source)
      paint(node, svg, themeKey)
    } catch (err) {
      markFailure(node, errorText(err))
      console.warn('[mermaid] 绘图解析失败', err)
    }
  }
}
