import { computed } from 'vue';
const currentYear = computed(() => new Date().getFullYear());
debugger; /* PartiallyEnd: #3632/scriptSetup.vue */
const __VLS_ctx = {};
let __VLS_components;
let __VLS_directives;
/** @type {__VLS_StyleScopedClasses['footer-link']} */ ;
/** @type {__VLS_StyleScopedClasses['container']} */ ;
// CSS variable injection 
// CSS variable injection end 
__VLS_asFunctionalElement(__VLS_intrinsicElements.footer, __VLS_intrinsicElements.footer)({
    ...{ class: "public-footer" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "container" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
    ...{ class: "public-footer__text" },
});
(__VLS_ctx.currentYear);
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "public-footer__links" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.a, __VLS_intrinsicElements.a)({
    href: "https://github.com",
    target: "_blank",
    rel: "noopener",
    ...{ class: "footer-link" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
    ...{ class: "footer-separator" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.a, __VLS_intrinsicElements.a)({
    href: "mailto:hello@example.com",
    ...{ class: "footer-link" },
});
/** @type {__VLS_StyleScopedClasses['public-footer']} */ ;
/** @type {__VLS_StyleScopedClasses['container']} */ ;
/** @type {__VLS_StyleScopedClasses['public-footer__text']} */ ;
/** @type {__VLS_StyleScopedClasses['public-footer__links']} */ ;
/** @type {__VLS_StyleScopedClasses['footer-link']} */ ;
/** @type {__VLS_StyleScopedClasses['footer-separator']} */ ;
/** @type {__VLS_StyleScopedClasses['footer-link']} */ ;
var __VLS_dollars;
const __VLS_self = (await import('vue')).defineComponent({
    setup() {
        return {
            currentYear: currentYear,
        };
    },
});
export default (await import('vue')).defineComponent({
    setup() {
        return {};
    },
});
; /* PartiallyEnd: #4569/main.vue */
