<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import * as echarts from 'echarts'
import { useTheme } from '@/composables/useTheme'

const props = defineProps({
  // 省份全称列表（用于地图点亮）
  visitedProvinces: {
    type: Array,
    default: () => [],
  },
  // 足迹数据，结构同 data/about.js 的 footprintData
  footprintData: {
    type: Array,
    default: () => [],
  },
  // 省份全称 → 简称 映射（可选，缺省时按全称展示）
  provinceShort: {
    type: Object,
    default: () => ({}),
  },
})

const { isDark } = useTheme()
const router = useRouter()

/**
 * 点击地点卡片：绑定了小记则在新页面打开小记详情，未绑定不响应。
 */
function openNote(record) {
  if (!record?.noteSlug) return
  const href = router.resolve(`/xiaoji/${record.noteSlug}`).href
  window.open(href, '_blank')
}

/* ===== 数据准备 ===== */
// 全称 → 记录数组
const recordsByFull = computed(() => {
  const map = {}
  for (const item of props.footprintData) {
    map[item.province] = item.records || []
  }
  return map
})

// 简称 → 记录数组
const recordsByShort = computed(() => {
  const map = {}
  for (const item of props.footprintData) {
    const short = props.provinceShort[item.province] || item.province
    map[short] = item.records || []
  }
  return map
})

const fullToShort = computed(() => ({ ...props.provinceShort }))
const shortToFull = computed(() =>
  Object.fromEntries(
    Object.entries(props.provinceShort).map(([s, f]) => [f, s]),
  ),
)

/* ===== 统计 ===== */
const stats = computed(() => {
  const provinces = props.footprintData.length
  let places = 0
  let maxElv = 0
  for (const item of props.footprintData) {
    places += (item.records || []).length
    for (const r of item.records || []) {
      const m = String(r.elevation).match(/\d+/)
      if (m) maxElv = Math.max(maxElv, parseInt(m[0], 10))
    }
  }
  return { provinces, places, maxElv }
})

/* ===== 热力色阶 ===== */
const HEAT = {
  light: { 1: '#bfe0cf', 3: '#7cbfa1', 5: '#2d8264', 7: '#1c6048', 10: '#0e3a2b' },
  dark: { 1: '#9be3c4', 3: '#5fc59a', 5: '#3fa87f', 7: '#2c7d5f', 10: '#1d5240' },
}
const HEAT_LEVELS = [1, 3, 5, 7, 10]

function heatColor(count) {
  const scale = isDark.value ? HEAT.dark : HEAT.light
  let key = 1
  if (count >= 10) key = 10
  else if (count >= 7) key = 7
  else if (count >= 5) key = 5
  else if (count >= 3) key = 3
  return scale[key]
}

function baseUnvisitedColor() {
  return isDark.value ? '#1f2622' : '#eef0ee'
}

/* ===== 图例 ===== */
const legend = computed(() => ({
  unvisited: baseUnvisitedColor(),
  cells: HEAT_LEVELS.map((l) => ({
    level: l,
    color: heatColor(l),
    label: l === 10 ? '10+' : String(l),
  })),
}))

/* ===== 抽屉 ===== */
const drawerOpen = ref(false)
const drawerProvince = ref('') // 简称
const drawerRecords = ref([])
const drawerCount = ref(0)
const drawerHasRecords = ref(true)

function showProvince(fullName) {
  const short = fullToShort.value[fullName] || fullName
  const records = recordsByShort.value[short] || []
  drawerProvince.value = short
  drawerRecords.value = records
  drawerCount.value = records.length
  drawerHasRecords.value = records.length > 0
  drawerOpen.value = true
}

function closeDrawer() {
  drawerOpen.value = false
}

function onKeydown(e) {
  if (e.key === 'Escape') closeDrawer()
}

onMounted(() => {
  document.addEventListener('keydown', onKeydown)
})
onBeforeUnmount(() => {
  document.removeEventListener('keydown', onKeydown)
})

/* ===== ECharts ===== */
const chartEl = ref(null)
const loading = ref(true)
const geoError = ref(false)
let chart = null
let chinaGeo = null

function palette() {
  return isDark.value
    ? { base: '#1f2622', visited: '#5fc59a', border: '#2a3330', hover: '#7fd3ac' }
    : { base: '#eef0ee', visited: '#2d8264', border: '#d8e0db', hover: '#3a9a76' }
}

