<template>
  <div class="diary-calendar">
    <section
      class="calendar"
      :class="{ 'calendar--loading': showMonthOverlay, 'calendar--locked': isMonthLoading }"
    >
      <header>
        <h3 style="margin-left: 20px;">📅</h3>
        <div class="controls">
          <button type="button" @click="prevMonth" aria-label="上一个月">◀</button>
          <span>{{ monthLabel }}</span>
          <button type="button" @click="nextMonth" aria-label="下一个月">▶</button>
        </div>
      </header>
      <p v-if="showMonthOverlay" class="calendar-hint">正在加载当月日记...</p>
      <p v-else-if="monthError" class="calendar-hint calendar-hint--error">{{ monthError }}</p>
      <div class="grid">
        <div class="weekday" v-for="day in weekdays" :key="day">{{ day }}</div>
        <button
          v-for="cell in calendarCells"
          :key="cell.iso"
          type="button"
          class="cell"
          :aria-pressed="isSelected(cell.date)"
          :class="[
            { active: isSelected(cell.date) },
            {
              'cell--outside': !cell.inCurrentMonth,
              'cell--today': isToday(cell.date),
              'cell--search-hit': cell.matched
            }
          ]"
          @click="selectDate(cell.date)"
        >
          <span class="cell-day">{{ cell.label }}</span>
          <span class="cell-mood">{{ cell.mood || '\u00A0' }}</span>
        </button>
      </div>
    </section>

    <aside
      v-if="showSearchPanel"
      class="diary-search"
      :aria-busy="isSearchLoading"
      aria-live="polite"
    >
      <header>
        <div>
          <h3>检索结果</h3>
          <p class="diary-search__hint">
            “{{ searchKeyword }}” 命中 {{ searchResults.length }} 天
          </p>
        </div>
        <button type="button" class="diary-search__clear" @click="clearSearch">清除</button>
      </header>
      <p v-if="isSearchLoading" class="diary-search__status">正在检索相关日记…</p>
      <p v-else-if="searchError" class="diary-search__status diary-search__status--error">{{ searchError }}</p>
      <p v-else-if="!searchResults.length" class="diary-search__status">暂无匹配的日记。</p>
      <ul v-else class="diary-search__list">
        <li v-for="card in searchCards" :key="card.iso">
          <button type="button" class="diary-search__card" @click="jumpToDate(card.iso)">
            <div class="diary-search__card-date">
              <span class="diary-search__card-day">{{ card.day }}</span>
              <span class="diary-search__card-weekday">{{ card.weekday }}</span>
            </div>
            <div class="diary-search__card-content">
              <div class="diary-search__card-meta">
                <span class="diary-search__card-label">{{ card.label }}</span>
                <span v-if="card.mood" class="diary-search__mood">{{ card.mood }}</span>
              </div>
              <p class="diary-search__snippet">
                <template v-for="(segment, index) in card.snippet" :key="index">
                  <mark v-if="segment.matched">{{ segment.text }}</mark>
                  <span v-else>{{ segment.text }}</span>
                </template>
              </p>
            </div>
          </button>
        </li>
      </ul>
    </aside>

    <section class="diary-detail">
      <header>
        <div>
          <h3>{{ detailTitle }}</h3>
        </div>
        <div class="detail-actions">
          <div class="score-header">
            <div v-for="dim in DEFAULT_DIMENSIONS" :key="dim" class="score-header-item">
              <span class="score-header-label" :style="{ color: DIMENSION_COLORS[dim] }">{{ dim }}</span>
              <div class="score-header-dots">
                <button
                  v-for="n in 5"
                  :key="n"
                  type="button"
                  class="score-header-dot"
                  :class="{ 'is-active': n <= (form.scores[dim] ?? 0) }"
                  :style="n <= (form.scores[dim] ?? 0) ? { background: DIMENSION_COLORS[dim], borderColor: DIMENSION_COLORS[dim] } : {}"
                  :disabled="isFormDisabled"
                  @click="form.scores[dim] = n === (form.scores[dim] ?? 0) ? 0 : n"
                />
              </div>
            </div>
          </div>
          <button
            v-if="isFormDirty"
            type="button"
            class="ghost"
            @click="resetForm"
            :disabled="isDetailLoading || isSaving"
          >
            重置
          </button>
        </div>
      </header>

      <div
        class="diary-detail__body"
        :class="{ 'diary-detail__body--loading': showDetailOverlay }"
      >
        <div
          v-show="showDetailOverlay"
          class="diary-detail__loader detail-state"
          role="status"
          aria-live="polite"
          aria-hidden="false"
        >
          正在加载该日的日记...
        </div>
        <p v-if="detailError" class="inline-feedback inline-feedback--error">{{ detailError }}</p>
        <p v-if="detailSuccess" class="inline-feedback inline-feedback--success">{{ detailSuccess }}</p>
        <form class="diary-form" :aria-busy="isDetailLoading" @submit.prevent="handleSave">
          <label class="form-group">
            <span>情绪标记</span>
            <input
              v-model="form.mood"
              type="text"
              maxlength="64"
              placeholder="如：🌤️ 活力焕发"
              :disabled="isFormDisabled"
            />
          </label>

          <label class="form-group">
            <span>今日计划</span>
            <textarea
              v-model="form.plansText"
              rows="3"
              placeholder="每行填写一条计划，例如：完成用户访谈"
              :disabled="isFormDisabled"
            ></textarea>
            <!-- <small>留空表示今天没有安排计划。</small> -->
          </label>

          <label class="form-group">
            <span>日记正文</span>
            <textarea
              v-model="form.content"
              rows="6"
              placeholder="记录今天的灵感与感受..."
              required
              :disabled="isFormDisabled"
            ></textarea>
          </label>

          <div class="form-actions">
            <span class="form-hint" v-if="!hasExistingEntry">首次保存将创建新的日记。</span>
            <button
              class="primary"
              type="submit"
              :disabled="isDetailLoading || isSaving || !isFormValid || !isFormDirty"
            >
              {{ hasExistingEntry ? '保存更新' : '立即记录' }}
            </button>
          </div>
        </form>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, reactive, ref, watch } from 'vue';
