import { computed, reactive, ref, watch } from 'vue';
import { deleteDiaryEntry, fetchDiaryDetail, fetchDiarySummaries, upsertDiaryEntry } from '@/services/diaryService';
import { isHttpError } from '@/services/http';
const weekdays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const initialSelected = new Date(2026, 5, 2);
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
const isDeleting = ref(false);
const form = reactive({
    mood: '',
    plansText: '',
    content: ''
});
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
};
const isFormValid = computed(() => form.content.trim().length > 0);
const isFormDirty = computed(() => {
    const iso = selectedIso.value;
    const original = detailCache.value[iso];
    const trimmedMood = form.mood.trim();
    const trimmedContent = form.content.trim();
    const normalizedPlans = splitPlans(form.plansText).join('\n');
    if (!original) {
        return Boolean(trimmedMood || trimmedContent || normalizedPlans);
    }
    return ((original.mood ?? '') !== trimmedMood ||
        original.content !== trimmedContent ||
        original.plans.join('\n') !== normalizedPlans);
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
            hasEntry: Boolean(summary?.hasContent || summary?.hasPlans)
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
        if (isHttpError(error, 404)) {
            detailCache.value = { ...detailCache.value, [iso]: null };
            hydrateForm(null);
        }
        else {
            detailError.value = '加载日记详情失败，请稍后重试。';
            console.error('[DiaryCalendar] ensureDetailLoaded', error);
        }
    }
    finally {
        if (currentDetailRequest === iso) {
            isDetailLoading.value = false;
            currentDetailRequest = null;
        }
    }
};
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
    const base = viewMonth.value;
    viewMonth.value = new Date(base.getFullYear(), base.getMonth() - 1, 1);
};
const nextMonth = () => {
    const base = viewMonth.value;
    viewMonth.value = new Date(base.getFullYear(), base.getMonth() + 1, 1);
};
const refreshSummaryForIso = (iso, detail) => {
    const summary = detail
        ? {
            entryDate: iso,
            mood: detail.mood ?? null,
            hasContent: detail.content.trim().length > 0,
            hasPlans: detail.plans.length > 0
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
        content: trimmedContent
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
const handleDelete = async () => {
    if (!hasExistingEntry.value) {
        hydrateForm(null);
        return;
    }
    if (!window.confirm('确定要删除这一天的日记吗？')) {
        return;
    }
    isDeleting.value = true;
    detailError.value = null;
    detailSuccess.value = null;
    const iso = selectedIso.value;
    try {
        await deleteDiaryEntry(iso);
        const { [iso]: _removed, ...restDetails } = detailCache.value;
        detailCache.value = restDetails;
        refreshSummaryForIso(iso, null);
        hydrateForm(null);
        detailSuccess.value = '已删除日记。';
    }
    catch (error) {
        detailError.value = '删除失败，请稍后重试。';
        console.error('[DiaryCalendar] handleDelete', error);
    }
    finally {
        isDeleting.value = false;
    }
};
const resetForm = () => {
    const iso = selectedIso.value;
    const original = detailCache.value[iso] ?? null;
    hydrateForm(original);
    detailError.value = null;
    detailSuccess.value = null;
};
debugger; /* PartiallyEnd: #3632/scriptSetup.vue */
const __VLS_ctx = {};
let __VLS_components;
let __VLS_directives;
/** @type {__VLS_StyleScopedClasses['calendar']} */ ;
/** @type {__VLS_StyleScopedClasses['diary-detail']} */ ;
/** @type {__VLS_StyleScopedClasses['controls']} */ ;
/** @type {__VLS_StyleScopedClasses['controls']} */ ;
/** @type {__VLS_StyleScopedClasses['controls']} */ ;
/** @type {__VLS_StyleScopedClasses['cell']} */ ;
/** @type {__VLS_StyleScopedClasses['cell']} */ ;
/** @type {__VLS_StyleScopedClasses['cell']} */ ;
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
/** @type {__VLS_StyleScopedClasses['danger']} */ ;
/** @type {__VLS_StyleScopedClasses['danger']} */ ;
/** @type {__VLS_StyleScopedClasses['diary-calendar']} */ ;
// CSS variable injection 
// CSS variable injection end 
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "diary-calendar" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.section, __VLS_intrinsicElements.section)({
    ...{ class: "calendar" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.header, __VLS_intrinsicElements.header)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.h3, __VLS_intrinsicElements.h3)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "controls" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
    ...{ onClick: (__VLS_ctx.prevMonth) },
    type: "button",
    disabled: (__VLS_ctx.isMonthLoading),
    'aria-label': "上一个月",
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
(__VLS_ctx.monthLabel);
__VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
    ...{ onClick: (__VLS_ctx.nextMonth) },
    type: "button",
    disabled: (__VLS_ctx.isMonthLoading),
    'aria-label': "下一个月",
});
if (__VLS_ctx.isMonthLoading) {
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
                { active: __VLS_ctx.isSelected(cell.date), marked: cell.hasEntry },
                { 'cell--outside': !cell.inCurrentMonth, 'cell--today': __VLS_ctx.isToday(cell.date) }
            ]) },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
    (cell.label);
}
__VLS_asFunctionalElement(__VLS_intrinsicElements.section, __VLS_intrinsicElements.section)({
    ...{ class: "diary-detail" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.header, __VLS_intrinsicElements.header)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.h3, __VLS_intrinsicElements.h3)({});
(__VLS_ctx.detailTitle);
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
(__VLS_ctx.form.mood ? __VLS_ctx.form.mood : '待记录');
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "detail-actions" },
});
if (__VLS_ctx.isFormDirty) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (__VLS_ctx.resetForm) },
        type: "button",
        ...{ class: "ghost" },
        disabled: (__VLS_ctx.isDetailLoading || __VLS_ctx.isSaving),
    });
}
if (__VLS_ctx.hasExistingEntry) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (__VLS_ctx.handleDelete) },
        type: "button",
        ...{ class: "danger" },
        disabled: (__VLS_ctx.isDetailLoading || __VLS_ctx.isDeleting),
    });
}
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "diary-detail__body" },
});
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
if (__VLS_ctx.isDetailLoading) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
        ...{ class: "detail-state" },
    });
}
else {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.form, __VLS_intrinsicElements.form)({
        ...{ onSubmit: (__VLS_ctx.handleSave) },
        ...{ class: "diary-form" },
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
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
        ...{ class: "form-group" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.textarea, __VLS_intrinsicElements.textarea)({
        value: (__VLS_ctx.form.plansText),
        rows: "3",
        placeholder: "每行填写一条计划，例如：完成用户访谈",
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.small, __VLS_intrinsicElements.small)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({
        ...{ class: "form-group" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.textarea, __VLS_intrinsicElements.textarea)({
        value: (__VLS_ctx.form.content),
        rows: "6",
        placeholder: "记录今天的灵感与感受...",
        required: true,
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
        disabled: (__VLS_ctx.isSaving || !__VLS_ctx.isFormValid || !__VLS_ctx.isFormDirty),
    });
    (__VLS_ctx.hasExistingEntry ? '保存更新' : '立即记录');
}
/** @type {__VLS_StyleScopedClasses['diary-calendar']} */ ;
/** @type {__VLS_StyleScopedClasses['calendar']} */ ;
/** @type {__VLS_StyleScopedClasses['controls']} */ ;
/** @type {__VLS_StyleScopedClasses['calendar-hint']} */ ;
/** @type {__VLS_StyleScopedClasses['calendar-hint']} */ ;
/** @type {__VLS_StyleScopedClasses['calendar-hint--error']} */ ;
/** @type {__VLS_StyleScopedClasses['grid']} */ ;
/** @type {__VLS_StyleScopedClasses['weekday']} */ ;
/** @type {__VLS_StyleScopedClasses['cell']} */ ;
/** @type {__VLS_StyleScopedClasses['diary-detail']} */ ;
/** @type {__VLS_StyleScopedClasses['detail-actions']} */ ;
/** @type {__VLS_StyleScopedClasses['ghost']} */ ;
/** @type {__VLS_StyleScopedClasses['danger']} */ ;
/** @type {__VLS_StyleScopedClasses['diary-detail__body']} */ ;
/** @type {__VLS_StyleScopedClasses['inline-feedback']} */ ;
/** @type {__VLS_StyleScopedClasses['inline-feedback--error']} */ ;
/** @type {__VLS_StyleScopedClasses['inline-feedback']} */ ;
/** @type {__VLS_StyleScopedClasses['inline-feedback--success']} */ ;
/** @type {__VLS_StyleScopedClasses['detail-state']} */ ;
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
            weekdays: weekdays,
            monthLabel: monthLabel,
            isMonthLoading: isMonthLoading,
            monthError: monthError,
            isDetailLoading: isDetailLoading,
            detailError: detailError,
            detailSuccess: detailSuccess,
            isSaving: isSaving,
            isDeleting: isDeleting,
            form: form,
            hasExistingEntry: hasExistingEntry,
            isFormValid: isFormValid,
            isFormDirty: isFormDirty,
            calendarCells: calendarCells,
            detailTitle: detailTitle,
            isSelected: isSelected,
            isToday: isToday,
            selectDate: selectDate,
            prevMonth: prevMonth,
            nextMonth: nextMonth,
            handleSave: handleSave,
            handleDelete: handleDelete,
            resetForm: resetForm,
        };
    },
});
export default (await import('vue')).defineComponent({
    setup() {
        return {};
    },
});
; /* PartiallyEnd: #4569/main.vue */
