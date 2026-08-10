<template>
  <div class="notes-page">
    <div class="notes-layout">
      <!-- 最左侧：小记 + 重要日期列表 -->
      <aside class="notes-sidebar">
        <div class="sidebar-header">
          <h1>小记</h1>
          <p class="subtitle">记录生活点滴</p>
        </div>

        <div class="important-section">
          <div class="important-section__title">
            <span class="important-section__icon">📌</span>
            <span>重要日期</span>
          </div>

          <p v-if="!importantDates.length" class="important-empty">
            点击日历格子上的 <span class="important-empty__star">★</span> 标记重要日期
          </p>

          <div v-else class="important-list">
            <button
              v-for="item in importantDates"
              :key="item.iso"
              type="button"
              class="important-card"
              :class="{ 'important-card--active': item.iso === selectedIso }"
              @click="jumpToDate(item.iso)"
            >
              <div class="important-card__date">
                <span class="important-card__day">{{ item.day }}</span>
                <span class="important-card__weekday">{{ item.weekday }}</span>
              </div>
              <div class="important-card__body">
                <span class="important-card__mood" v-if="item.mood">{{ item.mood }}</span>
                <ul v-if="item.plans.length > 0" class="important-card__plans">
                  <li v-for="(plan, idx) in item.plans" :key="idx">{{ plan }}</li>
                </ul>
              </div>
              <span
                class="important-card__remove"
                title="取消重要标记"
                @click.stop="toggleImportant(item.iso)"
              >✕</span>
            </button>
          </div>
        </div>
      </aside>

      <!-- 右侧整体：日历 + 日记详情 水平并排 -->
      <div class="notes-main">
        <!-- 日历面板 -->
        <section class="calendar-panel" :class="{ 'calendar-panel--loading': showMonthOverlay }">
          <div class="calendar-panel__header">
            <h3 class="calendar-panel__icon">📅</h3>
            <div class="calendar-panel__controls">
              <button type="button" @click="prevMonth" aria-label="上一个月">◀</button>
              <span class="calendar-panel__month">{{ monthLabel }}</span>
              <button type="button" @click="nextMonth" aria-label="下一个月">▶</button>
            </div>
          </div>
          <p v-if="showMonthOverlay" class="calendar-hint">正在加载...</p>
          <p v-else-if="monthError" class="calendar-hint calendar-hint--error">{{ monthError }}</p>
          <div class="calendar-grid">
            <div class="weekday" v-for="day in weekdays" :key="day">{{ day }}</div>
            <button
              v-for="cell in calendarCells"
              :key="cell.iso"
              type="button"
              class="calendar-cell"
              :aria-pressed="isSelected(cell.date)"
              :class="[
                { 'calendar-cell--active': isSelected(cell.date) },
                {
                  'calendar-cell--outside': !cell.inCurrentMonth,
                  'calendar-cell--today': isToday(cell.date),
                  'calendar-cell--important': cell.isImportant
                }
              ]"
              @click="selectDate(cell.date)"
            >
              <span class="calendar-cell__day">{{ cell.label }}</span>
              <span class="calendar-cell__mood">{{ cell.mood || '\u00A0' }}</span>
              <span v-if="cell.isImportant" class="calendar-cell__star">★</span>
            </button>
          </div>
        </section>

        <!-- 日记详情面板 -->
        <section class="detail-panel">
          <div class="detail-panel__header">
            <h3>{{ detailTitle }}</h3>
            <div v-if="hasScores" class="detail-panel__header-scores">
              <div v-for="dim in DEFAULT_DIMENSIONS" :key="dim" class="score-item">
                <span class="score-item__label" :style="{ color: DIMENSION_COLORS[dim] }">{{ dim }}</span>
                <div class="score-item__dots">
                  <span
                    v-for="n in 5"
                    :key="n"
                    class="score-dot"
                    :class="{ 'score-dot--active': n <= (selectedEntry.scores?.[dim] ?? 0) }"
                    :style="n <= (selectedEntry.scores?.[dim] ?? 0) ? { background: DIMENSION_COLORS[dim], borderColor: DIMENSION_COLORS[dim] } : {}"
                  />
                </div>
              </div>
            </div>
          </div>

          <div class="detail-panel__body" :class="{ 'detail-panel__body--loading': showDetailOverlay }">
            <div v-show="showDetailOverlay" class="detail-loader">正在加载...</div>
            <p v-if="detailError" class="feedback feedback--error">{{ detailError }}</p>

            <div v-if="selectedEntry" class="diary-content">
              <!-- 情绪 -->
              <div class="diary-field">
                <span class="diary-field__label">情绪</span>
                <p class="diary-field__value">{{ selectedEntry.mood || '未记录' }}</p>
              </div>


              <!-- 计划 -->
              <div v-if="selectedEntry.plans.length > 0" class="diary-field">
                <span class="diary-field__label">今日计划</span>
                <ul class="plans-list">
                  <li v-for="(plan, idx) in selectedEntry.plans" :key="idx" class="plans-list__item">{{ plan }}</li>
                </ul>
              </div>

              <!-- 正文 -->
              <div class="diary-field">
                <span class="diary-field__label">日记正文</span>
                <p class="diary-field__content">{{ selectedEntry.content || '暂无内容' }}</p>
              </div>
            </div>

            <div v-else-if="!showDetailOverlay && !detailError" class="detail-empty">
              <p>选择日历中的日期查看日记</p>
            </div>
          </div>
        </section>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import {
  fetchDiaryDetail,
  fetchDiarySummaries,
  type DiaryEntryDetail,
  type DiaryEntrySummary
} from '@/services/diaryService';