import { useRoute, useRouter, type LocationQueryRaw } from 'vue-router';
import { storeToRefs } from 'pinia';
import {
  fetchDiaryDetail,
  fetchDiarySummaries,
  upsertDiaryEntry,
  type DiaryEntryDetail,
  type DiaryEntrySummary
} from '@/services/diaryService';
import { useDiarySearchStore } from '@/stores/diarySearch';

const route = useRoute();
const router = useRouter();
const diarySearchStore = useDiarySearchStore();
const { keyword: searchKeyword, results: searchResults, isLoading: isSearchLoading, error: searchError } =
  storeToRefs(diarySearchStore);

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
const detailSuccess = ref<string | null>(null);
const isSaving = ref(false);

const showDetailOverlay = ref(false);
let detailOverlayTimer: ReturnType<typeof setTimeout> | null = null;
const DETAIL_OVERLAY_DELAY = 160;

const showMonthOverlay = ref(false);
let monthOverlayTimer: ReturnType<typeof setTimeout> | null = null;
const MONTH_OVERLAY_DELAY = 160;

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

const hexToRgb = (hex: string) => {
  const n = parseInt(hex.replace('#', ''), 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
};

const blendScores = (scores: Record<string, number>) => {
  let total = 0;
  let r = 0, g = 0, b = 0;
  DEFAULT_DIMENSIONS.forEach((dim) => {
    const s = scores[dim] ?? 0;
    if (s > 0) {
      const col = hexToRgb(DIMENSION_COLORS[dim]);
      r += col.r * s;
      g += col.g * s;
      b += col.b * s;
      total += s;
    }
  });
  if (total === 0) return null;
  const avg = (n: number) => Math.round(n / total);
  return `rgb(${avg(r)}, ${avg(g)}, ${avg(b)})`;
};

const avgScore = (scores: Record<string, number>) => {
  const sum = DEFAULT_DIMENSIONS.reduce((acc, d) => acc + (scores[d] ?? 0), 0);
  return sum / DEFAULT_DIMENSIONS.length;
};

const form = reactive({
  mood: '',
  plansText: '',
  content: '',
  scores: {} as Record<string, number>
});

const initScores = (): Record<string, number> =>
  Object.fromEntries(DEFAULT_DIMENSIONS.map((d) => [d, 0]));

const selectedIso = computed(() => toIsoDate(selectedDate.value));

const selectedEntry = computed(() => detailCache.value[selectedIso.value] ?? null);
const hasExistingEntry = computed(() => selectedEntry.value !== null);

const splitPlans = (text: string) =>
  text
    .split(/\r?\n/)
    .map((item) => item.trim())
    .filter((item) => item.length > 0);

const hydrateForm = (detail: DiaryEntryDetail | null) => {
  form.mood = detail?.mood ?? '';
  form.plansText = detail ? detail.plans.join('\n') : '';
  form.content = detail?.content ?? '';
  form.scores = { ...initScores(), ...(detail?.scores ?? {}) };
};

const isFormValid = computed(() => form.content.trim().length > 0);

const scoresEqual = (a: Record<string, number>, b: Record<string, number>) => {
  const keysA = Object.keys(a);
  const keysB = Object.keys(b);
  if (keysA.length !== keysB.length) return false;
  return keysA.every((k) => a[k] === b[k]);
};

const isFormDirty = computed(() => {
  const iso = selectedIso.value;
  const original = detailCache.value[iso];
  const trimmedMood = form.mood.trim();
  const trimmedContent = form.content.trim();
  const normalizedPlans = splitPlans(form.plansText).join('\n');
  const currentScores = form.scores;

  if (!original) {
    return Boolean(trimmedMood || trimmedContent || normalizedPlans || Object.values(currentScores).some((v) => v > 0));
  }

  return (
    (original.mood ?? '') !== trimmedMood ||
    original.content !== trimmedContent ||
    original.plans.join('\n') !== normalizedPlans ||
    !scoresEqual(original.scores ?? {}, currentScores)
  );
});

const isFormDisabled = computed(() => isDetailLoading.value || isSaving.value);

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
      const day = daysInPrevMonth - (startOffset - index - 1);
      cellDate = new Date(year, month - 1, day);
      inCurrentMonth = false;
    } else if (index >= startOffset + daysInMonth) {
      const day = index - (startOffset + daysInMonth) + 1;
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
      hasEntry: Boolean(summary?.hasContent || summary?.hasPlans),
      matched: searchMatchedSet.value.has(iso),
      mood: summary?.mood ?? null,
      scores: summary?.scores ?? {}
    };
  });
});

