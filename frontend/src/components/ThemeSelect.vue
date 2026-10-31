<script setup>
/**
 * 主题化自定义下拉选择（替代原生 <select>，样式取自「数字生命」模型选择）。
 *
 * 用法：
 *   <ThemeSelect v-model="form.status" :options="[{ value: 'all', label: '全部' }]" />
 *   - options: [{ value, label, desc?, searchText? }]，desc 为第二行灰色说明文字（可选），
 *     searchText 为搜索匹配字段（可选，缺省用 label）
 *   - 分组头项：{ header: '分组名' }，渲染为不可点击的分组标题（组间带分隔线），
 *     后续同 value 的选项与普通项等价（如「最近使用 + 全部分类」双组结构）
 *   - 数值型 value 会原样传出（原生 select 会转字符串，这里不会）
 *   - disabled 时触发器置灰且不可展开
 *   - searchable 时面板顶部出现搜索框：按 searchText（缺省 label）includes 过滤，
 *     分组头仅在其后仍有命中项时保留，命中项按 value 去重，无结果显示「无匹配项」
 */
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'

const props = defineProps({
  modelValue: { type: [String, Number], default: '' },
  options: { type: Array, default: () => [] },
  placeholder: { type: String, default: '请选择' },
  disabled: { type: Boolean, default: false },
  ariaLabel: { type: String, default: '选择' },
  /** 面板对齐：left = 左对齐触发器；right = 右对齐（工具栏右侧筛选常用） */
  align: { type: String, default: 'left' },
  /** 是否显示面板搜索框 */
  searchable: { type: Boolean, default: false },
  searchPlaceholder: { type: String, default: '搜索…' },
})

const emit = defineEmits(['update:modelValue'])

const open = ref(false)
const rootEl = ref(null)
const query = ref('')
const searchEl = ref(null)

/* 搜索过滤：命中 searchText（缺省 label）的选项保留；分组头仅在其后仍有命中项时保留；同 value 去重 */
const filteredOptions = computed(() => {
  const opts = props.options
  const q = props.searchable ? query.value.trim().toLowerCase() : ''
  if (!q) return opts
  const isMatch = (o) => String(o.searchText ?? o.label).toLowerCase().includes(q)
  const result = []
  const seen = new Set()
  let pendingHeader = null
  for (const o of opts) {
    if (o.header) { pendingHeader = o; continue }
    if (seen.has(o.value)) continue
    if (!isMatch(o)) continue
    seen.add(o.value)
    if (pendingHeader) { result.push(pendingHeader); pendingHeader = null }
    result.push(o)
  }
  return result
})

watch(open, (v) => {
  if (!v) { query.value = ''; return }
  if (props.searchable) nextTick(() => searchEl.value?.focus())
})

const selected = computed(() => props.options.find((o) => o.value === props.modelValue) || null)
const displayText = computed(() => (selected.value ? selected.value.label : props.placeholder))

function toggle() {
  if (props.disabled) return
  open.value = !open.value
}

function pick(opt) {
  if (props.disabled || opt.disabled) return
  open.value = false
  emit('update:modelValue', opt.value)
}

function onDocClick(e) {
  if (open.value && rootEl.value && !rootEl.value.contains(e.target)) open.value = false
}

onMounted(() => document.addEventListener('click', onDocClick))
onBeforeUnmount(() => document.removeEventListener('click', onDocClick))
</script>

<template>
  <div ref="rootEl" class="tsel" :class="{ open, disabled }">
    <button
      type="button"
      class="tsel__trigger"
      :aria-label="ariaLabel"
      aria-haspopup="listbox"
      :aria-expanded="open"
      :disabled="disabled"
      @click="toggle"
    >
      <span class="tsel__label">{{ displayText }}</span>
      <span class="tsel__caret">
        <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
      </span>
    </button>

    <transition name="tsel-pop">
      <div v-if="open" class="tsel__panel" :class="`tsel__panel--${align}`">
        <div v-if="searchable" class="tsel__search">
          <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="7"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
          <input ref="searchEl" v-model="query" type="text" class="tsel__search-input" :placeholder="searchPlaceholder" aria-label="搜索选项" />
        </div>
        <ul class="tsel__menu" role="listbox" :aria-label="ariaLabel">
          <template v-for="(opt, index) in filteredOptions" :key="index">
            <li v-if="opt.header" class="tsel__group" role="presentation">{{ opt.header }}</li>
            <li v-else>
              <button
                type="button"
                class="tsel__item"
                role="option"
                :aria-selected="modelValue === opt.value"
                :class="{ active: modelValue === opt.value, 'is-disabled': opt.disabled }"
                :disabled="opt.disabled"
                @click="pick(opt)"
              >
                <span class="tsel__item-main">
                  <span class="tsel__item-name">{{ opt.label }}</span>
                  <span v-if="opt.desc" class="tsel__item-desc">{{ opt.desc }}</span>
                </span>
                <svg v-if="modelValue === opt.value" class="tsel__item-check" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
              </button>
            </li>
          </template>
          <li v-if="!filteredOptions.length" class="tsel__empty">无匹配项</li>
        </ul>
      </div>
    </transition>
  </div>