const weekdays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const initialSelected = new Date();

const viewMonth = ref(new Date(initialSelected.getFullYear(), initialSelected.getMonth(), 1));
const selectedDate = ref(new Date(initialSelected));

const pad = (value: number) => value.toString().padStart(2, '0');
const toIsoDate = (date: Date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

const monthLabel = computed(() => {
  const formatter = new Intl.DateTimeFormat('zh-CN', { year: 'numeric', month: 'long' });
  return formatter.format(viewMonth.value);
});

const summaryByDate = ref<Record<string, DiaryEntrySummary>>({});
const detailCache = ref<Record<string, DiaryEntryDetail | null>>({});

const isMonthLoading = ref(false);
const monthError = ref<string | null>(null);

const isDetailLoading = ref(false);
const detailError = ref<string | null>(null);

const showDetailOverlay = ref(false);
let detailOverlayTimer: ReturnType<typeof setTimeout> | null = null;
const DETAIL_OVERLAY_DELAY = 160;

const showMonthOverlay = ref(false);
let monthOverlayTimer: ReturnType<typeof setTimeout> | null = null;
const MONTH_OVERLAY_DELAY = 160;

/* ── 重要日期 ── */
const importantDateSet = ref<Set<string>>(new Set());

const toggleImportant = (iso: string) => {
  const next = new Set(importantDateSet.value);
  if (next.has(iso)) {
    next.delete(iso);
  } else {
    next.add(iso);
  }
  importantDateSet.value = next;
};

/* ── 测试数据：跨多个月份预设重要日期 ── */
onMounted(() => {
  const today = new Date();
  const y = today.getFullYear();
  const m = today.getMonth();
  const dates = [
    today,
    new Date(y, m, today.getDate() - 1),
    new Date(y, m, today.getDate() + 3),
    new Date(y, m, 1),
    new Date(y, m, 15),
    // 上个月
    new Date(y, m - 1, 5),
    new Date(y, m - 1, 20),
    new Date(y, m - 1, 28),
    // 下个月
    new Date(y, m + 1, 3),
    new Date(y, m + 1, 18),
  ];
  const next = new Set(importantDateSet.value);
  dates.forEach((d) => next.add(toIsoDate(d)));
  importantDateSet.value = next;
});

const isImportant = (iso: string) => importantDateSet.value.has(iso);

const WEEKDAY_ZH = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];