const detailTitle = computed(() => {
  const date = selectedDate.value;
  const formatter = new Intl.DateTimeFormat('zh-CN', {
    month: 'long',
    day: 'numeric',
    weekday: 'long'
  });
  return formatter.format(date);
});

const isSelected = (cellDate: Date) => {
  const current = selectedDate.value;
  return (
    current.getFullYear() === cellDate.getFullYear() &&
    current.getMonth() === cellDate.getMonth() &&
    current.getDate() === cellDate.getDate()
  );
};

const isToday = (cellDate: Date) => {
  const today = new Date();
  return (
    today.getFullYear() === cellDate.getFullYear() &&
    today.getMonth() === cellDate.getMonth() &&
    today.getDate() === cellDate.getDate()
  );
};

const selectDate = (date: Date) => {
  selectedDate.value = new Date(date.getFullYear(), date.getMonth(), date.getDate());
};

let currentMonthRequest = 0;

const loadSummaries = async (target: Date) => {
  const requestId = ++currentMonthRequest;
  isMonthLoading.value = true;
  monthError.value = null;
  scheduleMonthOverlay();

  try {
    const data = await fetchDiarySummaries(target.getFullYear(), target.getMonth() + 1);
    if (currentMonthRequest !== requestId) {
      return;
    }

    summaryByDate.value = data.reduce<Record<string, DiaryEntrySummary>>((acc, item) => {
      acc[item.entryDate] = item;
      return acc;
    }, {});
  } catch (error) {
    if (currentMonthRequest === requestId) {
      monthError.value = '无法加载该月的日记，请稍后重试。';
    }
    console.error('[DiaryCalendar] loadSummaries', error);
  } finally {
    if (currentMonthRequest === requestId) {
      cancelMonthOverlayTimer();
      showMonthOverlay.value = false;
      isMonthLoading.value = false;
    }
  }
};

