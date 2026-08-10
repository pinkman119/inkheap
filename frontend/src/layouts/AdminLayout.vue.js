import { computed, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import AdminHeader from '../components/admin/AdminHeader.vue';
const route = useRoute();
const links = computed(() => [
    { to: '/admin/dashboard', label: '总览', icon: '⌘' },
    { to: '/admin/articles', label: '文章管理', icon: '✎' },
    { to: '/admin/diary', label: '日记管理', icon: '☀︎' },
    { to: '/admin/profile', label: '个人档案', icon: '✶' }
]);
const isAuthLayout = computed(() => route.meta.layout === 'auth');
onMounted(() => {
    // 动态加载后台样式
    if (!document.querySelector('link[href*="admin.css"]')) {
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = new URL('/src/styles/admin.css', import.meta.url).href;
        document.head.appendChild(link);
    }
});
debugger; /* PartiallyEnd: #3632/scriptSetup.vue */
const __VLS_ctx = {};
let __VLS_components;
let __VLS_directives;
/** @type {__VLS_StyleScopedClasses['brand']} */ ;
/** @type {__VLS_StyleScopedClasses['brand']} */ ;
/** @type {__VLS_StyleScopedClasses['nav-link']} */ ;
/** @type {__VLS_StyleScopedClasses['app-shell']} */ ;
/** @type {__VLS_StyleScopedClasses['app-shell__sidebar']} */ ;
/** @type {__VLS_StyleScopedClasses['nav-link']} */ ;
/** @type {__VLS_StyleScopedClasses['app-shell__main']} */ ;
/** @type {__VLS_StyleScopedClasses['app-shell__content']} */ ;
// CSS variable injection 
// CSS variable injection end 
if (__VLS_ctx.isAuthLayout) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "auth-layout" },
    });
    var __VLS_0 = {};
}
else {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "app-shell" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.aside, __VLS_intrinsicElements.aside)({
        ...{ class: "app-shell__sidebar" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "brand" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span)({
        ...{ class: "brand__dot" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.h1, __VLS_intrinsicElements.h1)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.nav, __VLS_intrinsicElements.nav)({});
    for (const [link] of __VLS_getVForSourceType((__VLS_ctx.links))) {
        const __VLS_2 = {}.RouterLink;
        /** @type {[typeof __VLS_components.RouterLink, typeof __VLS_components.RouterLink, ]} */ ;
        // @ts-ignore
        const __VLS_3 = __VLS_asFunctionalComponent(__VLS_2, new __VLS_2({
            key: (link.to),
            to: (link.to),
            ...{ class: "nav-link" },
            activeClass: "nav-link--active",
        }));
        const __VLS_4 = __VLS_3({
            key: (link.to),
            to: (link.to),
            ...{ class: "nav-link" },
            activeClass: "nav-link--active",
        }, ...__VLS_functionalComponentArgsRest(__VLS_3));
        __VLS_5.slots.default;
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "nav-link__icon" },
        });
        (link.icon);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
        (link.label);
        var __VLS_5;
    }
    __VLS_asFunctionalElement(__VLS_intrinsicElements.main, __VLS_intrinsicElements.main)({
        ...{ class: "app-shell__main" },
    });
    /** @type {[typeof AdminHeader, ]} */ ;
    // @ts-ignore
    const __VLS_6 = __VLS_asFunctionalComponent(AdminHeader, new AdminHeader({}));
    const __VLS_7 = __VLS_6({}, ...__VLS_functionalComponentArgsRest(__VLS_6));
    __VLS_asFunctionalElement(__VLS_intrinsicElements.section, __VLS_intrinsicElements.section)({
        ...{ class: "app-shell__content" },
    });
    var __VLS_9 = {};
}
/** @type {__VLS_StyleScopedClasses['auth-layout']} */ ;
/** @type {__VLS_StyleScopedClasses['app-shell']} */ ;
/** @type {__VLS_StyleScopedClasses['app-shell__sidebar']} */ ;
/** @type {__VLS_StyleScopedClasses['brand']} */ ;
/** @type {__VLS_StyleScopedClasses['brand__dot']} */ ;
/** @type {__VLS_StyleScopedClasses['nav-link']} */ ;
/** @type {__VLS_StyleScopedClasses['nav-link__icon']} */ ;
/** @type {__VLS_StyleScopedClasses['app-shell__main']} */ ;
/** @type {__VLS_StyleScopedClasses['app-shell__content']} */ ;
// @ts-ignore
var __VLS_1 = __VLS_0, __VLS_10 = __VLS_9;
var __VLS_dollars;
const __VLS_self = (await import('vue')).defineComponent({
    setup() {
        return {
            AdminHeader: AdminHeader,
            links: links,
            isAuthLayout: isAuthLayout,
        };
    },
});
const __VLS_component = (await import('vue')).defineComponent({
    setup() {
        return {};
    },
});
export default {};
; /* PartiallyEnd: #4569/main.vue */