const importantDates = computed(() => {
  const year = viewMonth.value.getFullYear();
  const month = viewMonth.value.getMonth();
  const items = Array.from(importantDateSet.value)
    .filter((iso) => {
      const parts = iso.split('-');
      const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
      return d.getFullYear() === year && d.getMonth() === month;
    })
    .map((iso) => {
      const parts = iso.split('-');
      const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
      const summary = summaryByDate.value[iso];
      const detail = detailCache.value[iso];
      return {
        iso,
        day: `${d.getMonth() + 1}/${d.getDate()}`,
        weekday: WEEKDAY_ZH[d.getDay()],
        mood: summary?.mood ?? null,
        plans: detail?.plans ?? [],
        sortKey: iso
      };
    })
    .sort((a, b) => a.sortKey.localeCompare(b.sortKey));
  return items;
});

const jumpToDate = (iso: string) => {
  const parts = iso.split('-');
  const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
  selectedDate.value = d;
};

/* ── 加载计时器 ── */

const cancelDetailOverlayTimer = () => {
  if (detailOverlayTimer) {
    clearTimeout(detailOverlayTimer);
    detailOverlayTimer = null;
  }
};

const scheduleDetailOverlay = () => {
  cancelDetailOverlayTimer();
  showDetailOverlay.value = false;
  detailOverlayTimer = setTimeout(() => {
    showDetailOverlay.value = true;
    detailOverlayTimer = null;
  }, DETAIL_OVERLAY_DELAY);
};

const cancelMonthOverlayTimer = () => {
  if (monthOverlayTimer) {
    clearTimeout(monthOverlayTimer);
    monthOverlayTimer = null;
  }
};

const scheduleMonthOverlay = () => {
  cancelMonthOverlayTimer();
  showMonthOverlay.value = false;
  monthOverlayTimer = setTimeout(() => {
    showMonthOverlay.value = true;
    monthOverlayTimer = null;
  }, MONTH_OVERLAY_DELAY);
};

const DEFAULT_DIMENSIONS = ['心情', '学习', '运动', '工作'];
const DIMENSION_COLORS: Record<string, string> = {
  心情: '#e0527e',
  学习: '#4c5df0',
  运动: '#2ecc71',
  工作: '#f39c12'
};

const selectedIso = computed(() => toIsoDate(selectedDate.value));

const selectedEntry = computed(() => detailCache.value[selectedIso.value] ?? null);

const hasScores = computed(() => {
  const entry = selectedEntry.value;
  if (!entry?.scores) return false;
  return Object.values(entry.scores).some((v) => v > 0);
});

const detailTitle = computed(() => {
  const date = selectedDate.value;
  const formatter = new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'long'
  });
  return formatter.format(date);
});