let currentDetailRequest: string | null = null;

const ensureDetailLoaded = async (date: Date) => {
  const iso = toIsoDate(date);
  const cached = detailCache.value[iso];

  if (cached !== undefined) {
    hydrateForm(cached);
    return;
  }

  currentDetailRequest = iso;
  isDetailLoading.value = true;
  detailError.value = null;
  try {
    const detail = await fetchDiaryDetail(iso);
    if (currentDetailRequest !== iso) {
      return;
    }

    detailCache.value = { ...detailCache.value, [iso]: detail };
    hydrateForm(detail);
  } catch (error) {
    if (currentDetailRequest !== iso) {
      return;
    }

    detailError.value = '加载日记详情失败，请稍后重试。';
    console.error('[DiaryCalendar] ensureDetailLoaded', error);
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
  detailSuccess.value = null;
  syncViewMonth(date);
  void ensureDetailLoaded(date);
}, { immediate: true });

const prevMonth = () => {
  if (isMonthLoading.value) {
    return;
  }
  const base = viewMonth.value;
  viewMonth.value = new Date(base.getFullYear(), base.getMonth() - 1, 1);
};

const nextMonth = () => {
  if (isMonthLoading.value) {
    return;
  }
  const base = viewMonth.value;
  viewMonth.value = new Date(base.getFullYear(), base.getMonth() + 1, 1);
};

const refreshSummaryForIso = (iso: string, detail: DiaryEntryDetail | null) => {
  const summary = detail
    ? {
        entryDate: iso,
        mood: detail.mood ?? null,
        hasContent: detail.content.trim().length > 0,
        hasPlans: detail.plans.length > 0,
        scores: detail.scores ?? {}
      }
    : undefined;

  if (summary) {
    summaryByDate.value = { ...summaryByDate.value, [iso]: summary };
  } else if (summaryByDate.value[iso]) {
    const { [iso]: _removed, ...rest } = summaryByDate.value;
    summaryByDate.value = rest;
  }
};

const handleSave = async () => {
  const trimmedContent = form.content.trim();
  if (!trimmedContent) {
    detailError.value = '请填写日记正文后再保存。';
    return;
  }

  isSaving.value = true;
  detailError.value = null;
  detailSuccess.value = null;

  const iso = selectedIso.value;
  const payload = {
    entryDate: iso,
    mood: form.mood.trim() ? form.mood.trim() : null,
    plans: splitPlans(form.plansText),
    content: trimmedContent,
    scores: form.scores
  };

  try {
    const detail = await upsertDiaryEntry(payload);
    detailCache.value = { ...detailCache.value, [iso]: detail };
    hydrateForm(detail);
    refreshSummaryForIso(iso, detail);
    detailSuccess.value = '已保存日记。';
  } catch (error) {
    detailError.value = '保存失败，请稍后重试。';
    console.error('[DiaryCalendar] handleSave', error);
  } finally {
    isSaving.value = false;
  }
};

const resetForm = () => {
  const iso = selectedIso.value;
  const original = detailCache.value[iso] ?? null;
  hydrateForm(original);
  detailError.value = null;
  detailSuccess.value = null;
};

type HighlightSegment = {
  text: string;
  matched: boolean;
};

type SearchCard = {
  iso: string;
  day: string;
  weekday: string;
  label: string;
  mood: string | null;
  snippet: HighlightSegment[];
};

