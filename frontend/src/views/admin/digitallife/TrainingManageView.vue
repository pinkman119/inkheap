<script setup>
import { computed, onMounted, ref } from 'vue'
import { useApi } from '@/composables/useApi'

const api = useApi()

// 数据源 tab（关于我拆成 4 个子类型，由 tab 内再分组展示）
const TABS = [
  { key: 'article', label: '文章（知识库）', types: ['article'] },
  { key: 'blog', label: '小记', types: ['blog'] },
  { key: 'resume', label: '简历', types: ['resume'] },
  {
    key: 'about',
    label: '关于我',
    types: ['about_profile', 'about_footprint', 'about_travel', 'about_event'],
  },
]
const TYPE_LABELS = {
  article: '文章',
  blog: '小记',
  resume: '简历',
  about_profile: '个人简介',
  about_footprint: '足迹',
  about_travel: '旅行',
  about_event: '事件',
}

const activeTab = ref('article')
const loading = ref(false)
const list = ref([])
const total = ref(0)
const page = ref(1)
const pageSize = 20
const trainTypeFilter = ref('') // '' 全部 / '0' / '1' / '2'

// ===== 嵌入模型选择（训练使用；持久化到 localStorage） =====
const embeddingModels = ref([])
const selectedEmbeddingModel = ref('')
const EMBEDDING_STORAGE_KEY = 'dl_training_embedding_model'

const embeddingOptions = computed(() => {
  const items = embeddingModels.value.map((m) => ({
    value: m.id,
    label: m.name + (m.hasApiKey ? '' : '（未配置 Key）'),
    hasApiKey: m.hasApiKey,
  }))
  return [{ value: '', label: '默认嵌入模型（自动选择）' }, ...items]
})

const currentEmbeddingLabel = computed(
  () => embeddingOptions.value.find((o) => o.value === selectedEmbeddingModel.value)?.label || '默认嵌入模型',
)

async function loadEmbeddingModels() {
  try {
    const data = await api.get('/admin/digital-life/models')
    embeddingModels.value = data.filter((m) => (m.modelType || 'general') === 'embedding')
    const saved = localStorage.getItem(EMBEDDING_STORAGE_KEY)
    if (saved && embeddingModels.value.some((m) => m.id === saved)) {
      selectedEmbeddingModel.value = saved
    }
  } catch (e) {
    // 加载失败不阻塞训练页
    console.warn('加载嵌入模型列表失败', e)
  }
}

function selectEmbeddingModel(id) {
  selectedEmbeddingModel.value = id
  if (id) localStorage.setItem(EMBEDDING_STORAGE_KEY, id)
  else localStorage.removeItem(EMBEDDING_STORAGE_KEY)
}

// 批量训练状态
const batchRunning = ref(false)
const batchProgress = ref({ done: 0, total: 0, ok: 0, fail: 0 })
const batchStop = ref(false)
const batchFailures = ref([])

const totalPages = computed(() => Math.max(1, Math.ceil(total.value / pageSize)))

const activeTypes = computed(() => TABS.find((t) => t.key === activeTab.value)?.types || [])

async function load() {
  loading.value = true
  try {
    // 非关于我 tab：单类型直接查；关于我 tab：5 个子类型各拉一页合并
    const types = activeTypes.value
    if (types.length === 1) {
      const data = await api.get(
        `/admin/digital-life/training/${types[0]}?page=${page.value}&pageSize=${pageSize}` +
          (trainTypeFilter.value !== '' ? `&trainType=${trainTypeFilter.value}` : ''),
      )
      list.value = data.items.map((it) => ({ ...it, _type: types[0] }))
      total.value = data.total
    } else {
      // 关于我：子类型逐个拉取（各类型数量小，一次拉全）
      const merged = []
      let totalCount = 0
      for (const t of types) {
        const data = await api.get(
          `/admin/digital-life/training/${t}?page=1&pageSize=100` +
            (trainTypeFilter.value !== '' ? `&trainType=${trainTypeFilter.value}` : ''),
        )
        totalCount += data.total
        merged.push(...data.items.map((it) => ({ ...it, _type: t })))
      }
      list.value = merged
      total.value = totalCount
    }
  } catch (e) {
    showToast('加载失败: ' + e.message, 'error')
    list.value = []
    total.value = 0
  } finally {
    loading.value = false
  }
}