const calendarCells = computed(() => {
  const year = viewMonth.value.getFullYear();
  const month = viewMonth.value.getMonth();
  const firstDay = new Date(year, month, 1);
  const startOffset = (firstDay.getDay() + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrevMonth = new Date(year, month, 0).getDate();
  const total = 42;

  return Array.from({ length: total }, (_, index) => {
    let cellDate: Date;
    let inCurrentMonth = true;

    if (index < startOffset) {
      const day = daysInPrevMonth - startOffset + index + 1;
      cellDate = new Date(year, month - 1, day);
      inCurrentMonth = false;
    } else if (index >= startOffset + daysInMonth) {
      const day = index - startOffset - daysInMonth + 1;
      cellDate = new Date(year, month + 1, day);
      inCurrentMonth = false;
    } else {
      const day = index - startOffset + 1;
      cellDate = new Date(year, month, day);
    }

    const iso = toIsoDate(cellDate);
    const summary = summaryByDate.value[iso];

    return {
      date: cellDate,
      iso,
      label: cellDate.getDate(),
      inCurrentMonth,
      mood: summary?.mood ?? null,
      matched: false,
      isImportant: isImportant(iso)
    };
  });
});

const isSelected = (date: Date) => {
  return toIsoDate(date) === selectedIso.value;
};

const isToday = (date: Date) => {
  const today = new Date();
  return (
    date.getFullYear() === today.getFullYear() &&
    date.getMonth() === today.getMonth() &&
    date.getDate() === today.getDate()
  );
};

const selectDate = (date: Date) => {
  selectedDate.value = date;
};

const preloadImportantDetails = async (year: number, month: number) => {
  const prefix = `${year}-${String(month + 1).padStart(2, '0')}`;
  const isos = Array.from(importantDateSet.value).filter((iso) => iso.startsWith(prefix));
  const results = await Promise.all(isos.map((iso) => fetchDiaryDetail(iso)));
  const updates: Record<string, DiaryEntryDetail | null> = {};
  isos.forEach((iso, i) => {
    updates[iso] = results[i];
  });
  detailCache.value = { ...detailCache.value, ...updates };
};

const loadSummaries = async (date: Date) => {
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  scheduleMonthOverlay();
  isMonthLoading.value = true;
  monthError.value = null;
  try {
    const summaries = await fetchDiarySummaries(year, month);
    const map: Record<string, DiaryEntrySummary> = {};
    summaries.forEach((s) => {
      map[s.entryDate] = s;
    });
    summaryByDate.value = map;
    void preloadImportantDetails(date.getFullYear(), date.getMonth());
  } catch {
    monthError.value = '加载失败，请稍后重试。';
  } finally {
    cancelMonthOverlayTimer();
    showMonthOverlay.value = false;
    isMonthLoading.value = false;
  }
};

let currentDetailRequest: string | null = null;

const ensureDetailLoaded = async (date: Date) => {
  const iso = toIsoDate(date);
  if (iso in detailCache.value) return;

  currentDetailRequest = iso;
  scheduleDetailOverlay();
  isDetailLoading.value = true;
  detailError.value = null;
  try {
    const detail = await fetchDiaryDetail(iso);
    if (currentDetailRequest === iso) {
      detailCache.value = { ...detailCache.value, [iso]: detail };
    }
  } catch {
    if (currentDetailRequest === iso) {
      detailError.value = '加载失败，请稍后重试。';
    }
  } finally {
    if (currentDetailRequest === iso) {
      cancelDetailOverlayTimer();
      showDetailOverlay.value = false;
      isDetailLoading.value = false;
      currentDetailRequest = null;
    }
  }
};

onBeforeUnmount(() => {
  cancelDetailOverlayTimer();
  cancelMonthOverlayTimer();
});

const syncViewMonth = (date: Date) => {
  const monthStart = new Date(date.getFullYear(), date.getMonth(), 1);
  const current = viewMonth.value;
  if (current.getFullYear() !== monthStart.getFullYear() || current.getMonth() !== monthStart.getMonth()) {
    viewMonth.value = monthStart;
  }
};

watch(viewMonth, (date) => {
  void loadSummaries(date);
}, { immediate: true });

watch(selectedDate, (date) => {
  syncViewMonth(date);
  void ensureDetailLoaded(date);
}, { immediate: true });

const prevMonth = () => {
  if (isMonthLoading.value) return;
  const base = viewMonth.value;
  viewMonth.value = new Date(base.getFullYear(), base.getMonth() - 1, 1);
};

const nextMonth = () => {
  if (isMonthLoading.value) return;
  const base = viewMonth.value;
  viewMonth.value = new Date(base.getFullYear(), base.getMonth() + 1, 1);
};
</script>

<style scoped>
.notes-page {
  width: 100%;
}

/* 外层：左侧小记栏 + 右侧主体 */
.notes-layout {
  display: grid;
  grid-template-columns: 1fr;
  padding-left: calc(300px + 1.5rem);
  align-items: start;
}

/* ══════════════════════════════════════════════════
   左侧小记栏
   ══════════════════════════════════════════════════ */
.notes-sidebar {
  position: fixed;
  top: 80px;
  left: 0;
  width: 300px;
  height: calc(100vh - 80px);
  z-index: 10;
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
  padding-top: 1.5rem;
  padding-left: 1rem;  
  padding-right: 1.25rem;
  border-right: 1px solid var(--public-border);
  background: var(--public-bg);
}

.sidebar-header {
  padding-bottom: 0.85rem;
  border-bottom: 1px solid var(--public-border);
  flex-shrink: 0;
}

.sidebar-header h1 {
  font-size: 1.6rem;
  margin-bottom: 0.25rem;
  color: var(--public-text);
}

.subtitle {
  color: var(--public-text-secondary);
  margin: 0;
  font-size: 0.85rem;
}

.important-section {
  background: var(--public-surface);
  border-radius: var(--public-radius-lg);
  padding: 1.1rem;
  border: 1px solid var(--public-border);
  box-shadow: 0 1px 3px var(--public-shadow);
  overflow-y: auto;
  flex: 1;
  min-height: 0;
}

.important-section__title {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--public-text);
  margin-bottom: 0.85rem;
  padding-bottom: 0.65rem;
  border-bottom: 1px solid var(--public-border);
}