const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const formatDateLabel = (iso: string) => {
  const date = new Date(iso);
  const day = new Intl.DateTimeFormat('zh-CN', { month: 'numeric', day: 'numeric' }).format(date);
  const weekday = new Intl.DateTimeFormat('zh-CN', { weekday: 'short' }).format(date);
  return { day, weekday };
};

const createSnippet = (text: string, keywordValue: string) => {
  const normalized = text.replace(/\s+/g, ' ').trim();
  if (!normalized) {
    return '';
  }

  if (!keywordValue) {
    return normalized.length > 140 ? `${normalized.slice(0, 140)}…` : normalized;
  }

  const lowerText = normalized.toLowerCase();
  const lowerKeyword = keywordValue.toLowerCase();
  const index = lowerText.indexOf(lowerKeyword);

  if (index === -1) {
    return normalized.length > 140 ? `${normalized.slice(0, 140)}…` : normalized;
  }

  const start = Math.max(0, index - 40);
  const end = Math.min(normalized.length, index + keywordValue.length + 80);
  const prefix = start > 0 ? '…' : '';
  const suffix = end < normalized.length ? '…' : '';
  return `${prefix}${normalized.slice(start, end)}${suffix}`;
};

const buildSegments = (snippet: string, keywordValue: string): HighlightSegment[] => {
  if (!snippet) {
    return [];
  }

  if (!keywordValue) {
    return [{ text: snippet, matched: false }];
  }

  const regex = new RegExp(escapeRegExp(keywordValue), 'gi');
  const segments: HighlightSegment[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(snippet)) !== null) {
    if (match.index > lastIndex) {
      segments.push({ text: snippet.slice(lastIndex, match.index), matched: false });
    }
    segments.push({ text: match[0], matched: true });
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < snippet.length) {
    segments.push({ text: snippet.slice(lastIndex), matched: false });
  }

  return segments;
};

const searchMatchedSet = computed(() => new Set(searchResults.value.map((entry) => entry.entryDate)));

const pickSnippetSource = (entry: DiaryEntryDetail, keywordValue: string) => {
  const mood = entry.mood?.trim() ?? '';
  const plans = entry.plans.join('；');
  const content = entry.content ?? '';
  const keywordLower = keywordValue.toLowerCase();

  if (keywordValue) {
    if (mood && mood.toLowerCase().includes(keywordLower)) {
      return { label: '情绪', source: mood };
    }
    if (plans && plans.toLowerCase().includes(keywordLower)) {
      return { label: '计划', source: plans };
    }
    if (content.toLowerCase().includes(keywordLower)) {
      return { label: '正文', source: content };
    }
  }

  if (content) {
    return { label: '正文', source: content };
  }
  if (plans) {
    return { label: '计划', source: plans };
  }
  if (mood) {
    return { label: '情绪', source: mood };
  }

  return { label: '正文', source: '' };
};

const searchCards = computed<SearchCard[]>(() => {
  const keywordValue = searchKeyword.value.trim();

  return searchResults.value.map((entry) => {
    const { day, weekday } = formatDateLabel(entry.entryDate);
    const snippetSource = pickSnippetSource(entry, keywordValue);
    const snippetText = createSnippet(snippetSource.source, keywordValue);

    return {
      iso: entry.entryDate,
      day,
      weekday,
      label: snippetSource.label,
      mood: entry.mood ?? null,
      snippet: buildSegments(snippetText, keywordValue)
    };
  });
});

const showSearchPanel = computed(() => searchKeyword.value.trim().length > 0);

const clearSearch = async () => {
  diarySearchStore.clear();
  const nextQuery: LocationQueryRaw = { ...route.query };
  delete nextQuery.search;
  await router.replace({ name: 'diary', query: nextQuery }).catch(() => {
    /* noop */
  });
};

const jumpToDate = (iso: string) => {
  const [year, month, day] = iso.split('-').map((part) => Number.parseInt(part, 10));
  if (Number.isNaN(year) || Number.isNaN(month) || Number.isNaN(day)) {
    return;
  }

  const target = new Date(year, month - 1, day);
  selectDate(target);
  viewMonth.value = new Date(target.getFullYear(), target.getMonth(), 1);
};

