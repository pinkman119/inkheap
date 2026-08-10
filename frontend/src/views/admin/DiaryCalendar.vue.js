import { computed, onBeforeUnmount, reactive, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { storeToRefs } from 'pinia';
import { fetchDiaryDetail, fetchDiarySummaries, upsertDiaryEntry } from '@/services/diaryService';
import { useDiarySearchStore } from '@/stores/diarySearch';
const route = useRoute();
const router = useRouter();
const diarySearchStore = useDiarySearchStore();
const { keyword: searchKeyword, results: searchResults, isLoading: isSearchLoading, error: searchError } = storeToRefs(diarySearchStore);
const weekdays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const initialSelected = new Date();
const viewMonth = ref(new Date(initialSelected.getFullYear(), initialSelected.getMonth(), 1));
const selectedDate = ref(new Date(initialSelected));
const pad = (value) => value.toString().padStart(2, '0');
const toIsoDate = (date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
const monthLabel = computed(() => {
    const formatter = new Intl.DateTimeFormat('zh-CN', { year: 'numeric', month: 'long' });
    return formatter.format(viewMonth.value);
});
const summaryByDate = ref({});
const detailCache = ref({});
const isMonthLoading = ref(false);
const monthError = ref(null);
const isDetailLoading = ref(false);
const detailError = ref(null);
const detailSuccess = ref(null);
const isSaving = ref(false);
const showDetailOverlay = ref(false);
let detailOverlayTimer = null;
const DETAIL_OVERLAY_DELAY = 160;
const showMonthOverlay = ref(false);
let monthOverlayTimer = null;
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
const DIMENSION_COLORS = {
    心情: '#e0527e',
    学习: '#4c5df0',
    运动: '#2ecc71',
    工作: '#f39c12'
};
const hexToRgb = (hex) => {
    const n = parseInt(hex.replace('#', ''), 16);
    return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
};
const blendScores = (scores) => {
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
    if (total === 0)
        return null;
    const avg = (n) => Math.round(n / total);
    return `rgb(${avg(r)}, ${avg(g)}, ${avg(b)})`;
};
const avgScore = (scores) => {
    const sum = DEFAULT_DIMENSIONS.reduce((acc, d) => acc + (scores[d] ?? 0), 0);
    return sum / DEFAULT_DIMENSIONS.length;
};
const form = reactive({
    mood: '',
    plansText: '',
    content: '',
    scores: {}
});
const initScores = () => Object.fromEntries(DEFAULT_DIMENSIONS.map((d) => [d, 0]));
const selectedIso = computed(() => toIsoDate(selectedDate.value));
const selectedEntry = computed(() => detailCache.value[selectedIso.value] ?? null);
const hasExistingEntry = computed(() => selectedEntry.value !== null);
const splitPlans = (text) => text
    .split(/\r?\n/)
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
const hydrateForm = (detail) => {
    form.mood = detail?.mood ?? '';
    form.plansText = detail ? detail.plans.join('\n') : '';
    form.content = detail?.content ?? '';
    form.scores = { ...initScores(), ...(detail?.scores ?? {}) };
};
const isFormValid = computed(() => form.content.trim().length > 0);
const scoresEqual = (a, b) => {
    const keysA = Object.keys(a);
    const keysB = Object.keys(b);
    if (keysA.length !== keysB.length)
        return false;
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
    return ((original.mood ?? '') !== trimmedMood ||
        original.content !== trimmedContent ||
        original.plans.join('\n') !== normalizedPlans ||
        !scoresEqual(original.scores ?? {}, currentScores));
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
        let cellDate;
        let inCurrentMonth = true;
        if (index < startOffset) {
            const day = daysInPrevMonth - (startOffset - index - 1);
            cellDate = new Date(year, month - 1, day);
            inCurrentMonth = false;
        }
        else if (index >= startOffset + daysInMonth) {
            const day = index - (startOffset + daysInMonth) + 1;
            cellDate = new Date(year, month + 1, day);
            inCurrentMonth = false;
        }
        else {
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
const isSelected = (cellDate) => {
    const current = selectedDate.value;
    return (current.getFullYear() === cellDate.getFullYear() &&
        current.getMonth() === cellDate.getMonth() &&
        current.getDate() === cellDate.getDate());
};
const isToday = (cellDate) => {
    const today = new Date();
    return (today.getFullYear() === cellDate.getFullYear() &&
        today.getMonth() === cellDate.getMonth() &&
        today.getDate() === cellDate.getDate());
};
const selectDate = (date) => {
    selectedDate.value = new Date(date.getFullYear(), date.getMonth(), date.getDate());
};
let currentMonthRequest = 0;
const loadSummaries = async (target) => {
    const requestId = ++currentMonthRequest;
    isMonthLoading.value = true;
    monthError.value = null;
    scheduleMonthOverlay();
    try {
        const data = await fetchDiarySummaries(target.getFullYear(), target.getMonth() + 1);
        if (currentMonthRequest !== requestId) {
            return;
        }
        summaryByDate.value = data.reduce((acc, item) => {
            acc[item.entryDate] = item;
            return acc;
        }, {});
    }
    catch (error) {
        if (currentMonthRequest === requestId) {
            monthError.value = '无法加载该月的日记，请稍后重试。';
        }
        console.error('[DiaryCalendar] loadSummaries', error);
    }
    finally {
        if (currentMonthRequest === requestId) {
            cancelMonthOverlayTimer();
            showMonthOverlay.value = false;
            isMonthLoading.value = false;
        }
    }
};
let currentDetailRequest = null;
const ensureDetailLoaded = async (date) => {
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
    }
    catch (error) {
        if (currentDetailRequest !== iso) {
            return;
        }
        detailError.value = '加载日记详情失败，请稍后重试。';
        console.error('[DiaryCalendar] ensureDetailLoaded', error);
    }
    finally {
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
const syncViewMonth = (date) => {
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
const refreshSummaryForIso = (iso, detail) => {
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
    }
    else if (summaryByDate.value[iso]) {
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
    }
    catch (error) {
        detailError.value = '保存失败，请稍后重试。';
        console.error('[DiaryCalendar] handleSave', error);
    }
    finally {
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
const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const formatDateLabel = (iso) => {
    const date = new Date(iso);
    const day = new Intl.DateTimeFormat('zh-CN', { month: 'numeric', day: 'numeric' }).format(date);
    const weekday = new Intl.DateTimeFormat('zh-CN', { weekday: 'short' }).format(date);
    return { day, weekday };
};
const createSnippet = (text, keywordValue) => {
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
const buildSegments = (snippet, keywordValue) => {
    if (!snippet) {
        return [];
    }
    if (!keywordValue) {
        return [{ text: snippet, matched: false }];
    }
    const regex = new RegExp(escapeRegExp(keywordValue), 'gi');
    const segments = [];
    let lastIndex = 0;
    let match;
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
const pickSnippetSource = (entry, keywordValue) => {
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
const searchCards = computed(() => {
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
    const nextQuery = { ...route.query };
    delete nextQuery.search;
    await router.replace({ name: 'diary', query: nextQuery }).catch(() => {
        /* noop */
    });
};
const jumpToDate = (iso) => {
    const [year, month, day] = iso.split('-').map((part) => Number.parseInt(part, 10));
    if (Number.isNaN(year) || Number.isNaN(month) || Number.isNaN(day)) {
        return;
    }
    const target = new Date(year, month - 1, day);
    selectDate(target);
    viewMonth.value = new Date(target.getFullYear(), target.getMonth(), 1);
};
watch(() => route.query.search, async (value) => {
    if (typeof value === 'string' && value.trim()) {
        await diarySearchStore.search(value);
    }
    else {
        diarySearchStore.clear();
    }
}, { immediate: true });
debugger; /* PartiallyEnd: #3632/scriptSetup.vue */
const __VLS_ctx = {};
let __VLS_components;
let __VLS_directives;
/** @type {__VLS_StyleScopedClasses['calendar']} */ ;
/** @type {__VLS_StyleScopedClasses['calendar--loading']} */ ;
/** @type {__VLS_StyleScopedClasses['diary-search']} */ ;
/** @type {__VLS_StyleScopedClasses['diary-detail']} */ ;
/** @type {__VLS_StyleScopedClasses['calendar']} */ ;
/** @type {__VLS_StyleScopedClasses['diary-detail']} */ ;
/** @type {__VLS_StyleScopedClasses['diary-search']} */ ;
/** @type {__VLS_StyleScopedClasses['controls']} */ ;
/** @type {__VLS_StyleScopedClasses['controls']} */ ;
/** @type {__VLS_StyleScopedClasses['controls']} */ ;
/** @type {__VLS_StyleScopedClasses['calendar--loading']} */ ;
/** @type {__VLS_StyleScopedClasses['controls']} */ ;
/** @type {__VLS_StyleScopedClasses['controls']} */ ;
/** @type {__VLS_StyleScopedClasses['grid']} */ ;
/** @type {__VLS_StyleScopedClasses['cell']} */ ;
/** @type {__VLS_StyleScopedClasses['cell']} */ ;
/** @type {__VLS_StyleScopedClasses['cell']} */ ;
/** @type {__VLS_StyleScopedClasses['active']} */ ;
/** @type {__VLS_StyleScopedClasses['cell']} */ ;
/** @type {__VLS_StyleScopedClasses['active']} */ ;
/** @type {__VLS_StyleScopedClasses['cell']} */ ;
/** @type {__VLS_StyleScopedClasses['active']} */ ;
/** @type {__VLS_StyleScopedClasses['cell-day']} */ ;
/** @type {__VLS_StyleScopedClasses['cell']} */ ;
/** @type {__VLS_StyleScopedClasses['active']} */ ;
/** @type {__VLS_StyleScopedClasses['cell-mood']} */ ;
/** @type {__VLS_StyleScopedClasses['active']} */ ;
/** @type {__VLS_StyleScopedClasses['cell--search-hit']} */ ;
/** @type {__VLS_StyleScopedClasses['cell--search-hit']} */ ;
/** @type {__VLS_StyleScopedClasses['cell']} */ ;
/** @type {__VLS_StyleScopedClasses['active']} */ ;
/** @type {__VLS_StyleScopedClasses['cell--search-hit']} */ ;
/** @type {__VLS_StyleScopedClasses['diary-search']} */ ;
/** @type {__VLS_StyleScopedClasses['diary-search__clear']} */ ;
/** @type {__VLS_StyleScopedClasses['diary-search__card']} */ ;
/** @type {__VLS_StyleScopedClasses['diary-search__snippet']} */ ;
/** @type {__VLS_StyleScopedClasses['cell']} */ ;
/** @type {__VLS_StyleScopedClasses['active']} */ ;
/** @type {__VLS_StyleScopedClasses['score-header-dot']} */ ;
/** @type {__VLS_StyleScopedClasses['score-header-dot']} */ ;
/** @type {__VLS_StyleScopedClasses['diary-form']} */ ;
/** @type {__VLS_StyleScopedClasses['form-group']} */ ;
/** @type {__VLS_StyleScopedClasses['form-group']} */ ;
/** @type {__VLS_StyleScopedClasses['form-group']} */ ;
/** @type {__VLS_StyleScopedClasses['form-group']} */ ;
/** @type {__VLS_StyleScopedClasses['form-group']} */ ;
/** @type {__VLS_StyleScopedClasses['form-group']} */ ;
/** @type {__VLS_StyleScopedClasses['form-group']} */ ;
/** @type {__VLS_StyleScopedClasses['primary']} */ ;
/** @type {__VLS_StyleScopedClasses['primary']} */ ;
/** @type {__VLS_StyleScopedClasses['ghost']} */ ;
/** @type {__VLS_StyleScopedClasses['ghost']} */ ;
/** @type {__VLS_StyleScopedClasses['diary-calendar']} */ ;
/** @type {__VLS_StyleScopedClasses['calendar']} */ ;
/** @type {__VLS_StyleScopedClasses['diary-detail']} */ ;
/** @type {__VLS_StyleScopedClasses['diary-search']} */ ;
/** @type {__VLS_StyleScopedClasses['diary-search']} */ ;
// CSS variable injection 
// CSS variable injection end 
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "diary-calendar" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.section, __VLS_intrinsicElements.section)({
    ...{ class: "calendar" },
    ...{ class: ({ 'calendar--loading': __VLS_ctx.showMonthOverlay, 'calendar--locked': __VLS_ctx.isMonthLoading }) },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.header, __VLS_intrinsicElements.header)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.h3, __VLS_intrinsicElements.h3)({
    ...{ style: {} },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "controls" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
    ...{ onClick: (__VLS_ctx.prevMonth) },
    type: "button",
    'aria-label': "上一个月",
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
(__VLS_ctx.monthLabel);
__VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
    ...{ onClick: (__VLS_ctx.nextMonth) },
    type: "button",
    'aria-label': "下一个月",
});
if (__VLS_ctx.showMonthOverlay) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
        ...{ class: "calendar-hint" },
    });
}
else if (__VLS_ctx.monthError) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
        ...{ class: "calendar-hint calendar-hint--error" },
    });
    (__VLS_ctx.monthError);
}
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "grid" },
});
for (const [day] of __VLS_getVForSourceType((__VLS_ctx.weekdays))) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "weekday" },
        key: (day),
    });
    (day);
}
for (const [cell] of __VLS_getVForSourceType((__VLS_ctx.calendarCells))) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (...[$event]) => {
                __VLS_ctx.selectDate(cell.date);
            } },
        key: (cell.iso),
        type: "button",
        ...{ class: "cell" },
        'aria-pressed': (__VLS_ctx.isSelected(cell.date)),
        ...{ class: ([
                { active: __VLS_ctx.isSelected(cell.date) },
                {
                    'cell--outside': !cell.inCurrentMonth,
                    'cell--today': __VLS_ctx.isToday(cell.date),
                    'cell--search-hit': cell.matched
                }
            ]) },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "cell-day" },
    });
    (cell.label);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "cell-mood" },
    });
    (cell.mood || '\u00A0');
}
if (__VLS_ctx.showSearchPanel) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.aside, __VLS_intrinsicElements.aside)({
        ...{ class: "diary-search" },
        'aria-busy': (__VLS_ctx.isSearchLoading),
        'aria-live': "polite",
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.header, __VLS_intrinsicElements.header)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.h3, __VLS_intrinsicElements.h3)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
        ...{ class: "diary-search__hint" },
    });
    (__VLS_ctx.searchKeyword);
    (__VLS_ctx.searchResults.length);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (__VLS_ctx.clearSearch) },
        type: "button",
        ...{ class: "diary-search__clear" },
    });
    if (__VLS_ctx.isSearchLoading) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
            ...{ class: "diary-search__status" },
        });
    }
    else if (__VLS_ctx.searchError) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
            ...{ class: "diary-search__status diary-search__status--error" },
        });
        (__VLS_ctx.searchError);
    }
    else if (!__VLS_ctx.searchResults.length) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
            ...{ class: "diary-search__status" },
        });
    }
    else {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.ul, __VLS_intrinsicElements.ul)({
            ...{ class: "diary-search__list" },
        });
        for (const [card] of __VLS_getVForSourceType((__VLS_ctx.searchCards))) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.li, __VLS_intrinsicElements.li)({
                key: (card.iso),
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
                ...{ onClick: (...[$event]) => {
                        if (!(__VLS_ctx.showSearchPanel))
                            return;
                        if (!!(__VLS_ctx.isSearchLoading))
                            return;
                        if (!!(__VLS_ctx.searchError))
                            return;
                        if (!!(!__VLS_ctx.searchResults.length))
                            return;
                        __VLS_ctx.jumpToDate(card.iso);
                    } },
                type: "button",
                ...{ class: "diary-search__card" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "diary-search__card-date" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                ...{ class: "diary-search__card-day" },
            });
            (card.day);
            __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                ...{ class: "diary-search__card-weekday" },
            });
            (card.weekday);
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "diary-search__card-content" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "diary-search__card-meta" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                ...{ class: "diary-search__card-label" },
            });
            (card.label);
            if (card.mood) {
                __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                    ...{ class: "diary-search__mood" },
                });
                (card.mood);
            }
            __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
                ...{ class: "diary-search__snippet" },
            });
            for (const [segment, index] of __VLS_getVForSourceType((card.snippet))) {
                (index);
                if (segment.matched) {
                    __VLS_asFunctionalElement(__VLS_intrinsicElements.mark, __VLS_intrinsicElements.mark)({});
                    (segment.text);
                }
                else {
                    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
                    (segment.text);
                }
            }
        }
    }
}
__VLS_asFunctionalElement(__VLS_intrinsicElements.section, __VLS_intrinsicElements.section)({
    ...{ class: "diary-detail" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.header, __VLS_intrinsicElements.header)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.h3, __VLS_intrinsicElements.h3)({});
(__VLS_ctx.detailTitle);
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "detail-actions" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "score-header" },
});
for (const [dim] of __VLS_getVForSourceType((__VLS_ctx.DEFAULT_DIMENSIONS))) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        key: (dim),
        ...{ class: "score-header-item" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "score-header-label" },
        ...{ style: ({ color: __VLS_ctx.DIMENSION_COLORS[dim] }) },
    });
    (dim);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "score-header-dots" },
    });
    for (const [n] of __VLS_getVForSourceType((5))) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.button)({
            ...{ onClick: (...[$event]) => {
                    __VLS_ctx.form.scores[dim] = n === (__VLS_ctx.form.scores[dim] ?? 0) ? 0 : n;
                } },
            key: (n),
            type: "button",
            ...{ class: "score-header-dot" },
            ...{ class: ({ 'is-active': n <= (__VLS_ctx.form.scores[dim] ?? 0) }) },
            ...{ style: (n <= (__VLS_ctx.form.scores[dim] ?? 0) ? { background: __VLS_ctx.DIMENSION_COLORS[dim], borderColor: __VLS_ctx.DIMENSION_COLORS[dim] } : {}) },
            disabled: (__VLS_ctx.isFormDisabled),
        });
    }
}
if (__VLS_ctx.isFormDirty) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (__VLS_ctx.resetForm) },
        type: "button",
        ...{ class: "ghost" },
        disabled: (__VLS_ctx.isDetailLoading || __VLS_ctx.isSaving),
    });
}
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "diary-detail__body" },
    ...{ class: ({ 'diary-detail__body--loading': __VLS_ctx.showDetailOverlay }) },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "diary-detail__loader detail-state" },
    role: "status",
    'aria-live': "polite",
    'aria-hidden': "false",
});
__VLS_asFunctionalDirective(__VLS_directives.vShow)(null, { ...__VLS_directiveBindingRestFields, value: (__VLS_ctx.showDetailOverlay) }, null, null);
if (__VLS_ctx.detailError) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
        ...{ class: "inline-feedback inline-feedback--error" },
    });
    (__VLS_ctx.detailError);
}
if (__VLS_ctx.detailSuccess) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
        ...{ class: "inline-feedback inline-feedback--success" },
    });
    (__VLS_ctx.detailSuccess);
}
__VLS_asFunctionalElement(__VLS_intrinsicElements.form, __VLS_intrinsicElements.form)({
    ...{ onSubmit: (__VLS_ctx.handleSave) },
    ...{ class: "diary-form" },
    'aria-busy': (__VLS_ctx.isDetailLoading),
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
    ...{ class: "form-group" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
    value: (__VLS_ctx.form.mood),
    type: "text",
    maxlength: "64",
    placeholder: "如：🌤️ 活力焕发",
    disabled: (__VLS_ctx.isFormDisabled),
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
    ...{ class: "form-group" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.textarea, __VLS_intrinsicElements.textarea)({
    value: (__VLS_ctx.form.plansText),
    rows: "3",
    placeholder: "每行填写一条计划，例如：完成用户访谈",
    disabled: (__VLS_ctx.isFormDisabled),
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
    ...{ class: "form-group" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.textarea, __VLS_intrinsicElements.textarea)({
    value: (__VLS_ctx.form.content),
    rows: "6",
    placeholder: "记录今天的灵感与感受...",
    required: true,
    disabled: (__VLS_ctx.isFormDisabled),
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "form-actions" },
});
if (!__VLS_ctx.hasExistingEntry) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "form-hint" },
    });
}
__VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
    ...{ class: "primary" },
    type: "submit",
    disabled: (__VLS_ctx.isDetailLoading || __VLS_ctx.isSaving || !__VLS_ctx.isFormValid || !__VLS_ctx.isFormDirty),
});
(__VLS_ctx.hasExistingEntry ? '保存更新' : '立即记录');
/** @type {__VLS_StyleScopedClasses['diary-calendar']} */ ;
/** @type {__VLS_StyleScopedClasses['calendar']} */ ;
/** @type {__VLS_StyleScopedClasses['controls']} */ ;
/** @type {__VLS_StyleScopedClasses['calendar-hint']} */ ;
/** @type {__VLS_StyleScopedClasses['calendar-hint']} */ ;
/** @type {__VLS_StyleScopedClasses['calendar-hint--error']} */ ;
/** @type {__VLS_StyleScopedClasses['grid']} */ ;
/** @type {__VLS_StyleScopedClasses['weekday']} */ ;
/** @type {__VLS_StyleScopedClasses['cell']} */ ;
/** @type {__VLS_StyleScopedClasses['cell-day']} */ ;
/** @type {__VLS_StyleScopedClasses['cell-mood']} */ ;
/** @type {__VLS_StyleScopedClasses['diary-search']} */ ;
/** @type {__VLS_StyleScopedClasses['diary-search__hint']} */ ;
/** @type {__VLS_StyleScopedClasses['diary-search__clear']} */ ;
/** @type {__VLS_StyleScopedClasses['diary-search__status']} */ ;
/** @type {__VLS_StyleScopedClasses['diary-search__status']} */ ;
/** @type {__VLS_StyleScopedClasses['diary-search__status--error']} */ ;
/** @type {__VLS_StyleScopedClasses['diary-search__status']} */ ;
/** @type {__VLS_StyleScopedClasses['diary-search__list']} */ ;
/** @type {__VLS_StyleScopedClasses['diary-search__card']} */ ;
/** @type {__VLS_StyleScopedClasses['diary-search__card-date']} */ ;
/** @type {__VLS_StyleScopedClasses['diary-search__card-day']} */ ;
/** @type {__VLS_StyleScopedClasses['diary-search__card-weekday']} */ ;
/** @type {__VLS_StyleScopedClasses['diary-search__card-content']} */ ;
/** @type {__VLS_StyleScopedClasses['diary-search__card-meta']} */ ;
/** @type {__VLS_StyleScopedClasses['diary-search__card-label']} */ ;
/** @type {__VLS_StyleScopedClasses['diary-search__mood']} */ ;
/** @type {__VLS_StyleScopedClasses['diary-search__snippet']} */ ;
/** @type {__VLS_StyleScopedClasses['diary-detail']} */ ;
/** @type {__VLS_StyleScopedClasses['detail-actions']} */ ;
/** @type {__VLS_StyleScopedClasses['score-header']} */ ;
/** @type {__VLS_StyleScopedClasses['score-header-item']} */ ;
/** @type {__VLS_StyleScopedClasses['score-header-label']} */ ;
/** @type {__VLS_StyleScopedClasses['score-header-dots']} */ ;
/** @type {__VLS_StyleScopedClasses['score-header-dot']} */ ;
/** @type {__VLS_StyleScopedClasses['ghost']} */ ;
/** @type {__VLS_StyleScopedClasses['diary-detail__body']} */ ;
/** @type {__VLS_StyleScopedClasses['diary-detail__loader']} */ ;
/** @type {__VLS_StyleScopedClasses['detail-state']} */ ;
/** @type {__VLS_StyleScopedClasses['inline-feedback']} */ ;
/** @type {__VLS_StyleScopedClasses['inline-feedback--error']} */ ;
/** @type {__VLS_StyleScopedClasses['inline-feedback']} */ ;
/** @type {__VLS_StyleScopedClasses['inline-feedback--success']} */ ;
/** @type {__VLS_StyleScopedClasses['diary-form']} */ ;
/** @type {__VLS_StyleScopedClasses['form-group']} */ ;
/** @type {__VLS_StyleScopedClasses['form-group']} */ ;
/** @type {__VLS_StyleScopedClasses['form-group']} */ ;
/** @type {__VLS_StyleScopedClasses['form-actions']} */ ;
/** @type {__VLS_StyleScopedClasses['form-hint']} */ ;
/** @type {__VLS_StyleScopedClasses['primary']} */ ;
var __VLS_dollars;
const __VLS_self = (await import('vue')).defineComponent({
    setup() {
        return {
            searchKeyword: searchKeyword,
            searchResults: searchResults,
            isSearchLoading: isSearchLoading,
            searchError: searchError,
            weekdays: weekdays,
            monthLabel: monthLabel,
            isMonthLoading: isMonthLoading,
            monthError: monthError,
            isDetailLoading: isDetailLoading,
            detailError: detailError,
            detailSuccess: detailSuccess,
            isSaving: isSaving,
            showDetailOverlay: showDetailOverlay,
            showMonthOverlay: showMonthOverlay,
            DEFAULT_DIMENSIONS: DEFAULT_DIMENSIONS,
            DIMENSION_COLORS: DIMENSION_COLORS,
            form: form,
            hasExistingEntry: hasExistingEntry,
            isFormValid: isFormValid,
            isFormDirty: isFormDirty,
            isFormDisabled: isFormDisabled,
            calendarCells: calendarCells,
            detailTitle: detailTitle,
            isSelected: isSelected,
            isToday: isToday,
            selectDate: selectDate,
            prevMonth: prevMonth,
            nextMonth: nextMonth,
            handleSave: handleSave,
            resetForm: resetForm,
            searchCards: searchCards,
            showSearchPanel: showSearchPanel,
            clearSearch: clearSearch,
            jumpToDate: jumpToDate,
        };
    },
});
export default (await import('vue')).defineComponent({
    setup() {
        return {};
    },
});
; /* PartiallyEnd: #4569/main.vue */