.important-section__icon {
  font-size: 0.9rem;
}

.important-empty {
  text-align: center;
  padding: 1.5rem 0.5rem;
  color: var(--public-text-muted);
  font-size: 0.8rem;
  line-height: 1.7;
}

.important-empty__star {
  color: #f59e0b;
  font-size: 1rem;
}

.important-list {
  display: flex;
  flex-direction: column;
  gap: 0.7rem;
  padding-right: 0.2rem;
}

.important-card {
  width: 100%;
  display: flex;
  align-items: stretch;
  gap: 0.75rem;
  padding: 0.85rem 0.9rem;
  border: 1px solid var(--public-border);
  background: var(--public-surface);
  border-radius: 0.6rem;
  cursor: pointer;
  text-align: left;
  position: relative;
  transition: transform 0.16s ease, box-shadow 0.16s ease, border-color 0.16s ease, background 0.16s ease;
}

.important-card:hover {
  border-color: var(--public-accent);
  transform: translateY(-1px);
  box-shadow: 0 4px 12px var(--public-shadow-hover);
}

.important-card--active {
  border-color: var(--public-accent);
  background: rgba(37, 99, 235, 0.06);
  box-shadow: 0 2px 8px rgba(37, 99, 235, 0.12);
}

.important-card__date {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  min-width: 3.2rem;
  font-weight: 600;
  color: var(--public-accent);
}

.important-card__day {
  font-size: 1.3rem;
  line-height: 1;
}

.important-card__weekday {
  font-size: 0.85rem;
  opacity: 0.75;
  margin-top: 0.25rem;
}

.important-card__body {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  min-width: 0;
}

.important-card__mood {
  font-size: 0.95rem;
  color: var(--public-text-secondary);
  font-weight: 500;
}

.important-card__plans {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
}

.important-card__plans li {
  font-size: 0.9rem;
  color: var(--public-text-muted);
  padding-left: 0.75rem;
  position: relative;
  line-height: 1.4;
}

.important-card__plans li::before {
  content: '·';
  position: absolute;
  left: 0.15rem;
  color: var(--public-accent);
  font-weight: 600;
}

.important-card__remove {
  position: absolute;
  top: 4px;
  right: 4px;
  width: 1.3rem;
  height: 1.3rem;
  border: none;
  background: transparent;
  color: var(--public-text-muted);
  font-size: 0.7rem;
  cursor: pointer;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: opacity 0.15s ease, background 0.15s ease, color 0.15s ease;
}