function tooltipFormatter(params) {
  const short = fullToShort.value[params.name] || params.name
  const records = recordsByShort.value[short]
  if (!records || records.length === 0) {
    return `<div style="padding:11px 14px;font-family:var(--font-sans);font-size:13px;color:var(--text-tertiary)">${short}：暂无足迹</div>`
  }
  const rows = records
    .map(
      (r) =>
        `<div style="margin-top:6px;font-family:var(--font-sans);font-size:13px;color:var(--text-secondary);line-height:1.6">- ${r.place}（${r.time}）</div>`,
    )
    .join('')
  return `<div style="padding:12px 14px;min-width:150px"><div style="font-family:var(--font-serif);font-size:15px;font-weight:700;color:var(--text-primary)">${short}</div>${rows}</div>`
}

function buildOption() {
  const p = palette()
  const provData = props.footprintData.map((item) => {
    const count = (item.records || []).length
    return {
      name: item.province,
      value: count,
      itemStyle: { areaColor: heatColor(count) },
    }
  })
  return {
    backgroundColor: 'transparent',
    tooltip: {
      show: true,
      trigger: 'item',
      backgroundColor: 'transparent',
      borderWidth: 0,
      padding: 0,
      extraCssText:
        'background:var(--bg-card);color:var(--text-primary);border:1px solid var(--border);border-radius:12px;box-shadow:0 8px 24px rgba(0,0,0,.16);max-width:240px;',
      formatter: tooltipFormatter,
    },
    series: [
      {
        type: 'map',
        map: 'china',
        roam: false,
        zoom: 1.2,
        layoutCenter: ['50%', '68%'],
        layoutSize: '100%',
        label: { show: false },
        itemStyle: { areaColor: p.base, borderColor: p.border, borderWidth: 0.6 },
        emphasis: { itemStyle: { areaColor: p.hover }, label: { show: false } },
        select: { itemStyle: { areaColor: p.visited }, label: { show: false } },
        data: provData,
      },
    ],
  }
}

