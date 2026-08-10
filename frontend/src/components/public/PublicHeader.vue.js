import { RouterLink } from 'vue-router';
import { ref, onMounted, watch } from 'vue';
const isDarkMode = ref(false);
const toggleTheme = () => {
    isDarkMode.value = !isDarkMode.value;
};
// 挂载时检查系统主题偏好
onMounted(() => {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    isDarkMode.value = prefersDark;
});
// 监听 isDarkMode 变化，更新页面主题
watch(isDarkMode, (newValue) => {
    if (newValue) {
        document.body.classList.add('dark-mode');
    }
    else {
        document.body.classList.remove('dark-mode');
    }
}, { immediate: true });
debugger; /* PartiallyEnd: #3632/scriptSetup.vue */
const __VLS_ctx = {};
let __VLS_components;
let __VLS_directives;
/** @type {__VLS_StyleScopedClasses['nav-item']} */ ;
/** @type {__VLS_StyleScopedClasses['public-header__nav']} */ ;
/** @type {__VLS_StyleScopedClasses['nav-item']} */ ;
/** @type {__VLS_StyleScopedClasses['theme-toggle']} */ ;
// CSS variable injection 
// CSS variable injection end 
__VLS_asFunctionalElement(__VLS_intrinsicElements.header, __VLS_intrinsicElements.header)({
    ...{ class: "public-header" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "container" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "public-header__inner" },
});
const __VLS_0 = {}.RouterLink;
/** @type {[typeof __VLS_components.RouterLink, typeof __VLS_components.RouterLink, ]} */ ;
// @ts-ignore
const __VLS_1 = __VLS_asFunctionalComponent(__VLS_0, new __VLS_0({
    to: "/",
    ...{ class: "public-header__logo" },
}));
const __VLS_2 = __VLS_1({
    to: "/",
    ...{ class: "public-header__logo" },
}, ...__VLS_functionalComponentArgsRest(__VLS_1));
__VLS_3.slots.default;
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
    ...{ class: "logo-text" },
});
var __VLS_3;
__VLS_asFunctionalElement(__VLS_intrinsicElements.nav, __VLS_intrinsicElements.nav)({
    ...{ class: "public-header__nav" },
});
const __VLS_4 = {}.RouterLink;
/** @type {[typeof __VLS_components.RouterLink, typeof __VLS_components.RouterLink, ]} */ ;
// @ts-ignore
const __VLS_5 = __VLS_asFunctionalComponent(__VLS_4, new __VLS_4({
    to: "/",
    ...{ class: "nav-item" },
    activeClass: "nav-item--active",
}));
const __VLS_6 = __VLS_5({
    to: "/",
    ...{ class: "nav-item" },
    activeClass: "nav-item--active",
}, ...__VLS_functionalComponentArgsRest(__VLS_5));
__VLS_7.slots.default;
var __VLS_7;
const __VLS_8 = {}.RouterLink;
/** @type {[typeof __VLS_components.RouterLink, typeof __VLS_components.RouterLink, ]} */ ;
// @ts-ignore
const __VLS_9 = __VLS_asFunctionalComponent(__VLS_8, new __VLS_8({
    to: (__VLS_ctx.isDarkMode ? '/notes' : '/docs'),
    ...{ class: "nav-item" },
    activeClass: "nav-item--active",
}));
const __VLS_10 = __VLS_9({
    to: (__VLS_ctx.isDarkMode ? '/notes' : '/docs'),
    ...{ class: "nav-item" },
    activeClass: "nav-item--active",
}, ...__VLS_functionalComponentArgsRest(__VLS_9));
__VLS_11.slots.default;
(__VLS_ctx.isDarkMode ? '小记' : '文档');
var __VLS_11;
const __VLS_12 = {}.RouterLink;
/** @type {[typeof __VLS_components.RouterLink, typeof __VLS_components.RouterLink, ]} */ ;
// @ts-ignore
const __VLS_13 = __VLS_asFunctionalComponent(__VLS_12, new __VLS_12({
    to: (__VLS_ctx.isDarkMode ? '/life' : '/resume'),
    ...{ class: "nav-item" },
    activeClass: "nav-item--active",
}));
const __VLS_14 = __VLS_13({
    to: (__VLS_ctx.isDarkMode ? '/life' : '/resume'),
    ...{ class: "nav-item" },
    activeClass: "nav-item--active",
}, ...__VLS_functionalComponentArgsRest(__VLS_13));
__VLS_15.slots.default;
(__VLS_ctx.isDarkMode ? '生活' : '简历');
var __VLS_15;
const __VLS_16 = {}.RouterLink;
/** @type {[typeof __VLS_components.RouterLink, typeof __VLS_components.RouterLink, ]} */ ;
// @ts-ignore
const __VLS_17 = __VLS_asFunctionalComponent(__VLS_16, new __VLS_16({
    to: (__VLS_ctx.isDarkMode ? '/dark-stats' : '/stats'),
    ...{ class: "nav-item" },
    activeClass: "nav-item--active",
}));
const __VLS_18 = __VLS_17({
    to: (__VLS_ctx.isDarkMode ? '/dark-stats' : '/stats'),
    ...{ class: "nav-item" },
    activeClass: "nav-item--active",
}, ...__VLS_functionalComponentArgsRest(__VLS_17));
__VLS_19.slots.default;
(__VLS_ctx.isDarkMode ? '蒸馏' : '蒸馏');
var __VLS_19;
__VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
    ...{ onClick: (__VLS_ctx.toggleTheme) },
    ...{ class: "theme-toggle" },
    title: (__VLS_ctx.isDarkMode ? '切换到亮色模式' : '切换到暗色模式'),
});
if (__VLS_ctx.isDarkMode) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.svg, __VLS_intrinsicElements.svg)({
        ...{ class: "theme-icon" },
        viewBox: "0 0 24 24",
        fill: "none",
        stroke: "currentColor",
        'stroke-width': "2",
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.circle, __VLS_intrinsicElements.circle)({
        cx: "12",
        cy: "12",
        r: "5",
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.line, __VLS_intrinsicElements.line)({
        x1: "12",
        y1: "1",
        x2: "12",
        y2: "3",
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.line, __VLS_intrinsicElements.line)({
        x1: "12",
        y1: "21",
        x2: "12",
        y2: "23",
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.line, __VLS_intrinsicElements.line)({
        x1: "4.22",
        y1: "4.22",
        x2: "5.64",
        y2: "5.64",
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.line, __VLS_intrinsicElements.line)({
        x1: "18.36",
        y1: "18.36",
        x2: "19.78",
        y2: "19.78",
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.line, __VLS_intrinsicElements.line)({
        x1: "1",
        y1: "12",
        x2: "3",
        y2: "12",
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.line, __VLS_intrinsicElements.line)({
        x1: "21",
        y1: "12",
        x2: "23",
        y2: "12",
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.line, __VLS_intrinsicElements.line)({
        x1: "4.22",
        y1: "19.78",
        x2: "5.64",
        y2: "18.36",
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.line, __VLS_intrinsicElements.line)({
        x1: "18.36",
        y1: "5.64",
        x2: "19.78",
        y2: "4.22",
    });
}
else {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.svg, __VLS_intrinsicElements.svg)({
        ...{ class: "theme-icon" },
        viewBox: "0 0 24 24",
        fill: "none",
        stroke: "currentColor",
        'stroke-width': "2",
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.path, __VLS_intrinsicElements.path)({
        d: "M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z",
    });
}
/** @type {__VLS_StyleScopedClasses['public-header']} */ ;
/** @type {__VLS_StyleScopedClasses['container']} */ ;
/** @type {__VLS_StyleScopedClasses['public-header__inner']} */ ;
/** @type {__VLS_StyleScopedClasses['public-header__logo']} */ ;
/** @type {__VLS_StyleScopedClasses['logo-text']} */ ;
/** @type {__VLS_StyleScopedClasses['public-header__nav']} */ ;
/** @type {__VLS_StyleScopedClasses['nav-item']} */ ;
/** @type {__VLS_StyleScopedClasses['nav-item']} */ ;
/** @type {__VLS_StyleScopedClasses['nav-item']} */ ;
/** @type {__VLS_StyleScopedClasses['nav-item']} */ ;
/** @type {__VLS_StyleScopedClasses['theme-toggle']} */ ;
/** @type {__VLS_StyleScopedClasses['theme-icon']} */ ;
/** @type {__VLS_StyleScopedClasses['theme-icon']} */ ;
var __VLS_dollars;
const __VLS_self = (await import('vue')).defineComponent({
    setup() {
        return {
            RouterLink: RouterLink,
            isDarkMode: isDarkMode,
            toggleTheme: toggleTheme,
        };
    },
});
export default (await import('vue')).defineComponent({
    setup() {
        return {};
    },
});
; /* PartiallyEnd: #4569/main.vue */