.important-card:hover .important-card__remove {
  opacity: 1;
}

.important-card__remove:hover {
  background: rgba(214, 69, 98, 0.12);
  color: #d64562;
}

/* ══════════════════════════════════════════════════
   右侧主体：日历 + 日记详情 水平并排
   ══════════════════════════════════════════════════ */
.notes-main {
  display: grid;
  /* 第 667 行，.notes-main 中 */
  grid-template-columns: minmax(360px, 1.6fr) minmax(240px, 1fr);
  gap: 1.25rem;
  align-items: start;
  min-width: 0;
}

/* ── 日历面板 ── */
.calendar-panel {
  background: var(--public-surface);
  border-radius: var(--public-radius-lg);
  padding: 1.25rem;
  border: 1px solid var(--public-border);
  box-shadow: 0 1px 3px var(--public-shadow);
  position: sticky;
  top: 1.5rem;
}

.calendar-panel--loading .calendar-grid {
  opacity: 0.55;
  pointer-events: none;
}

.calendar-panel__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 1rem;
  padding-bottom: 0.75rem;
  border-bottom: 1px solid var(--public-border);
}

.calendar-panel__icon {
  font-size: 1.35rem;
  margin: 0;
  color: var(--public-text);
}

.calendar-panel__controls {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  font-weight: 600;
  color: var(--public-text);
}

.calendar-panel__controls button {
  border: 1px solid var(--public-border);
  background: var(--public-surface);
  width: 2.4rem;
  height: 2.4rem;
  border-radius: 999px;
  font-size: 0.95rem;
  cursor: pointer;
  color: var(--public-text);
  transition: background 0.16s ease, transform 0.16s ease, border-color 0.16s ease;
}

.calendar-panel__controls button:hover {
  background: var(--public-border-light);
  border-color: var(--public-accent);
  transform: translateY(-1px);
}

.calendar-panel__month {
  min-width: 9rem;
  text-align: center;
  font-size: 1.1rem;
  font-weight: 600;
}

.calendar-hint {
  margin: 0 0 0.75rem;
  font-size: 0.85rem;
  color: var(--public-text-secondary);
}

.calendar-hint--error {
  color: #d64562;
}

/* 日历格子 */
.calendar-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 0.4rem;
}

.weekday {
  text-align: center;
  font-size: 0.72rem;
  text-transform: uppercase;
  color: var(--public-text-muted);
  padding-bottom: 0.55rem;
  border-bottom: 2px solid var(--public-border);
  margin-bottom: 0.3rem;
  font-weight: 600;
  letter-spacing: 0.04em;
}

.calendar-cell {
  aspect-ratio: 1;   
  min-height: 2.5rem;
  border: 1px solid var(--public-border);
  border-radius: 0.65rem;
  background: var(--public-surface);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.35rem;
  cursor: pointer;
  transition: transform 0.16s ease, background 0.16s ease, border-color 0.16s ease, box-shadow 0.16s ease;
  padding: 0.2rem 0.15rem;
  color: var(--public-text);
  position: relative;
}

.calendar-cell:hover {
  border-color: var(--public-accent);
  background: rgba(37, 99, 235, 0.04);
  transform: translateY(-2px);
  box-shadow: 0 3px 10px var(--public-shadow);
}

.calendar-cell--active {
  background: var(--public-accent);
  border-color: var(--public-accent);
  color: #fff;
  box-shadow: 0 2px 8px rgba(37, 99, 235, 0.3);
}

.calendar-cell--active .calendar-cell__mood {
  color: rgba(255, 255, 255, 0.85);
}

.calendar-cell--outside {
  opacity: 0.25;
  pointer-events: none;
}

.calendar-cell--today {
  box-shadow: inset 0 0 0 2px var(--public-accent);
  font-weight: 700;
}

.calendar-cell--active.calendar-cell--today {
  box-shadow: inset 0 0 0 2px rgba(255, 255, 255, 0.5), 0 2px 8px rgba(37, 99, 235, 0.3);
}

