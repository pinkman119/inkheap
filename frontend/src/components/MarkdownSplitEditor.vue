<script setup>
/**
 * Markdown 分栏编辑器：左边编辑源码，右边实时预览渲染结果。
 *
 * - 预览复用 utils/markdown.js 的 renderMarkdown（与前台详情页同一渲染管线：
 *   callout 提示框、代码高亮、语雀图片兼容、外链图片代理）
 * - 输入做了 200ms 防抖，避免每个按键都触发 marked 编译
 * - 预览区支持代码块「复制」按钮与 mermaid 文本绘图的实时渲染
 * - 排版样式与非 scoped 块声明（v-html 内容拿不到 scoped 属性）
 */
import { ref, computed, watch, nextTick, onBeforeUnmount } from 'vue'
import { renderMarkdown } from '@/utils/markdown'
import { renderDiagrams } from '@/utils/diagram'

const props = defineProps({
  modelValue: { type: String, default: '' },
  placeholder: { type: String, default: '' },
  /** 编辑/预览两栏的最小高度 */
  minHeight: { type: String, default: '420px' },
})

const emit = defineEmits(['update:modelValue'])

const previewEl = ref(null)

/* ===== 输入防抖：200ms 后才更新预览源 ===== */
const debouncedSource = ref(props.modelValue)
let debounceTimer = null
watch(
  () => props.modelValue,
  (v) => {
    clearTimeout(debounceTimer)
    debounceTimer = setTimeout(() => {
      debouncedSource.value = v
    }, 200)
  }
)
onBeforeUnmount(() => clearTimeout(debounceTimer))

const previewHtml = computed(() => renderMarkdown(debouncedSource.value))

/* v-html 写入后，把 .md-diagram 占位节点编译成 mermaid SVG */
watch(previewHtml, () => {
  nextTick(() => {
    if (previewEl.value) renderDiagrams(previewEl.value)
  })
})

function onInput(e) {
  emit('update:modelValue', e.target.value)
}

/* 预览区内代码块「复制」按钮：事件委托，v-html 内容无法直接绑事件 */
async function onPreviewClick(e) {
  const btn = e.target.closest('.code-copy')
  if (!btn) return
  const code = btn.closest('.code-block-wrap')?.querySelector('pre code')
  if (!code) return
  try {
    await navigator.clipboard.writeText(code.textContent || '')
  } catch (err) { /* 剪贴板不可用时静默忽略 */ }
  btn.classList.add('copied')
  btn.textContent = '已复制'
  setTimeout(() => {
    btn.classList.remove('copied')
    btn.textContent = '复制'
  }, 1500)
}
</script>

<template>
  <div class="md-split-editor" :style="{ '--md-editor-min-height': minHeight }">
    <!-- 左：源码编辑 -->
    <textarea
      class="md-split-editor__input"
      :value="modelValue"
      :placeholder="placeholder"
      spellcheck="false"
      @input="onInput"
    ></textarea>
    <!-- 右：实时预览 -->
    <div class="md-split-editor__pane">
      <!-- eslint-disable-next-line vue/no-v-html —— markdown 经 DOMPurify 清洗 -->
      <div
        ref="previewEl"
        class="md-split-editor__preview"
        @click="onPreviewClick"
        v-html="previewHtml"
      ></div>
      <div v-if="!previewHtml" class="md-split-editor__empty">左侧输入内容后，这里实时预览渲染效果</div>
    </div>
  </div>
</template>

<style scoped>
/* ===== 分栏布局 ===== */
.md-split-editor {
  display: flex;
  align-items: stretch;
  min-height: var(--md-editor-min-height);
  border: 1px solid #181a1f;
  border-radius: var(--radius-md);
  overflow: hidden;
}
.md-split-editor:focus-within {
  border-color: #61afef;
  box-shadow: 0 0 0 3px rgba(97, 175, 239, 0.18);
}