</template>

<style scoped>
.tsel {
  position: relative;
  display: inline-flex;
}
.tsel__trigger {
  display: inline-flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  min-width: 100%;
  padding: 8px 12px;
  border-radius: 10px;
  background-color: var(--bg-card);
  border: 1px solid var(--border);
  color: var(--text-secondary);
  font-family: var(--font-sans);
  font-size: 13px;
  cursor: pointer;
  transition: all var(--transition);
  white-space: nowrap;
}
.tsel__trigger:hover:not(:disabled) {
  border-color: color-mix(in srgb, var(--accent) 45%, var(--border));
  color: var(--text-primary);
}
.tsel.open .tsel__trigger {
  border-color: var(--accent);
  background-color: var(--accent-light);
  color: var(--accent);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--accent) 15%, transparent);
}
.tsel__trigger:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.tsel__label {
  overflow: hidden;
  text-overflow: ellipsis;
  font-weight: 500;
}
.tsel__caret {
  display: inline-flex;
  flex-shrink: 0;
  color: var(--text-tertiary);
  transition: transform var(--transition);
}
.tsel.open .tsel__caret {
  transform: rotate(180deg);
  color: var(--accent);
}

/* ===== 面板 ===== */
.tsel__panel {
  position: absolute;
  top: calc(100% + 8px);
  left: 0;
  z-index: 60;
  min-width: calc(100% + 24px);
  max-width: min(320px, calc(100vw - 48px));
  max-height: 280px;
  overflow-y: auto;
  padding: 6px;
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: 14px;
  box-shadow: var(--shadow-lg);
}
.tsel__panel--right {
  left: auto;
  right: 0;
}
.tsel__menu {
  margin: 0;
  padding: 0;
  list-style: none;
}
.tsel__search {
  position: sticky;
  top: -6px;
  z-index: 1;
  display: flex;
  align-items: center;
  gap: 8px;
  margin: -6px -6px 4px;
  padding: 8px 10px;
  color: var(--text-tertiary);
  background: var(--bg-card);
  border-bottom: 1px solid var(--border);
  border-radius: 14px 14px 0 0;
}
.tsel__search-input {
  width: 100%;
  border: none;
  background: transparent;
  color: var(--text-primary);
  font-family: var(--font-sans);
  font-size: 13px;
  outline: none;
}
.tsel__search-input::placeholder {
  color: var(--text-tertiary);
}
.tsel__empty {
  padding: 10px 12px;
  font-size: 12.5px;
  color: var(--text-tertiary);
  text-align: center;
  user-select: none;
}
.tsel__group {
  padding: 8px 12px 4px;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.08em;
  color: var(--text-tertiary);
  user-select: none;
  pointer-events: none;
}
.tsel__group:not(:first-child) {
  margin-top: 6px;
  border-top: 1px solid var(--border);
}
.tsel__item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  width: 100%;
  padding: 9px 12px;
  border: none;
  border-radius: 9px;
  background: transparent;
  color: var(--text-secondary);
  font-family: var(--font-sans);
  font-size: 13px;
  text-align: left;
  cursor: pointer;
  transition: background-color var(--transition), color var(--transition);
}
.tsel__item:hover {
  background-color: color-mix(in srgb, var(--accent-light) 55%, transparent);
  color: var(--text-primary);
}
.tsel__item.active {
  color: var(--accent);
  background-color: var(--accent-light);
}
.tsel__item-main {
  display: flex;
  flex-direction: column;
  gap: 3px;
  min-width: 0;
}
.tsel__item-name {
  font-size: 13px;
  font-weight: 600;
  letter-spacing: 0.01em;
}
.tsel__item-desc {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 11.5px;
  color: var(--text-tertiary);
}
.tsel__item.active .tsel__item-desc {
  color: color-mix(in srgb, var(--accent) 75%, var(--text-tertiary));
}
.tsel__item-check {
  flex-shrink: 0;
  width: 15px;
  height: 15px;
  color: var(--accent);
}
.tsel__item.is-disabled {
  opacity: 0.45;
  cursor: not-allowed;
}
.tsel__item.is-disabled:hover {
  background: transparent;
  color: var(--text-tertiary);
}

/* ===== 展开动画 ===== */
.tsel-pop-enter-active,
.tsel-pop-leave-active { transition: opacity 0.18s ease, transform 0.18s ease; }
.tsel-pop-enter-from,
.tsel-pop-leave-to {
  opacity: 0;
  transform: translateY(-6px) scale(0.98);
}
</style>
