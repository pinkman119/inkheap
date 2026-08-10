import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
const router = useRouter();
const loading = ref(true);
const error = ref(null);
const articles = ref([]);
// TODO: 替换为真实 API 调用
const loadArticles = async () => {
    loading.value = true;
    error.value = null;
    try {
        // 模拟数据
        await new Promise(resolve => setTimeout(resolve, 500));
        articles.value = [
            {
                id: '1',
                title: '信息架构的 5 条黄金法则',
                excerpt: '探讨如何根据渠道、受众、时效构建多维度内容分发逻辑，提升曝光与互动。',
                category: '设计洞察',
                publishedAt: '2024-05-15'
            },
            {
                id: '2',
                title: '多维内容分发的优先级算法',
                excerpt: '探索内容分发算法的设计原则和实现细节，帮助你更好地理解推荐系统。',
                category: '产品策略',
                publishedAt: '2024-05-10'
            },
            {
                id: '3',
                title: '设计师的年度总结',
                excerpt: '回顾过去一年的成长与挑战，分享设计工作中的心得体会。',
                category: '个人随笔',
                publishedAt: '2024-04-28'
            }
        ];
    }
    catch (err) {
        error.value = '加载文章失败，请稍后重试。';
    }
    finally {
        loading.value = false;
    }
};
const formatDate = (date) => {
    const d = new Date(date);
    return d.toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' });
};
const goToArticle = (id) => {
    router.push(`/articles/${id}`);
};
onMounted(() => {
    loadArticles();
});
debugger; /* PartiallyEnd: #3632/scriptSetup.vue */
const __VLS_ctx = {};
let __VLS_components;
let __VLS_directives;
/** @type {__VLS_StyleScopedClasses['articles-page__header']} */ ;
/** @type {__VLS_StyleScopedClasses['article-card']} */ ;
/** @type {__VLS_StyleScopedClasses['articles-page__header']} */ ;
/** @type {__VLS_StyleScopedClasses['article-card']} */ ;
// CSS variable injection 
// CSS variable injection end 
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "articles-page" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.header, __VLS_intrinsicElements.header)({
    ...{ class: "articles-page__header" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.h1, __VLS_intrinsicElements.h1)({});
__VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
    ...{ class: "subtitle" },
});
if (__VLS_ctx.loading) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "loading-state" },
    });
}
else if (__VLS_ctx.error) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "error-state" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({});
    (__VLS_ctx.error);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (__VLS_ctx.loadArticles) },
        ...{ class: "btn btn-secondary" },
    });
}
else if (__VLS_ctx.articles.length === 0) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "empty-state" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({});
}
else {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "articles-grid" },
    });
    for (const [article] of __VLS_getVForSourceType((__VLS_ctx.articles))) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.article, __VLS_intrinsicElements.article)({
            ...{ onClick: (...[$event]) => {
                    if (!!(__VLS_ctx.loading))
                        return;
                    if (!!(__VLS_ctx.error))
                        return;
                    if (!!(__VLS_ctx.articles.length === 0))
                        return;
                    __VLS_ctx.goToArticle(article.id);
                } },
            key: (article.id),
            ...{ class: "article-card" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
            ...{ class: "article-card__category" },
        });
        (article.category);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.h2, __VLS_intrinsicElements.h2)({
            ...{ class: "article-card__title" },
        });
        (article.title);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
            ...{ class: "article-card__excerpt" },
        });
        (article.excerpt);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.time, __VLS_intrinsicElements.time)({
            ...{ class: "article-card__date" },
        });
        (__VLS_ctx.formatDate(article.publishedAt));
    }
}
/** @type {__VLS_StyleScopedClasses['articles-page']} */ ;
/** @type {__VLS_StyleScopedClasses['articles-page__header']} */ ;
/** @type {__VLS_StyleScopedClasses['subtitle']} */ ;
/** @type {__VLS_StyleScopedClasses['loading-state']} */ ;
/** @type {__VLS_StyleScopedClasses['error-state']} */ ;
/** @type {__VLS_StyleScopedClasses['btn']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-secondary']} */ ;
/** @type {__VLS_StyleScopedClasses['empty-state']} */ ;
/** @type {__VLS_StyleScopedClasses['articles-grid']} */ ;
/** @type {__VLS_StyleScopedClasses['article-card']} */ ;
/** @type {__VLS_StyleScopedClasses['article-card__category']} */ ;
/** @type {__VLS_StyleScopedClasses['article-card__title']} */ ;
/** @type {__VLS_StyleScopedClasses['article-card__excerpt']} */ ;
/** @type {__VLS_StyleScopedClasses['article-card__date']} */ ;
var __VLS_dollars;
const __VLS_self = (await import('vue')).defineComponent({
    setup() {
        return {
            loading: loading,
            error: error,
            articles: articles,
            loadArticles: loadArticles,
            formatDate: formatDate,
            goToArticle: goToArticle,
        };
    },
});
export default (await import('vue')).defineComponent({
    setup() {
        return {};
    },
});
; /* PartiallyEnd: #4569/main.vue */
