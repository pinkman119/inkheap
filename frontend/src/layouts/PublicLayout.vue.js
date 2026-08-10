import { onMounted } from 'vue';
import PublicHeader from '../components/public/PublicHeader.vue';
import PublicFooter from '../components/public/PublicFooter.vue';
// 静态加载前台样式，避免动态加载导致的布局跳动
import '../styles/public.css';
onMounted(() => {
    // 确保样式表已加载
    if (!document.querySelector('link[href*="public.css"]')) {
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = new URL('/src/styles/public.css', import.meta.url).href;
        document.head.appendChild(link);
    }
});
debugger; /* PartiallyEnd: #3632/scriptSetup.vue */
const __VLS_ctx = {};
let __VLS_components;
let __VLS_directives;
// CSS variable injection 
// CSS variable injection end 
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "public-layout" },
});
/** @type {[typeof PublicHeader, ]} */ ;
// @ts-ignore
const __VLS_0 = __VLS_asFunctionalComponent(PublicHeader, new PublicHeader({}));
const __VLS_1 = __VLS_0({}, ...__VLS_functionalComponentArgsRest(__VLS_0));
__VLS_asFunctionalElement(__VLS_intrinsicElements.main, __VLS_intrinsicElements.main)({
    ...{ class: "public-layout__content" },
});
var __VLS_3 = {};
/** @type {[typeof PublicFooter, ]} */ ;
// @ts-ignore
const __VLS_5 = __VLS_asFunctionalComponent(PublicFooter, new PublicFooter({}));
const __VLS_6 = __VLS_5({}, ...__VLS_functionalComponentArgsRest(__VLS_5));
/** @type {__VLS_StyleScopedClasses['public-layout']} */ ;
/** @type {__VLS_StyleScopedClasses['public-layout__content']} */ ;
// @ts-ignore
var __VLS_4 = __VLS_3;
var __VLS_dollars;
const __VLS_self = (await import('vue')).defineComponent({
    setup() {
        return {
            PublicHeader: PublicHeader,
            PublicFooter: PublicFooter,
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
