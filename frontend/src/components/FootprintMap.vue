<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import * as echarts from 'echarts'
import { useTheme } from '@/composables/useTheme'

const props = defineProps({
  visitedProvinces: {
    type: Array,
    default: () => [],
  },
  footprintData: {
    type: Array,
    default: () => [],
  },
})

const { isDark } = useTheme()
const chartEl = ref(null)
const activeProvince = ref('')
const activeLocations = ref([])
const expandedGroups = ref({})
let chart = null
let chinaGeo = null

/* ===== 省名→位置映射 ===== */
const locationMap = computed(() => {
  const map = {}
  for (const item of props.footprintData) {
    map[item.province] = item.locations
  }
  return map
})

/** 计算某省总地点数（跨所有城市） */
function countPlaces(locations) {
  let n = 0
  for (const loc of locations) {
    n += loc.places.length
  }
  return n
}

function showDetail(province) {
  const locs = locationMap.value[province]
  if (!locs || locs.length === 0) return
  activeProvince.value = province
  activeLocations.value = locs
}

function closeDetail() {
  activeProvince.value = ''
  activeLocations.value = []
  expandedGroups.value = {}
}

function toggleGroup(idx) {
  expandedGroups.value[idx] = !expandedGroups.value[idx]
}

function getVisitedSet() {
  return new Set(props.visitedProvinces.map((p) => p.trim()))
}

function buildOption(visitedSet) {
  const isLight = !isDark.value
  return {
    tooltip: {
      trigger: 'item',
      backgroundColor: isLight ? '#ffffff' : '#1a1a1a',
      borderColor: isLight ? '#e5e7eb' : '#333333',
      textStyle: { color: isLight ? '#1f2937' : '#e5e7eb', fontSize: 13 },
      formatter(params) {
        const locs = locationMap.value[params.name]
        if (locs && locs.length) {
          const lines = locs.map((l) => `✦ ${l.city}${l.places.length > 1 ? `（${l.places.length}处）` : ''}`)
          return `${params.name}<br/>${lines.join('<br/>')}`
        }
        return params.name
      },
    },
    visualMap: {
      show: false,
      min: 0,
      max: 1,
      inRange: {
        color: isLight ? ['#e5e7eb', '#2d8264'] : ['#2a2a2a', '#5fc59a'],
      },
    },
    series: [
      {
        type: 'map',
        map: 'china',
        roam: false,
        zoom: 1.2,
        center: [104.5, 36],
        label: { show: false },
        itemStyle: {
          areaColor: isLight ? '#f3f4f6' : '#2a2a2a',
          borderColor: isLight ? '#d1d5db' : '#444444',
          borderWidth: 1,
        },
        emphasis: {
          label: {
            show: true,
            color: isLight ? '#1f2937' : '#e5e7eb',
            fontSize: 13,
          },
          itemStyle: {
            areaColor: isLight ? '#c7e8d4' : '#3a6b56',
          },
        },
        data: Array.from(visitedSet).map((name) => ({
          name,
          value: 1,
          itemStyle: {
            areaColor: isLight ? '#2d8264' : '#5fc59a',
          },
          label: { show: false },
          emphasis: {
            itemStyle: {
              areaColor: isLight ? '#1f6b4f' : '#7ff0b3',
            },
          },
        })),
      },
    ],
  }
}

async function loadChinaGeo() {
  if (chinaGeo) return chinaGeo
  const resp = await fetch(
    'https://geo.datav.aliyun.com/areas_v3/bound/100000_full.json',
  )
  chinaGeo = await resp.json()
  echarts.registerMap('china', chinaGeo)
  return chinaGeo
}

async function initChart() {
  if (!chartEl.value) return
  try {
    await loadChinaGeo()
  } catch {
    return
  }
  if (!chart) {
    chart = echarts.init(chartEl.value)
  }
  chart.setOption(buildOption(getVisitedSet()))

  /* === 点击省份弹出具体位置 === */
  chart.off('click')
  chart.on('click', (params) => {
    if (params.componentType === 'series') {
      showDetail(params.name)
    }
  })
}

function resizeChart() {
  chart?.resize()
}