async function loadChinaGeo() {
  if (chinaGeo) return chinaGeo
  // 优先加载内置本地 GeoJSON（不依赖外部网络，境外服务器也能渲染）
  // 在线源作为兜底（本地缺失时尝试）
  const sources = [
    `${import.meta.env.BASE_URL}china-geo.json`,
    'https://geo.datav.aliyun.com/areas_v3/bound/100000_full.json',
  ]
  let lastErr = null
  for (const url of sources) {
    try {
      const resp = await fetch(url)
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`)
      chinaGeo = await resp.json()
      // 过滤掉南海诸岛等极南要素，避免大陆被缩小
      const cleaned = {
        type: chinaGeo.type,
        features: (chinaGeo.features || []).filter(
          (f) =>
            !/南海|群岛/.test(
              (f.properties && (f.properties.name || f.properties.NAME)) || '',
            ),
        ),
      }
      echarts.registerMap('china', cleaned)
      return cleaned
    } catch (e) {
      lastErr = e
      // 继续尝试下一个源
    }
  }
  throw lastErr || new Error('所有地图源加载失败')
}

async function initChart() {
  if (!chartEl.value) return
  try {
    await loadChinaGeo()
  } catch (e) {
    loading.value = false
    geoError.value = true
    return
  }
  if (!chart) {
    chart = echarts.init(chartEl.value)
  }
  chart.setOption(buildOption())
  chart.off('click')
  chart.on('click', (params) => {
    if (params && params.name) showProvince(params.name)
  })
  loading.value = false
}

function resizeChart() {
  chart?.resize()
}

watch(isDark, () => {
  if (chart && chinaGeo) {
    chart.setOption(buildOption(), true)
  }
})

onMounted(async () => {
  await initChart()
  window.addEventListener('resize', resizeChart)
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', resizeChart)
  chart?.dispose()
  chart = null
})
</script>

<template>
  <div class="fp">
    <!-- 统计条 -->
    <div class="fp-stats">
      <div class="fp-stat">
        <span class="num">{{ stats.provinces }}</span>
        <span class="lbl">点亮省份</span>
      </div>
      <div class="fp-stat">
        <span class="num">{{ stats.places }}</span>
        <span class="lbl">到访地点</span>
      </div>
      <div class="fp-stat">
        <span class="num">{{ stats.maxElv }}<span class="unit">m</span></span>
        <span class="lbl">最高海拔</span>
      </div>
    </div>

    <!-- 主区：地图（图例浮于左上角，新疆西北方向） -->
    <div class="fp-main">
      <div class="fp-map-card">
        <!-- 图例：浮在地图框体左上角 -->
        <div class="fp-legend-inline">
          <div class="fp-legend-row">
    
            <span class="fp-heat-scale">
              <span
                v-for="cell in legend.cells"
                :key="cell.level"
                class="fp-heat-cell"
              >
                <span class="sq" :style="{ backgroundColor: cell.color }" />
                <span class="n">{{ cell.label }}</span>
              </span>
            </span>
          
          </div>
        </div>

        <div ref="chartEl" class="fp-map" />
        <div v-if="loading" class="fp-loading">地图加载中…</div>
        <div v-else-if="geoError" class="fp-loading fp-loading-error">
          地图资源加载失败（可能离线），无法渲染。
        </div>
      </div>
    </div>

    <!-- 抽屉：点击省份从右侧滑出 -->
    <Teleport to="body">
      <Transition name="fp-drawer">
        <div v-if="drawerOpen" class="fp-drawer" @click.self="closeDrawer">
          <div class="fp-drawer-backdrop" @click="closeDrawer" />
          <aside
            class="fp-drawer-panel"
            role="dialog"
            aria-modal="true"
            :aria-labelledby="`fp-prov-${drawerProvince}`"
          >
            <button
              class="fp-drawer-close"
              type="button"
              aria-label="关闭"
              @click="closeDrawer"
            >
              ×
            </button>
            <div class="fp-detail-head">
              <h3 :id="`fp-prov-${drawerProvince}`">{{ drawerProvince }}</h3>
              <span v-if="drawerHasRecords" class="fp-count">
                {{ drawerCount }} 个地点
              </span>
            </div>
            <ul v-if="drawerHasRecords" class="fp-list">
              <li
                v-for="(r, i) in drawerRecords"
                :key="i"
                class="fp-item"
                :class="{ 'fp-item--linked': r.noteSlug }"
                :role="r.noteSlug ? 'link' : undefined"
                @click="openNote(r)"
              >
                <div class="fp-item-top">
                  <span class="fp-place">{{ r.place }}</span>
                  <span class="fp-time">{{ r.time }}</span>
                </div>
                <div class="fp-meta">
                  <span class="fp-chip"><b>地点</b> {{ r.location }}</span>
                  <span class="fp-chip"><b>海拔</b> {{ r.elevation }}</span>
                </div>
                <p v-if="r.noteSlug" class="fp-note-link">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
                  阅读小记《{{ r.noteTitle || '未命名' }}》
                </p>
              </li>
            </ul>
            <p v-else class="fp-empty">
              「{{ drawerProvince }}」暂时还没有记录下的足迹。
            </p>
          </aside>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<style scoped>
.fp {
  display: block;
}

/* ===== 统计条 ===== */
.fp-stats {
  display: flex;
  gap: 28px;
  margin: 24px 0 28px;
  flex-wrap: wrap;
}
.fp-stat {
  display: flex;
  flex-direction: column;
}
.fp-stat .num {
  font-family: var(--font-mono);
  font-size: 26px;
  font-weight: 600;
  color: var(--accent);
  line-height: 1.1;
}
.fp-stat .num .unit {
  font-size: 14px;
  color: var(--text-tertiary);
  margin-left: 2px;
}
.fp-stat .lbl {
  font-size: 12.5px;
  color: var(--text-tertiary);
  margin-top: 2px;
}

/* ===== 主区 ===== */
.fp-main {
  display: block;
}

/* 图例：浮在地图框体左上角（新疆西北方向） */
.fp-legend-inline {
  position: absolute;
  top: 25px;
  left: 25px;
  z-index: 2;
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin: 0;
  padding: 0;
  pointer-events: none;
}
.fp-legend-row {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12.5px;
  color: var(--text-secondary);
}
.fp-heat-scale {
  display: inline-flex;
  align-items: flex-end;
  gap: 6px;
  margin-left: 4px;
}
.fp-heat-cell {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 3px;
}
.fp-heat-cell .sq {
  width: 16px;
  height: 16px;
  border-radius: 4px;
}
.fp-heat-cell .n {
  font-family: var(--font-mono);
  font-size: 10px;
  color: var(--text-tertiary);
  line-height: 1;
}
.fp-swatch {
  width: 14px;
  height: 14px;
  border-radius: 4px;
  flex-shrink: 0;
}

/* 地图卡片 */
.fp-map-card {
  position: relative;
  min-height: 600px;
  overflow: hidden;
  background-color: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-sm);
}
.fp-map {
  width: 100%;
  height: 100%;
  min-height: 600px;
}
.fp-loading {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: var(--font-mono);
  font-size: 13px;
  letter-spacing: 0.08em;
  color: var(--text-tertiary);
}
.fp-loading-error {
  color: var(--text-secondary);
}

/* ===== 抽屉 ===== */
.fp-drawer {
  position: fixed;
  inset: 0;
  z-index: 100;
}
.fp-drawer-backdrop {
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.4);
  backdrop-filter: blur(2px);
}
.fp-drawer-panel {
  position: absolute;
  top: 0;
  right: 0;
  height: 100%;
  width: min(420px, 92vw);
  background-color: var(--bg-card);
  border-left: 1px solid var(--border);
  box-shadow: -10px 0 32px rgba(0, 0, 0, 0.18);
  padding: 26px 24px;
  overflow-y: auto;
}
.fp-drawer-close {
  position: absolute;
  top: 16px;
  right: 18px;
  width: 30px;
  height: 30px;
  border-radius: 50%;
  border: 1px solid var(--border);
  background: transparent;
  color: var(--text-tertiary);
  font-size: 20px;
  line-height: 1;
  cursor: pointer;
  transition: color var(--transition), border-color var(--transition);
}
.fp-drawer-close:hover {
  color: var(--text-primary);
  border-color: var(--accent);
}

/* 抽屉过渡 */
.fp-drawer-enter-active,
.fp-drawer-leave-active {
  transition: opacity 0.22s ease;
}
.fp-drawer-enter-active .fp-drawer-panel,
.fp-drawer-leave-active .fp-drawer-panel {
  transition: transform 0.26s cubic-bezier(0.4, 0, 0.2, 1);
}
.fp-drawer-enter-from,
.fp-drawer-leave-to {
  opacity: 0;
}
.fp-drawer-enter-from .fp-drawer-panel,
.fp-drawer-leave-to .fp-drawer-panel {
  transform: translateX(100%);
}

/* ===== 详情内容 ===== */
.fp-detail-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 10px;
  padding-bottom: 16px;
  padding-right: 32px;
  border-bottom: 1px solid var(--border-light);
  margin-bottom: 18px;
}
.fp-detail-head h3 {
  font-family: var(--font-serif);
  font-size: 21px;
  font-weight: 700;
  margin: 0;
}
.fp-count {
  font-family: var(--font-mono);
  font-size: 12.5px;
  color: var(--accent);
  white-space: nowrap;
}

.fp-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 18px;
}
.fp-item {
  padding: 16px 18px;
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  background-color: var(--bg-soft);
  transition: border-color var(--transition), box-shadow var(--transition);
}
.fp-item:hover {
  border-color: color-mix(in srgb, var(--accent) 40%, transparent);
  box-shadow: var(--shadow-sm);
}
.fp-item--linked {
  cursor: pointer;
}
.fp-item--linked:hover {
  border-color: var(--accent);
}
.fp-item--linked:hover .fp-place {
  color: var(--accent);
}
.fp-note-link {
  display: flex;
  align-items: center;
  gap: 6px;
  margin: 12px 0 0;
  font-size: 13px;
  font-weight: 500;
  color: var(--accent);
}
.fp-note-link svg {
  width: 14px;
  height: 14px;
  flex-shrink: 0;
}
.fp-item-top {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 10px;
}
.fp-place {
  font-family: var(--font-serif);
  font-size: 17px;
  font-weight: 600;
  color: var(--text-primary);
}
.fp-time {
  font-family: var(--font-mono);
  font-size: 13px;
  color: var(--accent);
}
.fp-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin: 12px 0 10px;
}
.fp-chip {
  font-family: var(--font-mono);
  font-size: 12px;
  color: var(--text-secondary);
  background-color: var(--accent-light);
  border-radius: 100px;
  padding: 4px 11px;
}
.fp-chip b {
  color: var(--accent);
  font-weight: 600;
}
.fp-empty {
  color: var(--text-tertiary);
  font-size: 14px;
}

/* ===== 响应式 ===== */
@media (max-width: 900px) {
  .fp-map-card,
  .fp-map {
    min-height: 460px;
  }
}
@media (max-width: 768px) {
  .fp-stats {
    gap: 20px;
  }
}
</style>
