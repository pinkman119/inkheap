import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { fetchDiaryDetail, fetchDiarySummaries } from '@/services/diaryService';
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
const showDetailOverlay = ref(false);
let detailOverlayTimer = null;
const DETAIL_OVERLAY_DELAY = 160;
const showMonthOverlay = ref(false);
let monthOverlayTimer = null;
const MONTH_OVERLAY_DELAY = 160;
/* ── 重要日期 ── */
const importantDateSet = ref(new Set());
const toggleImportant = (iso) => {
    const next = new Set(importantDateSet.value);
    if (next.has(iso)) {
        next.delete(iso);
    }
    else {
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
const isImportant = (iso) => importantDateSet.value.has(iso);
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
const jumpToDate = (iso) => {
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
const DIMENSION_COLORS = {
    心情: '#e0527e',
    学习: '#4c5df0',
    运动: '#2ecc71',
    工作: '#f39c12'
};
const selectedIso = computed(() => toIsoDate(selectedDate.value));
const selectedEntry = computed(() => detailCache.value[selectedIso.value] ?? null);
const hasScores = computed(() => {
    const entry = selectedEntry.value;
    if (!entry?.scores)
        return false;
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
        let cellDate;
        let inCurrentMonth = true;
        if (index < startOffset) {
            const day = daysInPrevMonth - startOffset + index + 1;
            cellDate = new Date(year, month - 1, day);
            inCurrentMonth = false;
        }
        else if (index >= startOffset + daysInMonth) {
            const day = index - startOffset - daysInMonth + 1;
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
            mood: summary?.mood ?? null,
            matched: false,
            isImportant: isImportant(iso)
        };
    });
});
const isSelected = (date) => {
    return toIsoDate(date) === selectedIso.value;
};
const isToday = (date) => {
    const today = new Date();
    return (date.getFullYear() === today.getFullYear() &&
        date.getMonth() === today.getMonth() &&
        date.getDate() === today.getDate());
};
const selectDate = (date) => {
    selectedDate.value = date;
};
const preloadImportantDetails = async (year, month) => {
    const prefix = `${year}-${String(month + 1).padStart(2, '0')}`;
    const isos = Array.from(importantDateSet.value).filter((iso) => iso.startsWith(prefix));
    const results = await Promise.all(isos.map((iso) => fetchDiaryDetail(iso)));
    const updates = {};
    isos.forEach((iso, i) => {
        updates[iso] = results[i];
    });
    detailCache.value = { ...detailCache.value, ...updates };
};
const loadSummaries = async (date) => {
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    scheduleMonthOverlay();
    isMonthLoading.value = true;
    monthError.value = null;
    try {
        const summaries = await fetchDiarySummaries(year, month);
        const map = {};
        summaries.forEach((s) => {
            map[s.entryDate] = s;
        });
        summaryByDate.value = map;
        void preloadImportantDetails(date.getFullYear(), date.getMonth());
    }
    catch {
        monthError.value = '加载失败，请稍后重试。';
    }
    finally {
        cancelMonthOverlayTimer();
        showMonthOverlay.value = false;
        isMonthLoading.value = false;
    }
};
let currentDetailRequest = null;
const ensureDetailLoaded = async (date) => {
    const iso = toIsoDate(date);
    if (iso in detailCache.value)
        return;
    currentDetailRequest = iso;
    scheduleDetailOverlay();
    isDetailLoading.value = true;
    detailError.value = null;
    try {
        const detail = await fetchDiaryDetail(iso);
        if (currentDetailRequest === iso) {
            detailCache.value = { ...detailCache.value, [iso]: detail };
        }
    }
    catch {
        if (currentDetailRequest === iso) {
            detailError.value = '加载失败，请稍后重试。';
        }
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
    syncViewMonth(date);
    void ensureDetailLoaded(date);
}, { immediate: true });
const prevMonth = () => {
    if (isMonthLoading.value)
        return;
    const base = viewMonth.value;
    viewMonth.value = new Date(base.getFullYear(), base.getMonth() - 1, 1);
};
const nextMonth = () => {
    if (isMonthLoading.value)
        return;
    const base = viewMonth.value;
    viewMonth.value = new Date(base.getFullYear(), base.getMonth() + 1, 1);
};
debugger; /* PartiallyEnd: #3632/scriptSetup.vue */
const __VLS_ctx = {};
let __VLS_components;
let __VLS_directives;
/** @type {__VLS_StyleScopedClasses['sidebar-header']} */ ;
/** @type {__VLS_StyleScopedClasses['important-card']} */ ;
/** @type {__VLS_StyleScopedClasses['important-card__plans']} */ ;
/** @type {__VLS_StyleScopedClasses['important-card__plans']} */ ;
/** @type {__VLS_StyleScopedClasses['important-card']} */ ;
/** @type {__VLS_StyleScopedClasses['important-card__remove']} */ ;
/** @type {__VLS_StyleScopedClasses['important-card__remove']} */ ;
/** @type {__VLS_StyleScopedClasses['calendar-panel__controls']} */ ;
/** @type {__VLS_StyleScopedClasses['calendar-panel__controls']} */ ;
/** @type {__VLS_StyleScopedClasses['calendar-grid']} */ ;
/** @type {__VLS_StyleScopedClasses['calendar-cell']} */ ;
/** @type {__VLS_StyleScopedClasses['calendar-cell--active']} */ ;
/** @type {__VLS_StyleScopedClasses['calendar-cell--active']} */ ;
/** @type {__VLS_StyleScopedClasses['calendar-cell--today']} */ ;
/** @type {__VLS_StyleScopedClasses['calendar-cell--active']} */ ;
/** @type {__VLS_StyleScopedClasses['calendar-cell--important']} */ ;
/** @type {__VLS_StyleScopedClasses['calendar-cell__mood']} */ ;
/** @type {__VLS_StyleScopedClasses['detail-panel__header']} */ ;
/** @type {__VLS_StyleScopedClasses['diary-content']} */ ;
/** @type {__VLS_StyleScopedClasses['plans-list__item']} */ ;
/** @type {__VLS_StyleScopedClasses['detail-empty']} */ ;
/** @type {__VLS_StyleScopedClasses['notes-layout']} */ ;
/** @type {__VLS_StyleScopedClasses['notes-sidebar']} */ ;
/** @type {__VLS_StyleScopedClasses['sidebar-header']} */ ;
/** @type {__VLS_StyleScopedClasses['notes-main']} */ ;
/** @type {__VLS_StyleScopedClasses['calendar-panel']} */ ;
// CSS variable injection 
// CSS variable injection end 
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "notes-page" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "notes-layout" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.aside, __VLS_intrinsicElements.aside)({
    ...{ class: "notes-sidebar" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "sidebar-header" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.h1, __VLS_intrinsicElements.h1)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
    ...{ class: "subtitle" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "important-section" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "important-section__title" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
    ...{ class: "important-section__icon" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
if (!__VLS_ctx.importantDates.length) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
        ...{ class: "important-empty" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "important-empty__star" },
    });
}
else {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "important-list" },
    });
    for (const [item] of __VLS_getVForSourceType((__VLS_ctx.importantDates))) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
            ...{ onClick: (...[$event]) => {
                    if (!!(!__VLS_ctx.importantDates.length))
                        return;
                    __VLS_ctx.jumpToDate(item.iso);
                } },
            key: (item.iso),
            type: "button",
            ...{ class: "important-card" },
            ...{ class: ({ 'important-card--active': item.iso === __VLS_ctx.selectedIso }) },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "important-card__date" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "important-card__day" },
        });
        (item.day);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "important-card__weekday" },
        });
        (item.weekday);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "important-card__body" },
        });
        if (item.mood) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                ...{ class: "important-card__mood" },
            });
            (item.mood);
        }
        if (item.plans.length > 0) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.ul, __VLS_intrinsicElements.ul)({
                ...{ class: "important-card__plans" },
            });
            for (const [plan, idx] of __VLS_getVForSourceType((item.plans))) {
                __VLS_asFunctionalElement(__VLS_intrinsicElements.li, __VLS_intrinsicElements.li)({
                    key: (idx),
                });
                (plan);
            }
        }
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ onClick: (...[$event]) => {
                    if (!!(!__VLS_ctx.importantDates.length))
                        return;
                    __VLS_ctx.toggleImportant(item.iso);
                } },
            ...{ class: "important-card__remove" },
            title: "取消重要标记",
        });
    }
}
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "notes-main" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.section, __VLS_intrinsicElements.section)({
    ...{ class: "calendar-panel" },
    ...{ class: ({ 'calendar-panel--loading': __VLS_ctx.showMonthOverlay }) },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "calendar-panel__header" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.h3, __VLS_intrinsicElements.h3)({
    ...{ class: "calendar-panel__icon" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "calendar-panel__controls" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
    ...{ onClick: (__VLS_ctx.prevMonth) },
    type: "button",
    'aria-label': "上一个月",
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
    ...{ class: "calendar-panel__month" },
});
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
    ...{ class: "calendar-grid" },
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
        ...{ class: "calendar-cell" },
        'aria-pressed': (__VLS_ctx.isSelected(cell.date)),
        ...{ class: ([
                { 'calendar-cell--active': __VLS_ctx.isSelected(cell.date) },
                {
                    'calendar-cell--outside': !cell.inCurrentMonth,
                    'calendar-cell--today': __VLS_ctx.isToday(cell.date),
                    'calendar-cell--important': cell.isImportant
                }
            ]) },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "calendar-cell__day" },
    });
    (cell.label);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "calendar-cell__mood" },
    });
    (cell.mood || '\u00A0');
    if (cell.isImportant) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "calendar-cell__star" },
        });
    }
}
__VLS_asFunctionalElement(__VLS_intrinsicElements.section, __VLS_intrinsicElements.section)({
    ...{ class: "detail-panel" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "detail-panel__header" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.h3, __VLS_intrinsicElements.h3)({});
(__VLS_ctx.detailTitle);
if (__VLS_ctx.hasScores) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "detail-panel__header-scores" },
    });
    for (const [dim] of __VLS_getVForSourceType((__VLS_ctx.DEFAULT_DIMENSIONS))) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            key: (dim),
            ...{ class: "score-item" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "score-item__label" },
            ...{ style: ({ color: __VLS_ctx.DIMENSION_COLORS[dim] }) },
        });
        (dim);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "score-item__dots" },
        });
        for (const [n] of __VLS_getVForSourceType((5))) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.span)({
                key: (n),
                ...{ class: "score-dot" },
                ...{ class: ({ 'score-dot--active': n <= (__VLS_ctx.selectedEntry.scores?.[dim] ?? 0) }) },
                ...{ style: (n <= (__VLS_ctx.selectedEntry.scores?.[dim] ?? 0) ? { background: __VLS_ctx.DIMENSION_COLORS[dim], borderColor: __VLS_ctx.DIMENSION_COLORS[dim] } : {}) },
            });
        }
    }
}
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "detail-panel__body" },
    ...{ class: ({ 'detail-panel__body--loading': __VLS_ctx.showDetailOverlay }) },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "detail-loader" },
});
__VLS_asFunctionalDirective(__VLS_directives.vShow)(null, { ...__VLS_directiveBindingRestFields, value: (__VLS_ctx.showDetailOverlay) }, null, null);
if (__VLS_ctx.detailError) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
        ...{ class: "feedback feedback--error" },
    });
    (__VLS_ctx.detailError);
}
if (__VLS_ctx.selectedEntry) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "diary-content" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "diary-field" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "diary-field__label" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
        ...{ class: "diary-field__value" },
    });
    (__VLS_ctx.selectedEntry.mood || '未记录');
    if (__VLS_ctx.selectedEntry.plans.length > 0) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "diary-field" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "diary-field__label" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.ul, __VLS_intrinsicElements.ul)({
            ...{ class: "plans-list" },
        });
        for (const [plan, idx] of __VLS_getVForSourceType((__VLS_ctx.selectedEntry.plans))) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.li, __VLS_intrinsicElements.li)({
                key: (idx),
                ...{ class: "plans-list__item" },
            });
            (plan);
        }
    }
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "diary-field" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "diary-field__label" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
        ...{ class: "diary-field__content" },
    });
    (__VLS_ctx.selectedEntry.content || '暂无内容');
}
else if (!__VLS_ctx.showDetailOverlay && !__VLS_ctx.detailError) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "detail-empty" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({});
}
/** @type {__VLS_StyleScopedClasses['notes-page']} */ ;
/** @type {__VLS_StyleScopedClasses['notes-layout']} */ ;
/** @type {__VLS_StyleScopedClasses['notes-sidebar']} */ ;
/** @type {__VLS_StyleScopedClasses['sidebar-header']} */ ;
/** @type {__VLS_StyleScopedClasses['subtitle']} */ ;
/** @type {__VLS_StyleScopedClasses['important-section']} */ ;
/** @type {__VLS_StyleScopedClasses['important-section__title']} */ ;
/** @type {__VLS_StyleScopedClasses['important-section__icon']} */ ;
/** @type {__VLS_StyleScopedClasses['important-empty']} */ ;
/** @type {__VLS_StyleScopedClasses['important-empty__star']} */ ;
/** @type {__VLS_StyleScopedClasses['important-list']} */ ;
/** @type {__VLS_StyleScopedClasses['important-card']} */ ;
/** @type {__VLS_StyleScopedClasses['important-card__date']} */ ;
/** @type {__VLS_StyleScopedClasses['important-card__day']} */ ;
/** @type {__VLS_StyleScopedClasses['important-card__weekday']} */ ;
/** @type {__VLS_StyleScopedClasses['important-card__body']} */ ;
/** @type {__VLS_StyleScopedClasses['important-card__mood']} */ ;
/** @type {__VLS_StyleScopedClasses['important-card__plans']} */ ;
/** @type {__VLS_StyleScopedClasses['important-card__remove']} */ ;
/** @type {__VLS_StyleScopedClasses['notes-main']} */ ;
/** @type {__VLS_StyleScopedClasses['calendar-panel']} */ ;
/** @type {__VLS_StyleScopedClasses['calendar-panel__header']} */ ;
/** @type {__VLS_StyleScopedClasses['calendar-panel__icon']} */ ;
/** @type {__VLS_StyleScopedClasses['calendar-panel__controls']} */ ;
/** @type {__VLS_StyleScopedClasses['calendar-panel__month']} */ ;
/** @type {__VLS_StyleScopedClasses['calendar-hint']} */ ;
/** @type {__VLS_StyleScopedClasses['calendar-hint']} */ ;
/** @type {__VLS_StyleScopedClasses['calendar-hint--error']} */ ;
/** @type {__VLS_StyleScopedClasses['calendar-grid']} */ ;
/** @type {__VLS_StyleScopedClasses['weekday']} */ ;
/** @type {__VLS_StyleScopedClasses['calendar-cell']} */ ;
/** @type {__VLS_StyleScopedClasses['calendar-cell__day']} */ ;
/** @type {__VLS_StyleScopedClasses['calendar-cell__mood']} */ ;
/** @type {__VLS_StyleScopedClasses['calendar-cell__star']} */ ;
/** @type {__VLS_StyleScopedClasses['detail-panel']} */ ;
/** @type {__VLS_StyleScopedClasses['detail-panel__header']} */ ;
/** @type {__VLS_StyleScopedClasses['detail-panel__header-scores']} */ ;
/** @type {__VLS_StyleScopedClasses['score-item']} */ ;
/** @type {__VLS_StyleScopedClasses['score-item__label']} */ ;
/** @type {__VLS_StyleScopedClasses['score-item__dots']} */ ;
/** @type {__VLS_StyleScopedClasses['score-dot']} */ ;
/** @type {__VLS_StyleScopedClasses['detail-panel__body']} */ ;
/** @type {__VLS_StyleScopedClasses['detail-loader']} */ ;
/** @type {__VLS_StyleScopedClasses['feedback']} */ ;
/** @type {__VLS_StyleScopedClasses['feedback--error']} */ ;
/** @type {__VLS_StyleScopedClasses['diary-content']} */ ;
/** @type {__VLS_StyleScopedClasses['diary-field']} */ ;
/** @type {__VLS_StyleScopedClasses['diary-field__label']} */ ;
/** @type {__VLS_StyleScopedClasses['diary-field__value']} */ ;
/** @type {__VLS_StyleScopedClasses['diary-field']} */ ;
/** @type {__VLS_StyleScopedClasses['diary-field__label']} */ ;
/** @type {__VLS_StyleScopedClasses['plans-list']} */ ;
/** @type {__VLS_StyleScopedClasses['plans-list__item']} */ ;
/** @type {__VLS_StyleScopedClasses['diary-field']} */ ;
/** @type {__VLS_StyleScopedClasses['diary-field__label']} */ ;
/** @type {__VLS_StyleScopedClasses['diary-field__content']} */ ;
/** @type {__VLS_StyleScopedClasses['detail-empty']} */ ;
var __VLS_dollars;
const __VLS_self = (await import('vue')).defineComponent({
    setup() {
        return {
            weekdays: weekdays,
            monthLabel: monthLabel,
            monthError: monthError,
            detailError: detailError,
            showDetailOverlay: showDetailOverlay,
            showMonthOverlay: showMonthOverlay,
            toggleImportant: toggleImportant,
            importantDates: importantDates,
            jumpToDate: jumpToDate,
            DEFAULT_DIMENSIONS: DEFAULT_DIMENSIONS,
            DIMENSION_COLORS: DIMENSION_COLORS,
            selectedIso: selectedIso,
            selectedEntry: selectedEntry,
            hasScores: hasScores,
            detailTitle: detailTitle,
            calendarCells: calendarCells,
            isSelected: isSelected,
            isToday: isToday,
            selectDate: selectDate,
            prevMonth: prevMonth,
            nextMonth: nextMonth,
        };
    },
});
export default (await import('vue')).defineComponent({
    setup() {
        return {};
    },
});
; /* PartiallyEnd: #4569/main.vue */