watch(
  () => route.query.search,
  async (value) => {
    if (typeof value === 'string' && value.trim()) {
      await diarySearchStore.search(value);
    } else {
      diarySearchStore.clear();
    }
  },
  { immediate: true }
);
</script>

<style scoped>
.diary-calendar {
  display: grid;
  grid-template-columns: minmax(0, 1.35fr) minmax(0, 1fr);
  gap: 1.5rem;
  height: 100%;
}

.calendar,
.diary-detail,
.diary-search {
  background: var(--surface-card);
  border-radius: 1.5rem;
  padding: 1.75rem;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  box-shadow: 0 16px 36px rgba(55, 64, 120, 0.08);
}

.calendar {
  grid-column: 1;
  grid-row: 1 / span 2;
  position: relative;
}

.calendar--loading .grid {
  opacity: 0.55;
  transition: opacity 160ms ease;
}

.calendar--loading .cell {
  pointer-events: none;
}

.diary-search {
  grid-column: 2;
  grid-row: 1;
  gap: 1rem;
}

.diary-detail {
  grid-column: 2;
  grid-row: auto;
}

.calendar header,
.diary-detail header,
.diary-search header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  color: var(--text-secondary);
}

.controls {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  font-weight: 600;
}

.controls button {
  border: none;
  background: var(--surface-pill);
  width: 2.3rem;
  height: 2.3rem;
  border-radius: 999px;
  font-size: 1rem;
  cursor: pointer;
  transition: background 160ms ease, transform 160ms ease, opacity 160ms ease;
}

.controls button:disabled {
  cursor: not-allowed;
  opacity: 1;
  pointer-events: none;
}

.controls button:not(:disabled):hover {
  background: rgba(76, 93, 240, 0.18);
  transform: translateY(-1px);
}

.calendar--loading .controls button,
.calendar--locked .controls button {
  opacity: 0.45;
  pointer-events: none;
}

.grid {
  display: grid;
  grid-template-columns: repeat(7, minmax(2.8rem, 1fr));
  gap: 0.6rem;
}

.weekday {
  text-align: center;
  font-size: 0.75rem;
  text-transform: uppercase;
  color: var(--text-secondary);
}

.calendar-hint {
  margin: 0;
  font-size: 0.85rem;
  color: var(--text-secondary);
}

.calendar-hint--error {
  color: #d64562;
}

.cell {
  aspect-ratio: 1;
  border: 1px solid transparent;
  border-radius: 1rem;
  background:
    linear-gradient(150deg, rgba(255, 255, 255, 0.96), rgba(244, 247, 255, 0.92)) padding-box,
    linear-gradient(150deg, rgba(94, 110, 192, 0.18), rgba(164, 178, 255, 0.12)) border-box;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  cursor: pointer;
  position: relative;
  transition: transform 160ms ease, background 160ms ease, box-shadow 160ms ease;
  padding: 0.35rem 0.25rem 0.25rem;
  overflow: hidden;
  box-shadow: 0 8px 18px rgba(71, 84, 153, 0.08);
}

.cell-day {
  font-weight: 600;
  font-size: 1.35rem;
  line-height: 1;
}

.cell:not(.active):hover {
  background:
    linear-gradient(145deg, rgba(250, 252, 255, 0.98), rgba(226, 233, 255, 0.92)) padding-box,
    linear-gradient(145deg, rgba(92, 110, 235, 0.28), rgba(128, 160, 255, 0.24)) border-box;
  transform: translateY(-2px);
  box-shadow: 0 14px 30px rgba(62, 78, 162, 0.18);
}

.cell.active:hover {
  transform: translateY(-2px);
  box-shadow: 0 16px 32px rgba(58, 72, 160, 0.24);
}

.cell.active {
  background:
    linear-gradient(145deg, rgba(138, 120, 230, 0.85), rgba(160, 140, 240, 0.8)) padding-box,
    linear-gradient(145deg, rgba(168, 150, 240, 0.3), rgba(190, 175, 245, 0.22)) border-box;
  color: #fff;
  box-shadow: 0 10px 24px rgba(128, 118, 210, 0.12);
}