function switchTab(key) {
  if (batchRunning.value) return
  activeTab.value = key
  page.value = 1
  trainTypeFilter.value = ''
  batchDone.value = false
  batchFailures.value = []
  load()
}

function switchFilter(v) {
  if (batchRunning.value) return
  trainTypeFilter.value = v
  page.value = 1
  batchDone.value = false
  batchFailures.value = []
  load()
}

function goPage(p) {
  if (p < 1 || p > totalPages.value || p === page.value) return
  page.value = p
  load()
}

/** 单条训练 / 移除训练（带当前选中的嵌入模型） */
async function trainOne(item) {
  if (item._loading) return
  item._loading = true
  item._error = ''
  try {
    await api.post(`/admin/digital-life/training/${item._type}/${item.id}/train`, {
      embeddingModelId: selectedEmbeddingModel.value || undefined,
    })
    item.trainType = 1
    showToast(`已训练：${item.title}`, 'success')
  } catch (e) {
    item._error = e.message
    showToast(`训练失败：${e.message}`, 'error')
  } finally {
    item._loading = false
  }
}

async function removeOne(item) {
  if (item._loading) return
  if (!window.confirm(`确认移除「${item.title}」的训练？移除后不再参与数字生命检索。`)) return
  item._loading = true
  item._error = ''
  try {
    await api.post(`/admin/digital-life/training/${item._type}/${item.id}/remove`)
    item.trainType = 2
    showToast(`已移除训练：${item.title}`, 'success')
  } catch (e) {
    item._error = e.message
    showToast(`移除失败：${e.message}`, 'error')
  } finally {
    item._loading = false
  }
}

/** 一键训练全部未训练：串行调用单条接口，失败跳过继续 */
async function trainAllUntrained() {
  if (batchRunning.value) return
  const untrained = list.value.filter((it) => it.trainType === 0)
  if (!untrained.length) {
    showToast('当前列表没有未训练的数据', 'error')
    return
  }
  if (!window.confirm(`将训练当前列表的 ${untrained.length} 条未训练数据（每条调用一次嵌入接口），开始？`)) return

  batchRunning.value = true
  batchStop.value = false
  batchDone.value = false
  batchFailures.value = []
  batchProgress.value = { done: 0, total: untrained.length, ok: 0, fail: 0 }

  for (const item of untrained) {
    if (batchStop.value) break
    try {
      await api.post(`/admin/digital-life/training/${item._type}/${item.id}/train`, {
        embeddingModelId: selectedEmbeddingModel.value || undefined,
      })
      item.trainType = 1
      batchProgress.value.ok += 1
    } catch (e) {
      batchProgress.value.fail += 1
      batchFailures.value.push(`${item.title}：${e.message}`)
    }
    batchProgress.value.done += 1
    item._loading = true
    await new Promise((r) => setTimeout(r, 60))
    item._loading = false
  }

  batchRunning.value = false
  batchDone.value = true
  const { ok, fail } = batchProgress.value
  if (fail > 0) {
    showToast(`批量训练完成：成功 ${ok} 条，失败 ${fail} 条`, 'error')
  } else {
    showToast(`批量训练完成：全部 ${ok} 条成功`, 'success')
  }
}

function stopBatch() {
  batchStop.value = true
}

const batchPercent = computed(() =>
  batchProgress.value.total
    ? Math.round((batchProgress.value.done / batchProgress.value.total) * 100)
    : 0,
)

/** 批量结束后保留进度展示，直到切换 tab / 筛选 */
const batchDone = ref(false)

function statusLabel(t) {
  return { 0: '未训练', 1: '已训练', 2: '已移除' }[t] ?? '未知'
}