/* 左：编辑区（One Dark Pro，与原 .content-editor 一致） */
.md-split-editor__input {
  flex: 1 1 50%;
  min-width: 0;
  min-height: var(--md-editor-min-height);
  padding: 14px 16px;
  font-family: var(--font-mono);
  font-size: 13px;
  line-height: 1.7;
  tab-size: 2;
  white-space: pre;
  overflow-wrap: normal;
  word-break: normal;
  color: #abb2bf;
  background-color: #282c34;
  border: none;
  outline: none;
  resize: none;
  caret-color: #61afef;
}
.md-split-editor__input::placeholder { color: #5c6370; opacity: 1; }
.md-split-editor__input::selection {
  background-color: rgba(97, 175, 239, 0.32);
  color: #ffffff;
}
.md-split-editor__input::-webkit-scrollbar { width: 10px; height: 10px; }
.md-split-editor__input::-webkit-scrollbar-track { background: transparent; }
.md-split-editor__input::-webkit-scrollbar-thumb {
  background: #3a3f4b;
  border-radius: 100px;
  border: 2px solid #282c34;
}
.md-split-editor__input::-webkit-scrollbar-thumb:hover { background: #4b5263; }
.md-split-editor__input {
  scrollbar-color: #3a3f4b #282c34;
  scrollbar-width: thin;
}

/* 右：预览区 */
.md-split-editor__pane {
  position: relative;
  flex: 1 1 50%;
  min-width: 0;
  display: flex;
}
.md-split-editor__preview {
  flex: 1 1 auto;
  min-width: 0;
  min-height: var(--md-editor-min-height);
  max-height: 720px;
  overflow-y: auto;
  padding: 16px 18px;
  background: var(--bg-card);
  font-size: 15px;
  color: var(--text-primary);
}
.md-split-editor__preview::-webkit-scrollbar { width: 8px; }
.md-split-editor__preview::-webkit-scrollbar-thumb {
  background: color-mix(in srgb, var(--text-tertiary) 35%, transparent);
  border-radius: 4px;
}

/* 空内容占位 */
.md-split-editor__empty {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  font-size: 13px;
  color: var(--text-tertiary);
  font-family: var(--font-mono);
  text-align: center;
  pointer-events: none;
}

/* ===== 响应式：窄屏上下堆叠 ===== */
@media (max-width: 860px) {
  .md-split-editor { flex-direction: column; }
  .md-split-editor__input { min-height: 260px; }
  .md-split-editor__preview { max-height: 420px; border-top: 1px solid var(--border-light); }
}
</style>

<!-- 预览排版：v-html 内容拿不到 scoped 属性，与非 scoped 块声明，
     规则对齐前台详情页 .content.markdown-body，仅前缀与字号不同 -->
<style>
.md-split-editor__preview h1,
.md-split-editor__preview h2 {
  font-family: var(--font-serif);
  font-weight: 600;
  color: var(--text-primary);
  line-height: 1.4;
  margin: 34px 0 14px;
  padding-left: 14px;
  position: relative;
}
.md-split-editor__preview h1 { font-size: 24px; }
.md-split-editor__preview h1::before,
.md-split-editor__preview h2::before {
  content: '';
  position: absolute;
  left: 0;
  top: 4px;
  bottom: 4px;
  width: 4px;
  background-color: var(--accent);
  border-radius: 2px;
}
.md-split-editor__preview h2 { font-size: 21px; }
.md-split-editor__preview h3 {
  font-family: var(--font-serif);
  font-size: 17.5px;
  font-weight: 600;
  color: var(--text-primary);
  line-height: 1.4;
  margin: 26px 0 12px;
}
.md-split-editor__preview h4 {
  font-family: var(--font-sans);
  font-size: 15px;
  font-weight: 600;
  color: var(--text-primary);
  margin: 22px 0 10px;
}
.md-split-editor__preview p { margin: 0 0 18px; color: var(--text-primary); }
.md-split-editor__preview a {
  color: var(--accent);
  text-decoration: none;
  border-bottom: 1px solid var(--accent-light);
  transition: all var(--transition);
}
.md-split-editor__preview a:hover { color: var(--accent-hover); border-bottom-color: var(--accent-hover); }
.md-split-editor__preview ul,
.md-split-editor__preview ol { margin: 0 0 18px; padding-left: 22px; }
.md-split-editor__preview li { margin-bottom: 8px; }
.md-split-editor__preview strong { font-weight: 600; color: var(--text-primary); }
.md-split-editor__preview blockquote {
  margin: 22px 0;
  padding: 14px 18px;
  border-left: 3px solid var(--accent);
  background-color: var(--accent-light);
  border-radius: 0 var(--radius-sm) var(--radius-sm) 0;
  color: var(--text-secondary);
}
.md-split-editor__preview blockquote p:last-child { margin-bottom: 0; }
.md-split-editor__preview code {
  font-family: var(--font-mono);
  font-size: 0.88em;
  background-color: var(--accent-light);
  color: var(--accent-hover);
  padding: 2px 6px;
  border-radius: 4px;
}

/* ===== 代码块（与详情页黑灰-绿主题一致） ===== */
.md-split-editor__preview .code-block-wrap {
  margin: 0 0 22px;
  border: 1px solid #101211;
  border-radius: var(--radius-md);
  overflow: hidden;
  background-color: #1b1e1c;
}
.md-split-editor__preview .code-block-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 14px;
  background-color: #151816;
  border-bottom: 1px solid #101211;
}
.md-split-editor__preview .code-lang {
  font-family: var(--font-mono);
  font-size: 11px;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: #7f8a84;
}
.md-split-editor__preview .code-copy {
  font-family: var(--font-mono);
  font-size: 11px;
  line-height: 1;
  color: #a8b3ad;
  background: transparent;
  border: 1px solid #333834;
  border-radius: 6px;
  padding: 4px 10px;
  cursor: pointer;
  transition: all 0.15s ease;
}
.md-split-editor__preview .code-copy:hover { color: #ffffff; border-color: #5fc59a; }
.md-split-editor__preview .code-copy.copied { color: #5fc59a; border-color: #5fc59a; }
.md-split-editor__preview .code-block {
  background-color: #1b1e1c;
  color: #c6cfc9;
  border-radius: 0;
  border: none;
  padding: 16px 18px;
  overflow-x: auto;
  margin: 0;
  font-family: var(--font-mono);
  font-size: 12.5px;
  line-height: 1.75;
}
.md-split-editor__preview .code-block code.hljs {
  display: block;
  background: transparent;
  padding: 0;
  font-family: inherit;
  font-size: inherit;
  line-height: inherit;
  color: inherit;
}

/* highlight.js token 配色（黑灰-绿） */
.md-split-editor__preview .hljs-comment,
.md-split-editor__preview .hljs-quote { color: #6f7a74; font-style: italic; }
.md-split-editor__preview .hljs-keyword,
.md-split-editor__preview .hljs-selector-tag,
.md-split-editor__preview .hljs-literal,
.md-split-editor__preview .hljs-section,
.md-split-editor__preview .hljs-doctag { color: #5fc59a; }
.md-split-editor__preview .hljs-string,
.md-split-editor__preview .hljs-template-tag,
.md-split-editor__preview .hljs-addition,
.md-split-editor__preview .hljs-regexp { color: #9ad8b8; }
.md-split-editor__preview .hljs-attr,
.md-split-editor__preview .hljs-attribute { color: #b8c7bf; }
.md-split-editor__preview .hljs-number,
.md-split-editor__preview .hljs-type,
.md-split-editor__preview .hljs-built_in,
.md-split-editor__preview .hljs-class .hljs-title,
.md-split-editor__preview .hljs-symbol,
.md-split-editor__preview .hljs-meta { color: #6cbf9f; }
.md-split-editor__preview .hljs-variable,
.md-split-editor__preview .hljs-property,
.md-split-editor__preview .hljs-params,
.md-split-editor__preview .hljs-tag { color: #dfe6e2; }
.md-split-editor__preview .hljs-title,
.md-split-editor__preview .hljs-function .hljs-title,
.md-split-editor__preview .hljs-name { color: #ffffff; }
.md-split-editor__preview .hljs-meta .hljs-keyword { color: #46a58a; }
.md-split-editor__preview .hljs-deletion { color: #c98a7d; }
.md-split-editor__preview .hljs-link { color: #5fc59a; text-decoration: underline; }
.md-split-editor__preview .hljs-emphasis { font-style: italic; }
.md-split-editor__preview .hljs-strong { font-weight: 600; color: #ffffff; }

/* ===== :::callout 提示框 ===== */
.md-split-editor__preview .callout {
  display: flex;
  gap: 12px;
  margin: 22px 0;
  padding: 14px 16px;
  background-color: var(--bg-sidebar);
  border: 1px solid var(--border-light);
  border-left: 3px solid var(--accent);
  border-radius: var(--radius-sm);
}
.md-split-editor__preview .callout .c-title {
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 4px;
}
.md-split-editor__preview .callout p {
  font-size: 14px;
  color: var(--text-secondary);
  margin: 0;
}
.md-split-editor__preview .md-callout[data-type='warning'] { border-left-color: #c39a4e; }
.md-split-editor__preview .md-callout[data-type='info'] { border-left-color: #4a9d8e; }

/* ===== 图片 / 表格 / 分隔线 ===== */
.md-split-editor__preview figure { margin: 24px 0; }
.md-split-editor__preview figure .fig-img {
  width: 100%;
  aspect-ratio: 16/9;
  border-radius: var(--radius-md);
  overflow: hidden;
  background: linear-gradient(135deg, #4fae86, #2d8264 70%);
}
.md-split-editor__preview figcaption {
  font-size: 12.5px;
  color: var(--text-tertiary);
  text-align: center;
  margin-top: 8px;
}
.md-split-editor__preview img {
  max-width: 100%;
  height: auto;
  border-radius: var(--radius-md);
  margin: 8px 0 20px;
  display: block;
}
.md-split-editor__preview table {
  width: 100%;
  border-collapse: collapse;
  margin: 0 0 22px;
  font-size: 13.5px;
  overflow: hidden;
  border-radius: var(--radius-sm);
}
.md-split-editor__preview th,
.md-split-editor__preview td {
  border: 1px solid var(--border-light);
  padding: 8px 12px;
  text-align: left;
}
.md-split-editor__preview th {
  background-color: var(--bg-sidebar);
  font-weight: 600;
  color: var(--text-primary);
}
.md-split-editor__preview tr:nth-child(even) td { background-color: var(--bg-card); }
.md-split-editor__preview hr {
  border: none;
  border-top: 1px solid var(--border-light);
  margin: 30px 0;
}
</style>