.cell.active .cell-day {
  color: #fff;
}

.cell.active .cell-mood {
  color: rgba(255, 255, 255, 0.82);
}

.cell--outside {
  opacity: 0.35;
}

.cell--today {
  box-shadow: inset 0 0 0 2px rgba(76, 93, 240, 0.35);
}

.cell-mood {
  font-size: 0.75rem;
  font-weight: 500;
  color: var(--text-secondary);
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  padding: 0 0.15rem;
  text-align: center;
  line-height: 1.1;
  min-height: 0.85rem;
}

.cell--search-hit:not(.active) {
  box-shadow: inset 0 0 0 2px rgba(76, 175, 80, 0.4);
}

.cell--search-hit::before {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: 1rem;
  background: rgba(38, 222, 129, 0.12);
  opacity: 0;
  transition: opacity 160ms ease;
}

.cell--search-hit:hover::before,
.cell.active.cell--search-hit::before {
  opacity: 1;
}

.diary-search header {
  align-items: flex-start;
}

.diary-search__hint {
  margin: 0.25rem 0 0;
  font-size: 0.85rem;
  color: var(--text-secondary);
}

.diary-search__clear {
  border: none;
  background: rgba(221, 46, 68, 0.14);
  color: #dd2e44;
  padding: 0.45rem 1rem;
  border-radius: 0.85rem;
  font-weight: 600;
  cursor: pointer;
  transition: background 160ms ease, transform 160ms ease;
}

.diary-search__clear:hover {
  background: rgba(221, 46, 68, 0.22);
  transform: translateY(-1px);
}

.diary-search__status {
  margin: 0;
  font-size: 0.85rem;
  color: var(--text-secondary);
}

.diary-search__status--error {
  color: #d64562;
}

.diary-search__list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.85rem;
}

.diary-search__card {
  width: 100%;
  display: flex;
  align-items: stretch;
  gap: 1rem;
  padding: 0.95rem 1rem;
  border: none;
  background: rgba(76, 93, 240, 0.06);
  border-radius: 1.25rem;
  cursor: pointer;
  text-align: left;
  transition: transform 160ms ease, box-shadow 160ms ease, background 160ms ease;
}

.diary-search__card:hover {
  background: rgba(76, 93, 240, 0.12);
  transform: translateY(-2px);
  box-shadow: 0 12px 32px rgba(51, 68, 140, 0.18);
}

.diary-search__card-date {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  min-width: 4rem;
  font-weight: 600;
  color: #4c5df0;
}

.diary-search__card-day {
  font-size: 1.4rem;
  line-height: 1;
}

.diary-search__card-weekday {
  font-size: 0.8rem;
  opacity: 0.8;
  margin-top: 0.35rem;
}

.diary-search__card-content {
  display: flex;
  flex-direction: column;
  gap: 0.55rem;
}

.diary-search__card-meta {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  font-size: 0.85rem;
  color: var(--text-secondary);
}