const toastMsg = ref('')
const toastType = ref('success')
function showToast(msg, type = 'success') {
  toastMsg.value = msg
  toastType.value = type
  setTimeout(() => { toastMsg.value = '' }, 3000)
}

onMounted(() => {
  load()
  loadEmbeddingModels()
})
</script>

<template>
  <div class="training-manage">
    <transition name="toast-pop">
      <div v-if="toastMsg" class="toast" :class="toastType" role="status" aria-live="polite">
        <svg v-if="toastType === 'success'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
        <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>
        <span>{{ toastMsg }}</span>
      </div>
    </transition>

    <!-- ===== Hero ===== -->
    <section class="page-hero">
      <div class="hero-glow" aria-hidden="true"></div>
      <div class="page-hero-inner">
        <div class="hero-row">
          <div class="hero-copy">
            <span class="kicker">Digital Life · 训练</span>
            <h1>训练管理</h1>
          </div>
          <div class="hero-side">
            <button
              v-if="!batchRunning"
              class="btn btn--primary"
              :disabled="loading"
              @click="trainAllUntrained"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
              一键训练全部未训练
            </button>
            <button v-else class="btn btn--ghost" @click="stopBatch">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><rect x="6" y="6" width="12" height="12" rx="2"/></svg>
              停止
            </button>
          </div>
        </div>
        <p class="lede">将文章 / 小记 / 简历 / 关于我数据通过 RAG 嵌入向量库，供数字生命检索回答。</p>
        <p class="hero-note">当前 {{ total }} 条数据 · 数据被编辑后会自动回到未训练状态</p>
        <div class="embedding-picker">
          <label class="picker-label" for="embeddingModelSelect">嵌入模型</label>
          <div class="picker-select-wrap">
            <select
              id="embeddingModelSelect"
              class="picker-select"
              :value="selectedEmbeddingModel"
              :disabled="batchRunning"
              @change="selectEmbeddingModel($event.target.value)"
            >
              <option
                v-for="opt in embeddingOptions"
                :key="opt.value"
                :value="opt.value"
                :disabled="!opt.hasApiKey && opt.value !== ''"
              >
                {{ opt.label }}
              </option>
            </select>
            <span class="picker-caret">
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
            </span>
          </div>
          <span class="picker-hint">当前：{{ currentEmbeddingLabel }} · 在「模型管理」中维护嵌入模型</span>
        </div>
      </div>
    </section>

    <!-- ===== 批量进度 ===== -->
    <div v-if="batchRunning || batchDone" class="batch-panel">
      <div class="batch-info">
        <span class="batch-label">{{ batchDone ? '批量训练完成' : '批量训练进度' }}</span>
        <span class="batch-count">{{ batchProgress.done }} / {{ batchProgress.total }}</span>
        <span class="batch-stat ok">成功 {{ batchProgress.ok }}</span>
        <span class="batch-stat fail">失败 {{ batchProgress.fail }}</span>
        <span v-if="batchStop" class="batch-stop">（正在停止…）</span>
      </div>
      <div class="progress-track">
        <div class="progress-bar" :style="{ width: batchPercent + '%' }" />
      </div>
    </div>

    <!-- ===== Tabs ===== -->
    <div class="tabs">
      <button
        v-for="tab in TABS"
        :key="tab.key"
        class="tab"
        :class="{ active: activeTab === tab.key }"
        :disabled="batchRunning"
        @click="switchTab(tab.key)"
      >
        {{ tab.label }}
      </button>
    </div>

    <!-- ===== 状态筛选 ===== -->
    <div class="filters">
      <button
        v-for="opt in [
          { v: '', label: '全部' },
          { v: '0', label: '未训练' },
          { v: '1', label: '已训练' },
          { v: '2', label: '已移除' },
        ]"
        :key="opt.v"
        class="filter"
        :class="{ active: trainTypeFilter === opt.v }"
        :disabled="batchRunning"
        @click="switchFilter(opt.v)"
      >
        {{ opt.label }}
      </button>
    </div>

    <!-- ===== Loading ===== -->
    <div v-if="loading" class="empty">
      <span class="spinner" aria-hidden="true"></span>
      <span>加载中…</span>
    </div>

    <!-- ===== Table ===== -->
    <section v-else class="panel">
      <table class="data-table">
        <thead>
          <tr>
            <th class="col-title">标题</th>
            <th class="col-summary">摘要</th>
            <th v-if="activeTab === 'about'" class="col-type">类型</th>
            <th class="col-status">状态</th>
            <th class="col-time">更新时间</th>
            <th class="col-ops">操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="item in list" :key="item._type + item.id">
            <td class="cell-title">{{ item.title }}</td>
            <td class="cell-summary">{{ item.summary }}</td>
            <td v-if="activeTab === 'about'">
              <span class="type-tag">{{ TYPE_LABELS[item._type] }}</span>
            </td>
            <td class="cell-status">
              <span class="badge" :class="'s' + item.trainType">{{ statusLabel(item.trainType) }}</span>
            </td>
            <td class="cell-time">{{ new Date(item.updatedAt).toLocaleString('zh-CN', { hour12: false }) }}</td>
            <td class="cell-ops">
              <button
                v-if="item.trainType !== 1"
                class="link"
                :disabled="item._loading || batchRunning"
                @click="trainOne(item)"
              >
                {{ item._loading ? '训练中…' : '训练' }}
              </button>
              <button
                v-if="item.trainType === 1"
                class="link link--danger"
                :disabled="item._loading || batchRunning"
                @click="removeOne(item)"
              >
                移除训练
              </button>
            </td>
          </tr>
          <tr v-if="!list.length">
            <td :colspan="activeTab === 'about' ? 6 : 5" class="empty-row">暂无数据</td>
          </tr>
        </tbody>
      </table>
    </section>

    <!-- ===== 分页（关于我 tab 不分页） ===== -->
    <div v-if="activeTab !== 'about' && total > pageSize" class="pager">
      <button class="page-btn" :disabled="page <= 1 || batchRunning" @click="goPage(page - 1)">上一页</button>
      <span class="page-info">{{ page }} / {{ totalPages }}（共 {{ total }} 条）</span>
      <button class="page-btn" :disabled="page >= totalPages || batchRunning" @click="goPage(page + 1)">下一页</button>
    </div>

    <!-- ===== 失败清单 ===== -->
    <div v-if="batchFailures.length" class="failures">
      <div class="failures-title">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
        失败清单（{{ batchFailures.length }}）
      </div>
      <ul>
        <li v-for="(f, i) in batchFailures" :key="i">{{ f }}</li>
      </ul>
    </div>
  </div>