.calendar-cell--important {
  border-color: #f59e0b;
  border-width: 1.5px;
}

.calendar-cell--active.calendar-cell--important {
  border-color: rgba(255, 255, 255, 0.5);
}

.calendar-cell__star {
  position: absolute;
  top: 2px;
  right: 4px;
  font-size: 0.6rem;
  color: #f59e0b;
  line-height: 1;
  pointer-events: none;
}

.calendar-cell__day {
  font-weight: 600;
  font-size: 1.55rem;
  line-height: 1;
}

.calendar-cell__mood {
  font-size: 1.05rem;
  color: var(--public-text-muted);
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  text-align: center;
  line-height: 1.1;
  min-height: 0.85rem;
}

/* ── 详情面板 ── */
.detail-panel {
  background: var(--public-surface);
  border-radius: var(--public-radius-lg);
  padding: 1.5rem;
  border: 1px solid var(--public-border);
  box-shadow: 0 1px 3px var(--public-shadow);
}

.detail-panel__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 1.25rem;
  padding-bottom: 0.75rem;
  border-bottom: 1px solid var(--public-border);
}

.detail-panel__header h3 {
  font-size: 1.15rem;
  margin: 0;
  color: var(--public-text);
  flex-shrink: 0;
}

.detail-panel__header-scores {
  display: flex;
  gap: 0.6rem;
  align-items: center;
}

.detail-panel__body {
  position: relative;
}

.detail-panel__body--loading .diary-content {
  opacity: 0.55;
}

.detail-loader {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--public-surface);
  border-radius: var(--public-radius-md);
  color: var(--public-text-secondary);
  font-size: 0.9rem;
  z-index: 1;
}

.feedback {
  margin: 0 0 1rem;
  padding: 0.5rem 0.75rem;
  border-radius: var(--public-radius-sm);
  font-size: 0.85rem;
}

.feedback--error {
  background: rgba(214, 69, 98, 0.1);
  color: #d64562;
}

.diary-content {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.diary-field {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.diary-field__label {
  font-size: 0.95rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--public-text-muted);
}

.diary-field__value {
  font-size: 1.35rem;
  color: var(--public-text);
  margin: 0;
}

.diary-field__content {
  font-size: 1.35rem;
  color: var(--public-text);
  line-height: 1.8;
  margin: 0;
  white-space: pre-wrap;
}

/* 评分展示 */
.score-display {
  display: flex;
  gap: 0.6rem;
}

.score-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.15rem;
}

.score-item__label {
  font-size: 0.6rem;
  font-weight: 600;
  line-height: 1;
}

.score-item__dots {
  display: flex;
  gap: 0.08rem;
}

.score-dot {
  width: 0.35rem;
  height: 0.35rem;
  border-radius: 50%;
  border: 1px solid var(--public-border);
  background: transparent;
}

.score-dot--active {
  border-color: transparent;
}

/* 计划列表 */
.plans-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.plans-list__item {
  font-size: 1.3rem;
  color: var(--public-text-secondary);
  padding-left: 1rem;
  position: relative;
}

.plans-list__item::before {
  content: '·';
  position: absolute;
  left: 0.25rem;
  color: var(--public-accent);
  font-weight: 600;
}

/* 空状态 */
.detail-empty {
  text-align: center;
  padding: 2rem 0;
  color: var(--public-text-muted);
  font-size: 0.9rem;
}

.detail-empty p {
  margin: 0;
}

/* ── 响应式 ── */
@media (max-width: 960px) {
  .notes-layout {
    grid-template-columns: 1fr;
    padding-left: 0;
  }

  .notes-sidebar {
    position: static;
    width: auto;
    height: auto;
  }

  .sidebar-header h1 {
    font-size: 1.3rem;
  }

  .notes-main {
    grid-template-columns: 1fr;
  }

  .calendar-panel {
    position: static;
  }
}
</style>