watch(isDark, () => {
  if (chart && chinaGeo) {
    chart.setOption(buildOption(getVisitedSet()), true)
    closeDetail()
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
  <div>
    <div ref="chartEl" class="footprint-map" />

    <!-- 足迹详情弹窗 -->
    <Teleport to="body">
      <Transition name="modal">
        <div
          v-if="activeProvince"
          class="modal-overlay"
          @click.self="closeDetail"
        >
          <div class="modal-card" :class="{ dark: isDark }">
            <div class="modal-header">
              <div class="modal-title">
                <span class="modal-icon">📍</span>
                <span>{{ activeProvince }}</span>
                <span class="modal-badge">{{ countPlaces(activeLocations) }}个足迹</span>
              </div>
              <button class="modal-close" @click="closeDetail">
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                  <path d="M15 5L5 15M5 5l10 10" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                </svg>
              </button>
            </div>
            <div class="modal-body">
              <ul class="location-grid">
                <li
                  v-for="(loc, idx) in activeLocations"
                  :key="idx"
                  class="loc-group"
                  :class="{ expanded: expandedGroups[idx] }"
                  :style="{ animationDelay: `${idx * 0.08}s` }"
                >
                  <button class="group-header" @click="toggleGroup(idx)">
                    <span class="loc-marker">
                      <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                        <circle cx="6" cy="5" r="3" fill="currentColor"/>
                        <path d="M6 8L6 12" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
                      </svg>
                    </span>
                    <span class="group-label">{{ loc.city }}（{{ loc.places.length }}）</span>
                    <span class="group-chevron">
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                        <path d="M4 6l4 4 4-4" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                      </svg>
                    </span>
                  </button>
                  <Transition name="collapse">
                    <ul v-show="expandedGroups[idx]" class="group-places">
                      <li v-for="(place, pi) in loc.places" :key="place" :style="{ animationDelay: `${pi * 0.06}s` }">
                        <span class="place-dot" />
                        <span>{{ loc.city }} · {{ place }}</span>
                      </li>
                    </ul>
                  </Transition>
                </li>
              </ul>
            </div>
            <div class="modal-footer">
              <span class="footer-hint">点击地图其他省份继续探索</span>
              <button class="btn-close" @click="closeDetail">关闭</button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<style scoped>
.footprint-map {
  width: 100%;
  height: 460px;
}

/* ===== 弹窗遮罩 ===== */
.modal-overlay {
  position: fixed;
  inset: 0;
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.45);
  backdrop-filter: blur(6px);
  padding: 24px;
}

/* ===== 弹窗卡片（浅色默认） ===== */
.modal-card {
  width: 100%;
  max-width: 520px;
  background: #ffffff;
  border-radius: 20px;
  box-shadow: 0 24px 80px rgba(0, 0, 0, 0.18);
  overflow: hidden;
}

/* 深色卡片 */
.modal-card.dark {
  background: #1e1e1e;
  box-shadow: 0 24px 80px rgba(0, 0, 0, 0.5);
  border: 1px solid #2e2e2e;
}

.modal-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  padding: 24px 28px 0;
}

.modal-title {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 22px;
  font-weight: 700;
  color: #1f2937;
}

.dark .modal-title {
  color: #e5e7eb;
}

.modal-icon {
  font-size: 26px;
}

.modal-badge {
  font-size: 12px;
  font-weight: 500;
  color: #2d8264;
  background: #e8f5ee;
  padding: 3px 10px;
  border-radius: 20px;
  white-space: nowrap;
}

.dark .modal-badge {
  color: #5fc59a;
  background: #1a3a2e;
}

.modal-close {
  flex-shrink: 0;
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  border: none;
  background: #f3f4f6;
  color: #6b7280;
  cursor: pointer;
  transition: background 0.2s, color 0.2s;
  margin-top: -2px;
}

.dark .modal-close {
  background: #2a2a2a;
  color: #9ca3af;
}

.modal-close:hover {
  background: #e5e7eb;
  color: #1f2937;
}

.dark .modal-close:hover {
  background: #3a3a3a;
  color: #e5e7eb;
}

/* ===== 弹窗内容 ===== */
.modal-body {
  padding: 24px 28px 8px;
}

.location-grid {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

/* ===== 分组下拉列表 ===== */
.loc-group {
  display: flex;
  flex-direction: column;
  border-radius: 12px;
  opacity: 0;
  animation: slideIn 0.35s ease forwards;
}

.loc-group.expanded {
  background: #f9fafb;
}

.dark .loc-group.expanded {
  background: #2a2a2a;
}

.group-header {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 16px;
  border: none;
  border-radius: 12px;
  background: #f9fafb;
  color: #374151;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s;
  text-align: left;
}

.dark .group-header {
  background: #262626;
  color: #d1d5db;
}

.group-header:hover {
  background: #e8f5ee;
}

.dark .group-header:hover {
  background: #1a3a2e;
}

.group-label {
  flex: 1;
}

.group-chevron {
  display: flex;
  align-items: center;
  color: #9ca3af;
  transition: transform 0.25s ease;
}

.dark .group-chevron {
  color: #6b7280;
}

.loc-group.expanded .group-chevron {
  transform: rotate(180deg);
}

.group-places {
  list-style: none;
  padding: 0 16px 12px 52px;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.group-places li {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 12px;
  border-radius: 8px;
  background: #ffffff;
  color: #4b5563;
  font-size: 14px;
  font-weight: 400;
  opacity: 0;
  animation: slideInSub 0.3s ease forwards;
}

.dark .group-places li {
  background: #1e1e1e;
  color: #9ca3af;
}

@keyframes slideInSub {
  from {
    opacity: 0;
    transform: translateX(-10px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

.place-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #2d8264;
  flex-shrink: 0;
}

.dark .place-dot {
  background: #5fc59a;
}

/* 折叠过渡 */
.collapse-enter-active,
.collapse-leave-active {
  transition: all 0.25s ease;
  overflow: hidden;
}

.collapse-enter-from,
.collapse-leave-to {
  opacity: 0;
  max-height: 0;
}

.collapse-enter-to,
.collapse-leave-from {
  opacity: 1;
  max-height: 300px;
}

.loc-marker {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: #e8f5ee;
  color: #2d8264;
  flex-shrink: 0;
}

.dark .loc-marker {
  background: #1a3a2e;
  color: #5fc59a;
}

/* ===== 弹窗底部 ===== */
.modal-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 28px 24px;
}

.footer-hint {
  font-size: 13px;
  color: #9ca3af;
}

.dark .footer-hint {
  color: #6b7280;
}

.btn-close {
  padding: 8px 22px;
  border-radius: 10px;
  border: none;
  background: #2d8264;
  color: #ffffff;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s, transform 0.15s;
}

.dark .btn-close {
  background: #5fc59a;
  color: #1e1e1e;
}

.btn-close:hover {
  background: #236b51;
  transform: scale(1.03);
}

.dark .btn-close:hover {
  background: #7ff0b3;
}

.btn-close:active {
  transform: scale(0.97);
}

/* ===== 弹窗过渡动画 ===== */
.modal-enter-active {
  transition: opacity 0.25s ease;
}

.modal-enter-active .modal-card {
  transition: opacity 0.25s ease, transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.modal-leave-active {
  transition: opacity 0.2s ease;
}

.modal-leave-active .modal-card {
  transition: opacity 0.2s ease, transform 0.2s ease;
}

.modal-enter-from {
  opacity: 0;
}

.modal-enter-from .modal-card {
  opacity: 0;
  transform: scale(0.9) translateY(20px);
}

.modal-leave-to {
  opacity: 0;
}

.modal-leave-to .modal-card {
  opacity: 0;
  transform: scale(0.95) translateY(-10px);
}

@keyframes slideIn {
  from {
    opacity: 0;
    transform: translateX(-12px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

/* ===== 响应式 ===== */
@media (max-width: 768px) {
  .footprint-map {
    height: 320px;
  }

  .modal-overlay {
    padding: 16px;
    align-items: flex-end;
  }

  .modal-card {
    max-width: 100%;
    border-radius: 20px 20px 8px 8px;
  }

  .modal-header {
    padding: 20px 20px 0;
  }

  .modal-title {
    font-size: 18px;
  }

  .modal-body {
    padding: 20px 20px 4px;
  }

  .group-header {
    padding: 12px 14px;
    font-size: 14px;
  }

  .modal-footer {
    padding: 12px 20px 20px;
    flex-direction: column;
    gap: 10px;
  }
}
</style>