</template>

<style scoped>
.training-manage { position: relative; }

/* ===== Hero ===== */
.page-hero {
  position: relative;
  overflow: hidden;
  padding: 28px 28px 26px;
  border-bottom: 1px solid var(--border-light);
}
.hero-glow {
  position: absolute; top: -80px; right: -60px;
  width: 440px; height: 440px; border-radius: 50%;
  background: radial-gradient(circle, rgba(45, 130, 100, 0.14), transparent 65%);
  filter: blur(48px); pointer-events: none;
}
:global([data-theme='dark']) .hero-glow {
  background: radial-gradient(circle, rgba(95, 197, 154, 0.13), transparent 65%);
}
.page-hero-inner { position: relative; z-index: 1; }
.kicker {
  display: inline-block; font-family: var(--font-mono); font-size: 12.5px; font-weight: 500;
  letter-spacing: 0.14em; text-transform: uppercase; color: var(--accent);
  padding: 4px 12px; border: 1px solid color-mix(in srgb, var(--accent) 35%, transparent);
  border-radius: 100px; background-color: var(--accent-light); margin-bottom: 16px;
}
.hero-row {
  display: flex; align-items: flex-start; justify-content: space-between;
  gap: 16px; flex-wrap: wrap;
}
.page-hero h1 {
  font-family: var(--font-serif); font-size: 38px; font-weight: 700;
  color: var(--text-primary); letter-spacing: 0.02em; margin: 0;
}
.lede { font-size: 15px; color: var(--text-secondary); max-width: 680px; margin: 10px 0 0; }
.hero-note {
  font-size: 12.5px; color: var(--text-tertiary); margin: 8px 0 0;
  font-family: var(--font-mono); letter-spacing: 0.02em;
}
.hero-side {
  display: flex; align-items: center; gap: 12px; flex-wrap: wrap;
}

