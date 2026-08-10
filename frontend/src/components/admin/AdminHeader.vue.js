import { computed, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { storeToRefs } from 'pinia';
import { useAuthStore } from '@/stores/auth';
import { useDiarySearchStore } from '@/stores/diarySearch';
import { logout as requestLogout } from '@/services/authService';
const keyword = ref('');
const route = useRoute();
const router = useRouter();
const authStore = useAuthStore();
const diarySearchStore = useDiarySearchStore();
const { keyword: activeKeyword } = storeToRefs(diarySearchStore);
const pageTitle = computed(() => route.meta.title ?? 'PersonaFlow');
const pageSubtitle = computed(() => {
    switch (route.name) {
        case 'articles':
            return '编排内容结构、分发文章与归档分类';
        case 'diary':
            return '以日历视角回顾情绪、计划与成长轨迹';
        case 'profile':
            return '保持个人档案常新，让履历随时可用';
        default:
            return '跨越文章、日记、简历的一体化信息中心';
    }
});
const displayName = computed(() => authStore.username ?? '未登录用户');
const initials = computed(() => (displayName.value ? displayName.value.slice(0, 1).toUpperCase() : 'U'));
const primaryRole = computed(() => authStore.roles[0] ?? '访客');
const syncKeywordFromRoute = () => {
    if (route.name !== 'admin-diary') {
        diarySearchStore.clear();
        keyword.value = '';
        return;
    }
    const routeKeyword = typeof route.query.search === 'string' ? route.query.search : '';
    if (routeKeyword) {
        keyword.value = routeKeyword;
        diarySearchStore.setKeyword(routeKeyword);
    }
    else {
        keyword.value = activeKeyword.value;
    }
};
const updateDiaryQuery = async (searchValue) => {
    if (route.name !== 'admin-diary') {
        return;
    }
    const nextQuery = { ...route.query };
    if (searchValue) {
        nextQuery.search = searchValue;
    }
    else {
        delete nextQuery.search;
    }
    await router.replace({ name: 'admin-diary', query: nextQuery }).catch(() => {
        /* noop */
    });
};
const handleSearch = async () => {
    const trimmed = keyword.value.trim();
    if (!trimmed) {
        diarySearchStore.clear();
        keyword.value = '';
        await updateDiaryQuery('');
        return;
    }
    if (route.name !== 'admin-diary') {
        await router.push({ name: 'admin-diary', query: { search: trimmed } }).catch(() => {
            /* noop */
        });
        return;
    }
    await diarySearchStore.search(trimmed);
    keyword.value = trimmed;
    await updateDiaryQuery(trimmed);
};
const handleClear = async () => {
    diarySearchStore.clear();
    keyword.value = '';
    await updateDiaryQuery('');
};
watch(() => route.fullPath, () => {
    syncKeywordFromRoute();
}, { immediate: true });
watch(activeKeyword, (value) => {
    if (route.name !== 'admin-diary') {
        return;
    }
    if (value !== keyword.value) {
        keyword.value = value;
    }
});
const handleLogout = async () => {
    try {
        await requestLogout();
    }
    catch (error) {
        console.warn('[logout] failed to notify server', error);
    }
    finally {
        authStore.signOut();
        router.replace({ name: 'admin-login', query: { redirect: route.fullPath } }).catch(() => {
            /* noop */
        });
    }
};
debugger; /* PartiallyEnd: #3632/scriptSetup.vue */
const __VLS_ctx = {};
let __VLS_components;
let __VLS_directives;
/** @type {__VLS_StyleScopedClasses['app-header__left']} */ ;
/** @type {__VLS_StyleScopedClasses['search']} */ ;
/** @type {__VLS_StyleScopedClasses['search']} */ ;
/** @type {__VLS_StyleScopedClasses['search__clear']} */ ;
/** @type {__VLS_StyleScopedClasses['search__clear']} */ ;
/** @type {__VLS_StyleScopedClasses['search__submit']} */ ;
/** @type {__VLS_StyleScopedClasses['search__submit']} */ ;
/** @type {__VLS_StyleScopedClasses['search__submit']} */ ;
/** @type {__VLS_StyleScopedClasses['account__trigger']} */ ;
/** @type {__VLS_StyleScopedClasses['account__avatar']} */ ;
/** @type {__VLS_StyleScopedClasses['account__trigger']} */ ;
/** @type {__VLS_StyleScopedClasses['account__avatar']} */ ;
/** @type {__VLS_StyleScopedClasses['account']} */ ;
/** @type {__VLS_StyleScopedClasses['account__menu']} */ ;
/** @type {__VLS_StyleScopedClasses['account']} */ ;
/** @type {__VLS_StyleScopedClasses['account__menu']} */ ;
/** @type {__VLS_StyleScopedClasses['account__menu']} */ ;
/** @type {__VLS_StyleScopedClasses['account__action']} */ ;
/** @type {__VLS_StyleScopedClasses['account__action']} */ ;
/** @type {__VLS_StyleScopedClasses['account__action']} */ ;
/** @type {__VLS_StyleScopedClasses['app-header']} */ ;
/** @type {__VLS_StyleScopedClasses['app-header__right']} */ ;
/** @type {__VLS_StyleScopedClasses['search']} */ ;
/** @type {__VLS_StyleScopedClasses['search']} */ ;
// CSS variable injection 
// CSS variable injection end 
__VLS_asFunctionalElement(__VLS_intrinsicElements.header, __VLS_intrinsicElements.header)({
    ...{ class: "app-header" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "app-header__left" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.h2, __VLS_intrinsicElements.h2)({});
(__VLS_ctx.pageTitle);
__VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({});
(__VLS_ctx.pageSubtitle);
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "app-header__right" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "search" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
    ...{ class: "search__icon" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
    ...{ onKeydown: (__VLS_ctx.handleSearch) },
    type: "search",
    placeholder: "在文章、日记或简历中检索...",
});
(__VLS_ctx.keyword);
if (__VLS_ctx.keyword) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (__VLS_ctx.handleClear) },
        type: "button",
        ...{ class: "search__clear" },
        'aria-label': "清除检索",
    });
}
__VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
    ...{ onClick: (__VLS_ctx.handleSearch) },
    type: "button",
    ...{ class: "search__submit" },
    disabled: (!__VLS_ctx.keyword.trim()),
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "account" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
    ...{ class: "account__trigger" },
    type: "button",
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
    ...{ class: "account__avatar" },
});
(__VLS_ctx.initials);
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "account__menu" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "account__actions" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
    ...{ onClick: (__VLS_ctx.handleLogout) },
    ...{ class: "account__action" },
    type: "button",
});
/** @type {__VLS_StyleScopedClasses['app-header']} */ ;
/** @type {__VLS_StyleScopedClasses['app-header__left']} */ ;
/** @type {__VLS_StyleScopedClasses['app-header__right']} */ ;
/** @type {__VLS_StyleScopedClasses['search']} */ ;
/** @type {__VLS_StyleScopedClasses['search__icon']} */ ;
/** @type {__VLS_StyleScopedClasses['search__clear']} */ ;
/** @type {__VLS_StyleScopedClasses['search__submit']} */ ;
/** @type {__VLS_StyleScopedClasses['account']} */ ;
/** @type {__VLS_StyleScopedClasses['account__trigger']} */ ;
/** @type {__VLS_StyleScopedClasses['account__avatar']} */ ;
/** @type {__VLS_StyleScopedClasses['account__menu']} */ ;
/** @type {__VLS_StyleScopedClasses['account__actions']} */ ;
/** @type {__VLS_StyleScopedClasses['account__action']} */ ;
var __VLS_dollars;
const __VLS_self = (await import('vue')).defineComponent({
    setup() {
        return {
            keyword: keyword,
            pageTitle: pageTitle,
            pageSubtitle: pageSubtitle,
            initials: initials,
            handleSearch: handleSearch,
            handleClear: handleClear,
            handleLogout: handleLogout,
        };
    },
});
export default (await import('vue')).defineComponent({
    setup() {
        return {};
    },
});
; /* PartiallyEnd: #4569/main.vue */