.diary-search__card-label {
  display: inline-flex;
  align-items: center;
  padding: 0.15rem 0.5rem;
  border-radius: 999px;
  background: rgba(76, 93, 240, 0.18);
  color: #4c5df0;
  font-size: 0.7rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.diary-search__mood {
  padding: 0.15rem 0.5rem;
  border-radius: 999px;
  background: rgba(255, 209, 102, 0.24);
  color: #c88719;
  font-weight: 600;
  font-size: 0.8rem;
}

.diary-search__snippet {
  margin: 0;
  font-size: 0.9rem;
  color: var(--text-primary);
  line-height: 1.5;
}

.diary-search__snippet mark {
  background: rgba(76, 175, 80, 0.2);
  color: inherit;
  font-weight: 600;
}
.cell.active {
  background: linear-gradient(135deg, #4c5df0, #7a6bff);
  color: white;
}

.detail-actions {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.score-header {
  display: flex;
  align-items: center;
  gap: 0.6rem;
}

.score-header-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.15rem;
}

.score-header-label {
  font-size: 0.6rem;
  font-weight: 600;
  line-height: 1;
}

.score-header-dots {
  display: flex;
  gap: 0.08rem;
  align-items: center;
}

.score-header-dot {
  width: 0.35rem;
  height: 0.35rem;
  border-radius: 50%;
  border: 1px solid rgba(128, 128, 128, 0.25);
  background: transparent;
  cursor: pointer;
  transition: transform 120ms ease, background 120ms ease, border-color 120ms ease;
  padding: 0;
}

.score-header-dot:not(:disabled):hover {
  transform: scale(1.4);
}

.score-header-dot:disabled {
  cursor: not-allowed;
  opacity: 0.4;
}

.diary-detail__body {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  position: relative;
}

.diary-detail__body--loading .diary-form {
  opacity: 0.55;
}

.diary-detail__loader {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2rem 1rem;
  text-align: center;
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.82), rgba(245, 247, 255, 0.82));
  border-radius: 1.1rem;
  color: var(--text-secondary);
  font-weight: 500;
  z-index: 1;
  pointer-events: none;
}

.inline-feedback {
  margin: 0;
  padding: 0.6rem 0.85rem;
  border-radius: 0.75rem;
  font-size: 0.85rem;
}

.inline-feedback--error {
  background: rgba(235, 87, 87, 0.12);
  color: #d64562;
}

.inline-feedback--success {
  background: rgba(76, 175, 80, 0.14);
  color: #2f8f3a;
}

.detail-state {
  margin: 0;
  padding: 2rem 0;
  text-align: center;
  color: var(--text-secondary);
}

.diary-form {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
  transition: opacity 160ms ease;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.45rem;
}

.form-group span {
  font-size: 0.75rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--text-secondary);
}

.form-group input,
.form-group textarea {
  border: 1px solid var(--border-soft);
  background: rgba(255, 255, 255, 0.82);
  border-radius: 0.85rem;
  padding: 0.75rem 0.95rem;
  font-size: 0.95rem;
  color: inherit;
  resize: vertical;
  transition: border 160ms ease, box-shadow 160ms ease;
}

.form-group input:focus,
.form-group textarea:focus {
  outline: none;
  border-color: rgba(76, 93, 240, 0.45);
  box-shadow: 0 0 0 3px rgba(76, 93, 240, 0.12);
}

.form-group textarea {
  min-height: 6.5rem;
  line-height: 1.6;
}

.form-group small {
  font-size: 0.75rem;
  color: var(--text-secondary);
}

.form-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
}

.form-hint {
  font-size: 0.8rem;
  color: var(--text-secondary);
}

button.primary {
  border: none;
  background: linear-gradient(135deg, #4c5df0, #7a6bff);
  color: white;
  padding: 0.65rem 1.45rem;
  border-radius: 0.85rem;
  font-weight: 600;
  cursor: pointer;
  box-shadow: 0 14px 30px rgba(74, 94, 242, 0.28);
  transition: transform 160ms ease, box-shadow 160ms ease, opacity 160ms ease;
}

button.primary:hover {
  transform: translateY(-1px);
  box-shadow: 0 20px 36px rgba(74, 94, 242, 0.4);
}

button.primary:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  transform: none;
  box-shadow: none;
}

button.ghost {
  border: 1px solid rgba(76, 93, 240, 0.3);
  background: transparent;
  color: #4c5df0;
  padding: 0.55rem 1.2rem;
  border-radius: 0.85rem;
  font-weight: 600;
  cursor: pointer;
  transition: border 160ms ease, background 160ms ease, color 160ms ease, opacity 160ms ease;
}

button.ghost:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

button.ghost:not(:disabled):hover {
  background: rgba(76, 93, 240, 0.1);
}


@media (max-width: 1024px) {
  .diary-calendar {
    grid-template-columns: 1fr;
  }

  .calendar,
  .diary-detail,
  .diary-search {
    grid-column: 1;
    grid-row: auto;
  }

  .diary-search {
    order: 2;
  }
}
</style>