/* ===== Buttons ===== */
.btn {
  display: inline-flex; align-items: center; gap: 8px;
  font-family: var(--font-sans); font-size: 14px; font-weight: 500;
  padding: 10px 18px; border-radius: 10px; cursor: pointer;
  text-decoration: none; border: 1px solid transparent;
  transition: all var(--transition); white-space: nowrap;
}
.btn svg { width: 15px; height: 15px; flex-shrink: 0; }
.btn:focus-visible { outline: 2px solid var(--accent); outline-offset: 3px; }
.btn--primary {
  background-color: var(--accent); color: #fff;
  border-color: var(--accent); box-shadow: 0 1px 0 color-mix(in srgb, var(--accent) 30%, transparent);
}
.btn--primary:hover:not(:disabled) {
  background-color: var(--accent-hover); border-color: var(--accent-hover);
  transform: translateY(-1px); box-shadow: var(--shadow-md);
}
.btn--primary:disabled { opacity: 0.6; cursor: not-allowed; }
:global([data-theme='dark']) .btn--primary { color: #0f0f0f; }
.btn--ghost {
  background: transparent; color: var(--text-secondary);
  border-color: var(--border); padding: 8px 14px; font-size: 13px;
}
.btn--ghost:hover:not(:disabled) { border-color: var(--accent); color: var(--accent); background-color: var(--accent-light); }
.btn--ghost:disabled { opacity: 0.5; cursor: not-allowed; }

/* ===== 嵌入模型选择 ===== */
.embedding-picker {
  display: flex; align-items: center; gap: 10px; flex-wrap: wrap;
  margin-top: 12px; padding: 10px 14px;
  background: var(--bg-soft); border: 1px solid var(--border); border-radius: var(--radius-sm);
}
.picker-label { font-size: 12.5px; font-weight: 600; color: var(--text-secondary); white-space: nowrap; }
.picker-select-wrap { position: relative; display: inline-flex; align-items: center; }
.picker-select {
  appearance: none; -webkit-appearance: none;
  min-width: 220px; padding: 8px 36px 8px 12px;
  font-size: 13px; color: var(--text);
  background: var(--bg); border: 1px solid var(--border); border-radius: var(--radius-sm);
  cursor: pointer; transition: all var(--transition);
}
.picker-select:focus { outline: none; border-color: var(--accent); }
.picker-select:disabled { opacity: 0.6; cursor: not-allowed; }
.picker-caret {
  position: absolute; right: 10px; top: 50%; transform: translateY(-50%);
  pointer-events: none; color: var(--text-secondary);
}
.picker-hint { font-size: 12px; color: var(--text-tertiary); }

/* ===== 批量进度 ===== */
.batch-panel {
  background: var(--bg-card);
  border: 1px solid color-mix(in srgb, var(--accent) 25%, transparent);
  border-radius: var(--radius-md);
  padding: 16px 20px;
  margin: 22px 0 0;
}
.batch-info {
  display: flex; align-items: center; gap: 14px; flex-wrap: wrap;
  margin-bottom: 12px;
}
.batch-label {
  font-family: var(--font-serif); font-size: 14px; font-weight: 600;
  color: var(--text-primary); letter-spacing: 0.02em;
}
.batch-count {
  font-family: var(--font-mono); font-size: 13px; font-weight: 600; color: var(--accent);
}
.batch-stat {
  font-family: var(--font-mono); font-size: 12px;
  padding: 2px 10px; border-radius: 100px;
}
.batch-stat.ok { color: var(--accent); background-color: var(--accent-light); }
.batch-stat.fail { color: #e0533d; background-color: #fdf1ef; }
:global([data-theme='dark']) .batch-stat.fail { background-color: #2a1a17; }
.batch-stop { font-size: 12.5px; color: #e8a33d; font-family: var(--font-mono); }
.progress-track {
  height: 6px; border-radius: 100px;
  background: var(--bg-soft); overflow: hidden;
}
.progress-bar {
  height: 100%; border-radius: 100px;
  background: linear-gradient(90deg, var(--accent), color-mix(in srgb, var(--accent) 65%, #7fc7a6));
  transition: width 0.3s;
}

/* ===== Tabs ===== */
.tabs {
  display: flex; gap: 8px; margin: 22px 0 0; flex-wrap: wrap;
}
.tab {
  padding: 8px 18px;
  border: 1px solid var(--border);
  border-radius: 100px;
  background: transparent;
  color: var(--text-secondary);
  font-size: 13.5px;
  cursor: pointer;
  transition: all var(--transition);
}
.tab:hover:not(:disabled) { border-color: var(--accent); color: var(--accent); }
.tab.active {
  background: var(--accent);
  border-color: var(--accent);
  color: #fff;
  font-weight: 600;
  box-shadow: var(--shadow-sm);
}
:global([data-theme='dark']) .tab.active { color: #0f0f0f; }
.tab:disabled { opacity: 0.5; cursor: not-allowed; }

/* ===== 状态筛选 ===== */
.filters { display: flex; gap: 6px; margin: 14px 0 16px; }
.filter {
  padding: 5px 14px;
  border: none;
  border-radius: 100px;
  background: var(--bg-soft);
  color: var(--text-tertiary);
  font-size: 12.5px;
  cursor: pointer;
  transition: all var(--transition);
}
.filter:hover:not(:disabled) { color: var(--accent); }
.filter.active {
  background-color: var(--accent-light);
  color: var(--accent);
  font-weight: 600;
  box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--accent) 30%, transparent);
}
.filter:disabled { opacity: 0.5; cursor: not-allowed; }

/* ===== Loading ===== */
.empty {
  display: flex; align-items: center; justify-content: center; gap: 10px;
  padding: 64px 24px; color: var(--text-tertiary); font-size: 14px;
}
.spinner {
  width: 18px; height: 18px; border-radius: 50%;
  border: 2px solid var(--border); border-top-color: var(--accent);
  animation: spin 0.8s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }

/* ===== Table ===== */
.panel {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  overflow: hidden;
}
.data-table { width: 100%; border-collapse: collapse; font-size: 14px; }
.data-table th {
  padding: 12px 16px;
  text-align: left;
  font-family: var(--font-mono);
  font-size: 11.5px; font-weight: 600;
  color: var(--text-tertiary);
  text-transform: uppercase;
  letter-spacing: 0.08em;
  border-bottom: 1px solid var(--border);
  background: var(--bg-soft);
  white-space: nowrap;
}
.data-table td {
  padding: 13px 16px;
  border-bottom: 1px solid var(--border-light);
  color: var(--text-primary);
  vertical-align: top;
}
.data-table tbody tr { transition: background-color var(--transition); }
.data-table tbody tr:hover { background-color: color-mix(in srgb, var(--accent-light) 40%, transparent); }
.data-table tr:last-child td { border-bottom: none; }
.col-title { min-width: 180px; }
.col-type { width: 96px; }
.col-status { width: 96px; }
.col-time { width: 170px; }
.col-ops { width: 110px; text-align: right; }
.cell-title {
  font-family: var(--font-serif); font-size: 14.5px; font-weight: 600;
  letter-spacing: 0.01em;
}
.cell-summary { color: var(--text-secondary); font-size: 13px; line-height: 1.55; }
.cell-time {
  color: var(--text-tertiary); font-size: 12px;
  font-family: var(--font-mono); white-space: nowrap;
}
.type-tag {
  font-size: 12px;
  color: var(--text-secondary);
  background-color: var(--bg-soft);
  padding: 2px 10px; border-radius: 100px;
  white-space: nowrap;
}
.badge {
  display: inline-block;
  padding: 3px 11px; border-radius: 100px;
  font-size: 12px; font-weight: 600;
  white-space: nowrap;
}
.badge.s0 { background: var(--bg-soft); color: var(--text-tertiary); }
.badge.s1 { background: var(--accent-light); color: var(--accent); }
.badge.s2 { background: rgba(232, 163, 61, 0.14); color: #e8a33d; }
.cell-ops .link {
  background: none; border: none;
  color: var(--accent); cursor: pointer;
  font-size: 13px; font-weight: 500;
  padding: 2px 6px;
  transition: opacity var(--transition);
}
.cell-ops .link:hover:not(:disabled) { text-decoration: underline; }
.cell-ops .link:disabled { opacity: 0.5; cursor: not-allowed; }
.link--danger { color: #e0533d; }
.empty-row { text-align: center; color: var(--text-tertiary); padding: 36px; }

/* ===== Pager ===== */
.pager {
  display: flex; align-items: center; justify-content: center; gap: 14px;
  margin-top: 18px;
}
.page-btn {
  padding: 7px 16px;
  border: 1px solid var(--border);
  border-radius: 100px;
  background: transparent;
  color: var(--text-secondary);
  font-size: 13px;
  cursor: pointer;
  transition: all var(--transition);
}
.page-btn:hover:not(:disabled) { color: var(--accent); border-color: var(--accent); background-color: var(--accent-light); }
.page-btn:disabled { opacity: 0.5; cursor: not-allowed; }
.page-info { font-size: 12.5px; color: var(--text-tertiary); font-family: var(--font-mono); }

/* ===== 失败清单 ===== */
.failures {
  margin-top: 16px;
  background: #fdf1ef;
  border: 1px solid #f3c9c2;
  border-radius: var(--radius-md);
  padding: 14px 18px;
}
:global([data-theme='dark']) .failures { background: #2a1a17; border-color: #4a2a24; }
.failures-title {
  display: flex; align-items: center; gap: 8px;
  font-size: 13.5px; font-weight: 600; color: #e0533d;
  margin-bottom: 8px;
}
.failures-title svg { width: 15px; height: 15px; flex-shrink: 0; }
.failures ul {
  margin: 0; padding-left: 18px;
  color: var(--text-secondary); font-size: 13px; line-height: 1.8;
}

/* ===== Toast ===== */
.toast {
  position: fixed;
  left: 50%;
  bottom: 40px;
  transform: translateX(-50%);
  background: var(--bg-card);
  border: 1px solid var(--accent);
  color: var(--accent);
  font-size: 14px;
  font-weight: 500;
  padding: 10px 22px;
  border-radius: 100px;
  box-shadow: var(--shadow-lg);
  display: inline-flex;
  align-items: center;
  gap: 8px;
  z-index: 4000;
  max-width: min(480px, 90vw);
}
.toast svg { width: 16px; height: 16px; flex-shrink: 0; }
.toast.error { border-color: #e0533d; color: #e0533d; }
.toast-pop-enter-active, .toast-pop-leave-active {
  transition: opacity 0.35s cubic-bezier(0.22, 1, 0.36, 1), transform 0.35s cubic-bezier(0.22, 1, 0.36, 1);
}
.toast-pop-enter-from, .toast-pop-leave-to {
  opacity: 0;
  transform: translateX(-50%) translateY(20px);
}

/* ===== Responsive ===== */
@media (max-width: 768px) {
  .page-hero { padding: 20px 18px 20px; }
  .page-hero h1 { font-size: 30px; }
  .hero-side { width: 100%; }
  .data-table { font-size: 13px; }
  .data-table th, .data-table td { padding: 10px 10px; }
  .col-title { min-width: 120px; }
  .filters { flex-wrap: wrap; }
}
</style>
