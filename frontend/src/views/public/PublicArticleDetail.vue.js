import { ref, computed, onMounted, onUnmounted } from 'vue';
import { marked } from 'marked';
// 模拟 Markdown 文章内容
const markdownContent = ref(`
探讨如何根据渠道、受众、时效构建多维度内容分发逻辑，提升曝光与互动。本文将深入分析信息架构的核心原则，分享在实际项目中的应用经验。
配图 1. 用户中心原则

信息架构的首要原则是以用户为中心。无论设计多么复杂的信息系统，最终目标都是让用户能够快速、准确地找到所需信息。这要求我们在设计过程中始终站在用户的角度思考，理解他们的需求、习惯和期望。

# 1.1 用户调研方法

常见的用户调研方法包括问卷调查、用户访谈、焦点小组和可用性测试。每种方法都有其适用场景和局限性，需要根据项目实际情况灵活选择。

# 1.2 用户画像构建

通过收集用户的行为数据、人口统计学特征和心理特征，构建精准的用户画像，帮助团队更好地理解目标用户群体。

## 2. 清晰的层级结构

一个良好的信息架构需要清晰的层级结构。通过合理的分类和分组，使用户能够轻松理解信息的组织方式。层级不宜过深，一般建议不超过3-4层，以避免用户迷失在复杂的导航中。

### 2.1 金字塔结构

将最重要的信息放在最上层，逐步展开细节。这种结构符合人类的认知习惯，让用户能够快速获取核心信息。

### 2.2 矩阵结构

对于需要多维度访问的信息，矩阵结构允许用户从不同入口到达同一内容，提高了信息的可访问性。

## 3. 一致性设计

在整个系统中保持一致的设计语言和交互模式。一致的导航、标签和操作方式能够降低用户的学习成本，提升用户体验。一致性不仅体现在视觉上，还包括交互逻辑和术语使用。

### 3.1 视觉一致性

统一色彩、字体、图标和间距等视觉元素，确保用户在不同页面间切换时不会感到困惑。

### 3.2 交互一致性

相同功能的操作方式应保持一致，例如所有删除操作都使用相同的确认流程，所有表单都采用相同的验证方式。

## 4. 灵活的导航系统

提供多种导航方式，满足不同用户的需求。除了传统的菜单导航，还可以考虑搜索、标签、相关内容推荐等方式。灵活的导航系统能够适应不同场景和用户习惯。

### 4.1 面包屑导航

面包屑导航帮助用户了解当前位置，并能快速返回上级页面。它是层级结构网站中不可或缺的导航辅助工具。

### 4.2 搜索导航

对于内容丰富的网站，搜索功能比菜单导航更高效。良好的搜索体验包括智能提示、筛选和排序功能。

## 5. 持续优化与迭代

信息架构不是一成不变的，需要根据用户反馈和数据分析持续优化。通过用户测试、数据分析等手段，不断调整和改进信息架构，使其更加符合用户需求。

### 5.1 数据驱动决策

通过分析用户行为数据（如点击热力图、页面停留时间、跳出率等），发现信息架构中的问题并制定优化方案。

### 5.2 A/B 测试

在推出新的信息架构前，通过 A/B 测试验证其效果，确保改动确实能提升用户体验，而非仅凭直觉做决策。

---

> 好的信息架构就像一座城市的道路规划——让每个人都能轻松找到目的地，同时享受沿途的风景。
`);
// 文章元数据
const articleData = {
    title: '信息架构的 5 条黄金法则',
    author: '张三',
    date: '2024-05-15',
    category: '设计洞察',
    intro: '探讨如何根据渠道、受众、时效构建多维度内容分发逻辑，提升曝光与互动。本文将深入分析信息架构的核心原则，分享在实际项目中的应用经验。',
    cover: 'https://picsum.photos/800/400',
    tags: ['信息架构', '用户体验', '设计原则'],
    views: 1286,
    likes: 73
};
// 文章统计
const wordCount = computed(() => {
    const text = markdownContent.value.replace(/[#*>\-`]/g, '').replace(/\s+/g, '');
    return text.length.toLocaleString();
});
const readingTime = computed(() => {
    const text = markdownContent.value.replace(/[#*>\-`]/g, '').replace(/\s+/g, '');
    const minutes = Math.ceil(text.length / 400); // 中文约400字/分钟
    return `${minutes} 分钟`;
});
const tocHeadings = ref([]);
const currentSection = ref('');
// 自定义 renderer：给标题添加 id
const renderer = new marked.Renderer();
let headingIndex = 0;
renderer.heading = function ({ text, depth }) {
    const id = `heading-${headingIndex++}`;
    return `<h${depth} id="${id}">${text}</h${depth}>`;
};
marked.setOptions({ renderer });
// 渲染 Markdown 为 HTML
const renderedContent = computed(() => {
    headingIndex = 0;
    const headings = [];
    // 先解析提取标题
    const tokens = marked.lexer(markdownContent.value);
    for (const token of tokens) {
        if (token.type === 'heading' && token.depth >= 2) {
            const id = `heading-${headings.length}`;
            headings.push({
                id,
                text: token.text,
                level: token.depth
            });
        }
    }
    tocHeadings.value = headings;
    if (headings.length > 0 && !currentSection.value) {
        currentSection.value = headings[0].id;
    }
    return marked(markdownContent.value);
});
// 滚动到指定标题
const scrollToHeading = (headingId) => {
    const element = document.getElementById(headingId);
    if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'start' });
        currentSection.value = headingId;
    }
};
// 滚动监听：高亮当前可见的标题
const handleScroll = () => {
    const headings = tocHeadings.value;
    for (let i = headings.length - 1; i >= 0; i--) {
        const el = document.getElementById(headings[i].id);
        if (el) {
            const rect = el.getBoundingClientRect();
            if (rect.top <= 100) {
                currentSection.value = headings[i].id;
                return;
            }
        }
    }
    if (headings.length > 0) {
        currentSection.value = headings[0].id;
    }
};
onMounted(() => {
    window.addEventListener('scroll', handleScroll);
});
onUnmounted(() => {
    window.removeEventListener('scroll', handleScroll);
});
debugger; /* PartiallyEnd: #3632/scriptSetup.vue */
const __VLS_ctx = {};
let __VLS_components;
let __VLS_directives;
/** @type {__VLS_StyleScopedClasses['article-meta']} */ ;
/** @type {__VLS_StyleScopedClasses['markdown-body']} */ ;
/** @type {__VLS_StyleScopedClasses['markdown-body']} */ ;
/** @type {__VLS_StyleScopedClasses['markdown-body']} */ ;
/** @type {__VLS_StyleScopedClasses['markdown-body']} */ ;
/** @type {__VLS_StyleScopedClasses['markdown-body']} */ ;
/** @type {__VLS_StyleScopedClasses['markdown-body']} */ ;
/** @type {__VLS_StyleScopedClasses['markdown-body']} */ ;
/** @type {__VLS_StyleScopedClasses['markdown-body']} */ ;
/** @type {__VLS_StyleScopedClasses['markdown-body']} */ ;
/** @type {__VLS_StyleScopedClasses['markdown-body']} */ ;
/** @type {__VLS_StyleScopedClasses['markdown-body']} */ ;
/** @type {__VLS_StyleScopedClasses['markdown-body']} */ ;
/** @type {__VLS_StyleScopedClasses['markdown-body']} */ ;
/** @type {__VLS_StyleScopedClasses['markdown-body']} */ ;
/** @type {__VLS_StyleScopedClasses['share-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['like-btn']} */ ;
/** @type {__VLS_StyleScopedClasses['toc-list']} */ ;
/** @type {__VLS_StyleScopedClasses['toc-list']} */ ;
/** @type {__VLS_StyleScopedClasses['toc-list']} */ ;
/** @type {__VLS_StyleScopedClasses['toc-list']} */ ;
/** @type {__VLS_StyleScopedClasses['toc-link']} */ ;
/** @type {__VLS_StyleScopedClasses['toc-item']} */ ;
/** @type {__VLS_StyleScopedClasses['toc-link']} */ ;
/** @type {__VLS_StyleScopedClasses['toc-header']} */ ;
/** @type {__VLS_StyleScopedClasses['toc-header']} */ ;
/** @type {__VLS_StyleScopedClasses['toc-header']} */ ;
/** @type {__VLS_StyleScopedClasses['toc-header']} */ ;
/** @type {__VLS_StyleScopedClasses['toc-header']} */ ;
/** @type {__VLS_StyleScopedClasses['toc-header']} */ ;
/** @type {__VLS_StyleScopedClasses['toc-header']} */ ;
/** @type {__VLS_StyleScopedClasses['dark']} */ ;
/** @type {__VLS_StyleScopedClasses['toc-header']} */ ;
/** @type {__VLS_StyleScopedClasses['toc-header']} */ ;
/** @type {__VLS_StyleScopedClasses['toc-header']} */ ;
/** @type {__VLS_StyleScopedClasses['toc-header']} */ ;
/** @type {__VLS_StyleScopedClasses['toc-header']} */ ;
/** @type {__VLS_StyleScopedClasses['toc-header']} */ ;
/** @type {__VLS_StyleScopedClasses['toc-icon']} */ ;
/** @type {__VLS_StyleScopedClasses['container']} */ ;
/** @type {__VLS_StyleScopedClasses['article-content']} */ ;
/** @type {__VLS_StyleScopedClasses['article-sidebar']} */ ;
/** @type {__VLS_StyleScopedClasses['article-sidebar']} */ ;
// CSS variable injection 
// CSS variable injection end 
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "article-detail-page" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "container" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "article-content" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.h1, __VLS_intrinsicElements.h1)({
    ...{ class: "article-title" },
});
(__VLS_ctx.articleData.title);
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "article-meta" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
    ...{ class: "author" },
});
(__VLS_ctx.articleData.author);
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
    ...{ class: "date" },
});
(__VLS_ctx.articleData.date);
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
    ...{ class: "category" },
});
(__VLS_ctx.articleData.category);
__VLS_asFunctionalElement(__VLS_intrinsicElements.img, __VLS_intrinsicElements.img)({
    src: (__VLS_ctx.articleData.cover),
    alt: "文章配图",
    ...{ class: "article-cover" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "article-body markdown-body" },
});
__VLS_asFunctionalDirective(__VLS_directives.vHtml)(null, { ...__VLS_directiveBindingRestFields, value: (__VLS_ctx.renderedContent) }, null, null);
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "article-footer" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "tags" },
});
for (const [tag] of __VLS_getVForSourceType((__VLS_ctx.articleData.tags))) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "tag" },
        key: (tag),
    });
    (tag);
}
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "article-sidebar" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "sidebar-section" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "toc-header mb-4 pb-3 border-b border-b-gray-200 dark:border-b-border-dimmed-primary" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "text-sm font-bold text-zinc-700 dark:text-text-dimmed-primary uppercase tracking-wide flex items-center gap-2" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.svg, __VLS_intrinsicElements.svg)({
    t: "1781268672968",
    ...{ class: "icon" },
    viewBox: "0 0 1024 1024",
    version: "1.1",
    xmlns: "http://www.w3.org/2000/svg",
    'p-id': "3315",
    width: "16",
    height: "16",
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.path, __VLS_intrinsicElements.path)({
    d: "M704 128a32 32 0 0 1 0 64h-21.333333v160.789333a10.666667 10.666667 0 0 0 1.088 4.693334l180.874666 369.6c28.48 58.218667 4.384 128.490667-53.813333 156.970666A117.333333 117.333333 0 0 1 759.242667 896H264.746667c-64.8 0-117.333333-52.533333-117.333334-117.333333a117.333333 117.333333 0 0 1 11.946667-51.573334l180.874667-369.621333a10.666667 10.666667 0 0 0 1.088-4.693333V192h-21.333334a32 32 0 0 1-31.946666-30.122667L288 160a32 32 0 0 1 32-32z m51.968 522.666667H268.010667l-51.157334 104.554666A53.333333 53.333333 0 0 0 264.757333 832H759.253333a53.333333 53.333333 0 0 0 47.893334-76.778667L755.978667 650.666667zM618.666667 192H405.333333v160.789333a74.666667 74.666667 0 0 1-7.594666 32.821334L299.328 586.666667h425.322667l-98.389334-201.066667A74.666667 74.666667 0 0 1 618.666667 352.8V192z",
    fill: "#000000",
    'p-id': "3316",
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
    ...{ class: "intro-text" },
});
(__VLS_ctx.articleData.intro);
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "stats-row" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
    ...{ class: "stat-text" },
});
(__VLS_ctx.wordCount);
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
    ...{ class: "stat-dot" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
    ...{ class: "stat-text" },
});
(__VLS_ctx.readingTime);
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
    ...{ class: "stat-dot" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
    ...{ class: "stat-text" },
});
(__VLS_ctx.articleData.views);
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
    ...{ class: "stat-dot" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
    ...{ class: "stat-text" },
});
(__VLS_ctx.articleData.likes);
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "sidebar-section" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "toc-header mb-4 pb-3 border-b border-b-gray-200 dark:border-b-border-dimmed-primary" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "text-sm font-bold text-zinc-700 dark:text-text-dimmed-primary uppercase tracking-wide flex items-center gap-2" },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.svg, __VLS_intrinsicElements.svg)({
    'aria-hidden': "true",
    focusable: "false",
    ...{ class: "octicon octicon-list-unordered" },
    viewBox: "0 0 16 16",
    width: "16",
    height: "16",
    fill: "currentColor",
    display: "inline-block",
    overflow: "visible",
    ...{ style: {} },
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.path, __VLS_intrinsicElements.path)({
    d: "M5.75 2.5h8.5a.75.75.0 010 1.5h-8.5a.75.75.0 010-1.5zm0 5h8.5a.75.75.0 010 1.5h-8.5a.75.75.0 010-1.5zm0 5h8.5a.75.75.0 010 1.5h-8.5a.75.75.0 010-1.5zM2 14a1 1 0 110-2 1 1 0 010 2zm1-6A1 1 0 111 8a1 1 0 012 0zM2 4a1 1 0 110-2 1 1 0 010 2z",
});
__VLS_asFunctionalElement(__VLS_intrinsicElements.ul, __VLS_intrinsicElements.ul)({
    ...{ class: "toc-list" },
});
for (const [heading] of __VLS_getVForSourceType((__VLS_ctx.tocHeadings))) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.li, __VLS_intrinsicElements.li)({
        key: (heading.id),
        ...{ class: "toc-item" },
        ...{ class: ({ active: __VLS_ctx.currentSection === heading.id }) },
        ...{ style: ({ paddingLeft: (heading.level - 2) * 12 + 'px' }) },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.a, __VLS_intrinsicElements.a)({
        ...{ onClick: (...[$event]) => {
                __VLS_ctx.scrollToHeading(heading.id);
            } },
        href: ('#' + heading.id),
        ...{ class: "toc-link" },
    });
    (heading.text);
}
/** @type {__VLS_StyleScopedClasses['article-detail-page']} */ ;
/** @type {__VLS_StyleScopedClasses['container']} */ ;
/** @type {__VLS_StyleScopedClasses['article-content']} */ ;
/** @type {__VLS_StyleScopedClasses['article-title']} */ ;
/** @type {__VLS_StyleScopedClasses['article-meta']} */ ;
/** @type {__VLS_StyleScopedClasses['author']} */ ;
/** @type {__VLS_StyleScopedClasses['date']} */ ;
/** @type {__VLS_StyleScopedClasses['category']} */ ;
/** @type {__VLS_StyleScopedClasses['article-cover']} */ ;
/** @type {__VLS_StyleScopedClasses['article-body']} */ ;
/** @type {__VLS_StyleScopedClasses['markdown-body']} */ ;
/** @type {__VLS_StyleScopedClasses['article-footer']} */ ;
/** @type {__VLS_StyleScopedClasses['tags']} */ ;
/** @type {__VLS_StyleScopedClasses['tag']} */ ;
/** @type {__VLS_StyleScopedClasses['article-sidebar']} */ ;
/** @type {__VLS_StyleScopedClasses['sidebar-section']} */ ;
/** @type {__VLS_StyleScopedClasses['toc-header']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-4']} */ ;
/** @type {__VLS_StyleScopedClasses['pb-3']} */ ;
/** @type {__VLS_StyleScopedClasses['border-b']} */ ;
/** @type {__VLS_StyleScopedClasses['border-b-gray-200']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:border-b-border-dimmed-primary']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['font-bold']} */ ;
/** @type {__VLS_StyleScopedClasses['text-zinc-700']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:text-text-dimmed-primary']} */ ;
/** @type {__VLS_StyleScopedClasses['uppercase']} */ ;
/** @type {__VLS_StyleScopedClasses['tracking-wide']} */ ;
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['items-center']} */ ;
/** @type {__VLS_StyleScopedClasses['gap-2']} */ ;
/** @type {__VLS_StyleScopedClasses['icon']} */ ;
/** @type {__VLS_StyleScopedClasses['intro-text']} */ ;
/** @type {__VLS_StyleScopedClasses['stats-row']} */ ;
/** @type {__VLS_StyleScopedClasses['stat-text']} */ ;
/** @type {__VLS_StyleScopedClasses['stat-dot']} */ ;
/** @type {__VLS_StyleScopedClasses['stat-text']} */ ;
/** @type {__VLS_StyleScopedClasses['stat-dot']} */ ;
/** @type {__VLS_StyleScopedClasses['stat-text']} */ ;
/** @type {__VLS_StyleScopedClasses['stat-dot']} */ ;
/** @type {__VLS_StyleScopedClasses['stat-text']} */ ;
/** @type {__VLS_StyleScopedClasses['sidebar-section']} */ ;
/** @type {__VLS_StyleScopedClasses['toc-header']} */ ;
/** @type {__VLS_StyleScopedClasses['mb-4']} */ ;
/** @type {__VLS_StyleScopedClasses['pb-3']} */ ;
/** @type {__VLS_StyleScopedClasses['border-b']} */ ;
/** @type {__VLS_StyleScopedClasses['border-b-gray-200']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:border-b-border-dimmed-primary']} */ ;
/** @type {__VLS_StyleScopedClasses['text-sm']} */ ;
/** @type {__VLS_StyleScopedClasses['font-bold']} */ ;
/** @type {__VLS_StyleScopedClasses['text-zinc-700']} */ ;
/** @type {__VLS_StyleScopedClasses['dark:text-text-dimmed-primary']} */ ;
/** @type {__VLS_StyleScopedClasses['uppercase']} */ ;
/** @type {__VLS_StyleScopedClasses['tracking-wide']} */ ;
/** @type {__VLS_StyleScopedClasses['flex']} */ ;
/** @type {__VLS_StyleScopedClasses['items-center']} */ ;
/** @type {__VLS_StyleScopedClasses['gap-2']} */ ;
/** @type {__VLS_StyleScopedClasses['octicon']} */ ;
/** @type {__VLS_StyleScopedClasses['octicon-list-unordered']} */ ;
/** @type {__VLS_StyleScopedClasses['toc-list']} */ ;
/** @type {__VLS_StyleScopedClasses['toc-item']} */ ;
/** @type {__VLS_StyleScopedClasses['toc-link']} */ ;
var __VLS_dollars;
const __VLS_self = (await import('vue')).defineComponent({
    setup() {
        return {
            articleData: articleData,
            wordCount: wordCount,
            readingTime: readingTime,
            tocHeadings: tocHeadings,
            currentSection: currentSection,
            renderedContent: renderedContent,
            scrollToHeading: scrollToHeading,
        };
    },
});
export default (await import('vue')).defineComponent({
    setup() {
        return {};
    },
});
; /* PartiallyEnd: #4569/main.vue */
