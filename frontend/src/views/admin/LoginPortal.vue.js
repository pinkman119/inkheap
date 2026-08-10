import { computed, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/auth';
const route = useRoute();
const router = useRouter();
const authStore = useAuthStore();
const username = ref('');
const password = ref('');
const submitting = ref(false);
const errorMessage = ref('');
const showPassword = ref(false);
const redirect = computed(() => route.query.redirect || '/admin/dashboard');
if (!authStore.ready) {
    authStore.initialize();
}
const togglePassword = () => {
    showPassword.value = !showPassword.value;
};
const handleSubmit = async () => {
    if (submitting.value)
        return;
    submitting.value = true;
    errorMessage.value = '';
    try {
        // 先不接入登陆
        // const response = await login({ username: username.value, password: password.value });
        // authStore.setSession({
        //   token: response.accessToken,
        //   tokenType: response.tokenType,
        //   username: response.username,
        //   roles: response.roles,
        //   expiresIn: response.expiresIn
        // });
        // 临时设置认证状态，通过路由守卫
        authStore.setSession({
            token: 'mock-token',
            tokenType: 'Bearer',
            username: username.value,
            roles: ['admin'],
            expiresIn: 3600
        });
        await router.replace(redirect.value);
    }
    catch (error) {
        console.error('[login] failed', error);
        errorMessage.value = '登录失败，请检查用户名和密码';
    }
    finally {
        submitting.value = false;
    }
};
debugger; /* PartiallyEnd: #3632/scriptSetup.vue */
const __VLS_ctx = {};
let __VLS_components;
let __VLS_directives;
/** @type {__VLS_StyleScopedClasses['auth-hero']} */ ;
/** @type {__VLS_StyleScopedClasses['auth-hero']} */ ;
/** @type {__VLS_StyleScopedClasses['auth-panel__header']} */ ;
/** @type {__VLS_StyleScopedClasses['auth-form']} */ ;
/** @type {__VLS_StyleScopedClasses['auth-form']} */ ;
/** @type {__VLS_StyleScopedClasses['auth-form']} */ ;
/** @type {__VLS_StyleScopedClasses['input-password']} */ ;
/** @type {__VLS_StyleScopedClasses['input-password']} */ ;
/** @type {__VLS_StyleScopedClasses['input-password']} */ ;
/** @type {__VLS_StyleScopedClasses['auth-submit']} */ ;
/** @type {__VLS_StyleScopedClasses['auth-submit']} */ ;
/** @type {__VLS_StyleScopedClasses['auth-panel__footer']} */ ;
/** @type {__VLS_StyleScopedClasses['auth-shell']} */ ;
/** @type {__VLS_StyleScopedClasses['auth-hero']} */ ;
/** @type {__VLS_StyleScopedClasses['auth-panel']} */ ;
// CSS variable injection 
// CSS variable injection end 
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "auth-shell" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "auth-hero" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "auth-hero__badge" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.h1, __VLS_intrinsicElements.h1)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "auth-panel" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "auth-panel__header" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.h2, __VLS_intrinsicElements.h2)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.form, __VLS_intrinsicElements.form)({
    ...{ onSubmit: (__VLS_ctx.handleSubmit) },
    ...{ class: "auth-form" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
    value: (__VLS_ctx.username),
    type: "text",
    autocomplete: "username",
    placeholder: "例如：admin",
    required: true,
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.label, __VLS_intrinsicElements.label)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "input-password" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.input)({
    type: (__VLS_ctx.showPassword ? 'text' : 'password'),
    autocomplete: "current-password",
    placeholder: "请输入密码",
    required: true,
});
(__VLS_ctx.password);
__VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
    ...{ onClick: (__VLS_ctx.togglePassword) },
    type: "button",
    'aria-label': "切换密码可见性",
});
(__VLS_ctx.showPassword ? '🙈' : '👁');
__VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
    ...{ class: "auth-submit" },
    type: "submit",
    disabled: (__VLS_ctx.submitting),
});
if (!__VLS_ctx.submitting) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
}
else {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
}
if (__VLS_ctx.errorMessage) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
        ...{ class: "auth-error" },
    });
    (__VLS_ctx.errorMessage);
}
__VLS_asFunctionalElement(__VLS_intrinsicElements.footer, __VLS_intrinsicElements.footer)({
    ...{ class: "auth-panel__footer" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
const __VLS_0 = {}.RouterLink;
/** @type {[typeof __VLS_components.RouterLink, typeof __VLS_components.RouterLink, ]} */ ;
// @ts-ignore
const __VLS_1 = __VLS_asFunctionalComponent(__VLS_0, new __VLS_0({
    to: "/",
    ...{ class: "link" },
}));
const __VLS_2 = __VLS_1({
    to: "/",
    ...{ class: "link" },
}, ...__VLS_functionalComponentArgsRest(__VLS_1));
__VLS_3.slots.default;
var __VLS_3;
/** @type {__VLS_StyleScopedClasses['auth-shell']} */ ;
/** @type {__VLS_StyleScopedClasses['auth-hero']} */ ;
/** @type {__VLS_StyleScopedClasses['auth-hero__badge']} */ ;
/** @type {__VLS_StyleScopedClasses['auth-panel']} */ ;
/** @type {__VLS_StyleScopedClasses['auth-panel__header']} */ ;
/** @type {__VLS_StyleScopedClasses['auth-form']} */ ;
/** @type {__VLS_StyleScopedClasses['input-password']} */ ;
/** @type {__VLS_StyleScopedClasses['auth-submit']} */ ;
/** @type {__VLS_StyleScopedClasses['auth-error']} */ ;
/** @type {__VLS_StyleScopedClasses['auth-panel__footer']} */ ;
/** @type {__VLS_StyleScopedClasses['link']} */ ;
var __VLS_dollars;
const __VLS_self = (await import('vue')).defineComponent({
    setup() {
        return {
            username: username,
            password: password,
            submitting: submitting,
            errorMessage: errorMessage,
            showPassword: showPassword,
            togglePassword: togglePassword,
            handleSubmit: handleSubmit,
        };
    },
});
export default (await import('vue')).defineComponent({
    setup() {
        return {};
    },
});
; /* PartiallyEnd: #4569/main.vue */
