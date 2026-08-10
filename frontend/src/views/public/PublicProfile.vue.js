import { ref, onMounted, computed } from 'vue';
import headImg from '@/img/head.png';
// Mock 数据
const mockProfile = {
    fullName: '王五',
    headline: '产品经理 / 设计师',
    email: 'zhangsan@example.com',
    location: '广州',
    website: 'https://zhangsan.com',
    bio: '我是一名专注于用户体验的产品设计师，擅长将复杂的业务需求转化为简洁直观的界面设计。拥有5年互联网产品设计经验，热爱探索设计系统与用户研究的结合点。\n\n在过去的几年里，我参与并主导了多个产品从0到1的设计与迭代，积累了丰富的实战经验。我始终相信，优秀的设计不仅体现在视觉上，更体现在对用户需求的深刻理解和精准满足。\n\n除了产品设计，我还对前端技术保持着浓厚兴趣，能够与开发团队高效协作，确保设计方案能够完美落地。我相信跨领域的知识储备能够帮助我在产品设计中做出更全面的决策。\n\n工作之余，我喜欢阅读设计书籍、参加技术分享会，保持对新知识的渴求。我相信持续学习是设计师保持竞争力的关键。',
    workExperiences: [
        {
            id: '1',
            company: '某科技公司',
            title: '高级产品经理',
            startDate: '2021-06',
            endDate: null,
            description: '负责核心产品的设计与迭代，带领团队完成用户增长目标。主导设计了全新的用户体验流程，将用户留存率提升了40%。建立了设计系统，统一了多个产品的视觉风格，提升了品牌一致性。'
        },
        {
            id: '2',
            company: '互联网公司',
            title: '产品设计师',
            startDate: '2019-03',
            endDate: '2021-05',
            description: '参与多个项目的用户研究与界面设计，提升了产品的用户体验。负责移动端APP的改版设计，通过用户调研发现痛点，重新设计了核心流程，用户满意度提升35%。'
        },
        {
            id: '3',
            company: '初创公司',
            title: 'UI 设计师',
            startDate: '2018-01',
            endDate: '2019-02',
            description: '负责公司旗下3款产品的UI设计，从零开始构建设计规范。与开发团队紧密合作，确保设计稿的高保真还原。'
        }
    ],
    educationRecords: [
        {
            id: '1',
            school: '某某大学',
            degree: '计算机科学',
            fieldOfStudy: '学士学位',
            startDate: '2015-09',
            endDate: '2019-06',
            description: '主修计算机科学与技术，辅修设计学。在校期间参与了多个校园产品设计项目，获得校级设计大赛一等奖。'
        },
        {
            id: '2',
            school: '某某艺术院校',
            degree: '交互设计',
            fieldOfStudy: '暑期课程',
            startDate: '2018-07',
            endDate: '2018-08',
            description: '参加了为期2个月的交互设计强化课程，系统学习了用户体验设计的方法论和实践技巧。'
        }
    ],
    skills: [
        { id: '1', name: '产品设计', proficiency: 'expert' },
        { id: '2', name: 'Figma', proficiency: 'expert' },
        { id: '3', name: '用户研究', proficiency: 'senior' },
        { id: '4', name: '产品策略', proficiency: 'senior' },
        { id: '5', name: 'Vue.js', proficiency: 'intermediate' },
        { id: '6', name: '数据分析', proficiency: 'intermediate' },
        { id: '7', name: 'Sketch', proficiency: 'expert' },
        { id: '8', name: 'Prototyping', proficiency: 'senior' },
        { id: '9', name: 'Design Systems', proficiency: 'senior' },
        { id: '10', name: 'React', proficiency: 'intermediate' },
        { id: '11', name: 'JavaScript', proficiency: 'intermediate' },
        { id: '12', name: 'HTML/CSS', proficiency: 'expert' }
    ]
};
const loading = ref(true);
const error = ref(null);
const profile = ref(null);
const workExperiences = computed(() => profile.value?.workExperiences ?? []);
const educationRecords = computed(() => profile.value?.educationRecords ?? []);
const skills = computed(() => profile.value?.skills ?? []);
// 打字效果
const targetText = 'Hello，World.\nWelcome to My Pag！\nNow，let me show you about me！这里只能定义一部分的我，这里不能定义我的全部！';
const displayedText = ref('');
const typeWriter = () => {
    let index = 0;
    const typeNext = () => {
        if (index < targetText.length) {
            displayedText.value += targetText[index];
            index++;
            setTimeout(typeNext, 80);
        }
    };
    typeNext();
};
const loadProfile = async () => {
    loading.value = true;
    error.value = null;
    try {
        // 模拟网络延迟
        await new Promise(resolve => setTimeout(resolve, 300));
        profile.value = mockProfile;
        // 开始打字效果
        setTimeout(typeWriter, 500);
    }
    catch (err) {
        error.value = '加载个人信息失败，请稍后重试。';
        console.error('[PublicProfile] loadProfile', err);
    }
    finally {
        loading.value = false;
    }
};
const formatDateRange = (start, end) => {
    const startLabel = formatDateLabel(start);
    const endLabel = end ? formatDateLabel(end) : '至今';
    return `${startLabel} — ${endLabel}`;
};
const formatDateLabel = (value) => {
    const [year, month] = value.split('-');
    return `${year}.${month}`;
};
onMounted(() => {
    loadProfile();
});
debugger; /* PartiallyEnd: #3632/scriptSetup.vue */
const __VLS_ctx = {};
let __VLS_components;
let __VLS_directives;
/** @type {__VLS_StyleScopedClasses['contact-link']} */ ;
/** @type {__VLS_StyleScopedClasses['section']} */ ;
/** @type {__VLS_StyleScopedClasses['timeline-item']} */ ;
/** @type {__VLS_StyleScopedClasses['timeline-item']} */ ;
/** @type {__VLS_StyleScopedClasses['timeline-header']} */ ;
/** @type {__VLS_StyleScopedClasses['timeline-header']} */ ;
/** @type {__VLS_StyleScopedClasses['skill-bar']} */ ;
/** @type {__VLS_StyleScopedClasses['skill-bar']} */ ;
/** @type {__VLS_StyleScopedClasses['skill-bar']} */ ;
/** @type {__VLS_StyleScopedClasses['skill-bar']} */ ;
/** @type {__VLS_StyleScopedClasses['hero-split']} */ ;
/** @type {__VLS_StyleScopedClasses['hero-left']} */ ;
/** @type {__VLS_StyleScopedClasses['hero-right']} */ ;
/** @type {__VLS_StyleScopedClasses['terminal']} */ ;
/** @type {__VLS_StyleScopedClasses['name']} */ ;
// CSS variable injection 
// CSS variable injection end 
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "profile-page" },
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
        ...{ onClick: (__VLS_ctx.loadProfile) },
        ...{ class: "btn btn-secondary" },
    });
}
else if (__VLS_ctx.profile) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "profile-content" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "hero-split" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "hero-left" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "avatar" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.img)({
        src: (__VLS_ctx.headImg),
        alt: "头像",
        ...{ class: "avatar-img" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.h1, __VLS_intrinsicElements.h1)({
        ...{ class: "name" },
    });
    (__VLS_ctx.profile.fullName);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
        ...{ class: "headline" },
    });
    (__VLS_ctx.profile.headline);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "contact-links" },
    });
    if (__VLS_ctx.profile.website) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.a, __VLS_intrinsicElements.a)({
            href: (__VLS_ctx.profile.website),
            target: "_blank",
            rel: "noopener",
            ...{ class: "contact-link" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.svg, __VLS_intrinsicElements.svg)({
            width: "23",
            height: "23",
            viewBox: "0 0 1061 1024",
            version: "1.1",
            xmlns: "http://www.w3.org/2000/svg",
            'p-id': "1692",
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.path, __VLS_intrinsicElements.path)({
            d: "M258.490881 610.759953c-0.076713 0.076713-0.153427 0.23014-0.23014 0.306854 2.991819-3.375386 6.137065-6.904198 9.205598-10.356298-5.753499 6.443918-8.975458 10.049444-8.975458 10.049444z",
            fill: "#1590E9",
            'p-id': "1693",
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.path, __VLS_intrinsicElements.path)({
            d: "M246.293464 657.248222c21.709868-24.241407 79.16814-88.603878 136.472986-153.273202-41.885469 46.948548-93.436816 104.8671-136.472986 153.273202z",
            fill: "#1590E9",
            'p-id': "1694",
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.path, __VLS_intrinsicElements.path)({
            d: "M0 512a512 508.54023 90 1 0 1017.080459 0 512 508.54023 90 1 0-1017.080459 0Z",
            fill: "#2CC35A",
            'p-id': "1695",
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.path, __VLS_intrinsicElements.path)({
            d: "M768.864559 345.485314l19.638608-11.583711c7.978185-4.679512 6.980912-16.493363-1.610979-19.868748l-9.435738-3.682239c-13.808397-5.446645-26.235953-13.961823-35.825117-25.315394-12.04399-14.191963-34.290851-34.597705-69.732403-46.641695-40.427916-13.808397-109.623326-11.046717-148.210122-8.054898-12.197417 0.92056-19.178328 14.11525-13.348117 24.931827 32.679872 60.296665 12.811123 87.683318-4.372659 107.935633-26.312667 30.992179-74.718768 86.072338-123.278295 140.845645 16.800216-18.794762 32.066165-35.901831 44.570435-49.940368 27.923646-31.299032 70.039256-47.178688 111.311019-39.660783 131.563333 24.011267 146.52243 194.391538-7.057625 295.806538 20.022175-1.073986 40.351203-2.531539 60.756944-4.602798 193.777831-19.945462 209.120494-178.051602 167.235025-256.145756-14.882383-27.693506-17.030356-46.411555-15.419376-64.36247 1.534266-16.493363 10.586437-31.299032 24.7784-39.660783z",
            fill: "#CCCCCC",
            'p-id': "1696",
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.path, __VLS_intrinsicElements.path)({
            d: "M538.647904 414.37387c-41.271763-7.517905-83.387372 8.361751-111.311019 39.660783-12.50427 13.961823-27.77022 31.068892-44.570435 49.940367C325.461604 568.644344 268.003332 633.006814 246.293464 657.248222c-3.145246 3.528812-6.213778 6.980912-9.205597 10.356297-9.742591 11.430284-3.068533 29.151059 11.890563 31.145605 53.622606 6.904198 162.555512 17.720776 282.535136 11.506997 153.580055-101.491714 138.697672-271.871985 7.134338-295.883251z",
            fill: "#FFFFFF",
            'p-id': "1697",
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.path, __VLS_intrinsicElements.path)({
            d: "M248.97843 698.750124c-14.959096-1.917833-21.633155-19.638608-11.890563-31.145605-39.660783 44.723862-70.346109 79.39828-76.022894 86.379191-18.487909 22.630428 190.018879 75.102334 370.218453-43.573162 0.076713-0.076713 0.23014-0.153427 0.306853-0.23014-120.056336 6.290492-228.989242-4.526086-282.611849-11.430284z",
            fill: "#CCCCCC",
            'p-id': "1698",
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.path, __VLS_intrinsicElements.path)({
            d: "M614.88713 562.195056m-93.024866 0a93.024866 93.024866 0 1 0 186.049731 0 93.024866 93.024866 0 1 0-186.049731 0Z",
            fill: "#225000",
            'fill-opacity': "0",
            'p-id': "1699",
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.path, __VLS_intrinsicElements.path)({
            d: "M217.417039 662.753936a421.90098 187.006347 0 1 0 843.80196 0 421.90098 187.006347 0 1 0-843.80196 0Z",
            fill: "#225000",
            'fill-opacity': "0",
            'p-id': "1700",
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
    }
    __VLS_asFunctionalElement(__VLS_intrinsicElements.a, __VLS_intrinsicElements.a)({
        href: "https://github.com",
        target: "_blank",
        rel: "noopener",
        ...{ class: "contact-link" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.svg, __VLS_intrinsicElements.svg)({
        width: "24",
        height: "24",
        viewBox: "0 0 1024 1024",
        version: "1.1",
        xmlns: "http://www.w3.org/2000/svg",
        'p-id': "10341",
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.path, __VLS_intrinsicElements.path)({
        d: "M512 85.333333C276.266667 85.333333 85.333333 276.266667 85.333333 512a426.410667 426.410667 0 0 0 291.754667 404.821333c21.333333 3.712 29.312-9.088 29.312-20.309333 0-10.112-0.554667-43.690667-0.554667-79.445333-107.178667 19.754667-134.912-26.112-143.445333-50.133334-4.821333-12.288-25.6-50.133333-43.733333-60.288-14.933333-7.978667-36.266667-27.733333-0.554667-28.245333 33.621333-0.554667 57.6 30.933333 65.621333 43.733333 38.4 64.512 99.754667 46.378667 124.245334 35.2 3.754667-27.733333 14.933333-46.378667 27.221333-57.045333-94.933333-10.666667-194.133333-47.488-194.133333-210.688 0-46.421333 16.512-84.778667 43.733333-114.688-4.266667-10.666667-19.2-54.4 4.266667-113.066667 0 0 35.712-11.178667 117.333333 43.776a395.946667 395.946667 0 0 1 106.666667-14.421333c36.266667 0 72.533333 4.778667 106.666666 14.378667 81.578667-55.466667 117.333333-43.690667 117.333334-43.690667 23.466667 58.666667 8.533333 102.4 4.266666 113.066667 27.178667 29.866667 43.733333 67.712 43.733334 114.645333 0 163.754667-99.712 200.021333-194.645334 210.688 15.445333 13.312 28.8 38.912 28.8 78.933333 0 57.045333-0.554667 102.912-0.554666 117.333334 0 11.178667 8.021333 24.490667 29.354666 20.224A427.349333 427.349333 0 0 0 938.666667 512c0-235.733333-190.933333-426.666667-426.666667-426.666667z",
        fill: "#000000",
        'p-id': "10342",
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "hero-right" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "terminal" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "terminal-header" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "terminal-buttons" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "terminal-button terminal-button-close" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "terminal-button terminal-button-minimize" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "terminal-button terminal-button-maximize" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "terminal-title" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "terminal-body" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "terminal-line" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "terminal-prompt" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "terminal-text" },
    });
    (__VLS_ctx.displayedText);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "terminal-cursor" },
    });
    if (__VLS_ctx.profile.bio) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.section, __VLS_intrinsicElements.section)({
            ...{ class: "section" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.h2, __VLS_intrinsicElements.h2)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
            ...{ class: "bio" },
        });
        (__VLS_ctx.profile.bio);
    }
    __VLS_asFunctionalElement(__VLS_intrinsicElements.section, __VLS_intrinsicElements.section)({
        ...{ class: "section" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.h2, __VLS_intrinsicElements.h2)({});
    if (__VLS_ctx.workExperiences.length > 0) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.ul, __VLS_intrinsicElements.ul)({
            ...{ class: "timeline-list" },
        });
        for (const [item] of __VLS_getVForSourceType((__VLS_ctx.workExperiences))) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.li, __VLS_intrinsicElements.li)({
                key: (item.id),
                ...{ class: "timeline-item" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "timeline-content" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "timeline-header" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.h3, __VLS_intrinsicElements.h3)({});
            (item.company);
            __VLS_asFunctionalElement(__VLS_intrinsicElements.time, __VLS_intrinsicElements.time)({});
            (__VLS_ctx.formatDateRange(item.startDate, item.endDate));
            __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
                ...{ class: "timeline-title" },
            });
            (item.title);
            if (item.description) {
                __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
                    ...{ class: "timeline-desc" },
                });
                (item.description);
            }
        }
    }
    else {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
            ...{ class: "empty-text" },
        });
    }
    __VLS_asFunctionalElement(__VLS_intrinsicElements.section, __VLS_intrinsicElements.section)({
        ...{ class: "section" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.h2, __VLS_intrinsicElements.h2)({});
    if (__VLS_ctx.educationRecords.length > 0) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.ul, __VLS_intrinsicElements.ul)({
            ...{ class: "timeline-list" },
        });
        for (const [record] of __VLS_getVForSourceType((__VLS_ctx.educationRecords))) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.li, __VLS_intrinsicElements.li)({
                key: (record.id),
                ...{ class: "timeline-item" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "timeline-content" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "timeline-header" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.h3, __VLS_intrinsicElements.h3)({});
            (record.school);
            __VLS_asFunctionalElement(__VLS_intrinsicElements.time, __VLS_intrinsicElements.time)({});
            (__VLS_ctx.formatDateRange(record.startDate, record.endDate));
            __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
                ...{ class: "timeline-title" },
            });
            (record.degree);
            (record.fieldOfStudy);
            if (record.description) {
                __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
                    ...{ class: "timeline-desc" },
                });
                (record.description);
            }
        }
    }
    else {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
            ...{ class: "empty-text" },
        });
    }
    if (__VLS_ctx.skills.length > 0) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.section, __VLS_intrinsicElements.section)({
            ...{ class: "section skills-section" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.h2, __VLS_intrinsicElements.h2)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "skills-list" },
        });
        for (const [skill] of __VLS_getVForSourceType((__VLS_ctx.skills))) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                key: (skill.id),
                ...{ class: "skill-item" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                ...{ class: "skill-name" },
            });
            (skill.name);
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "skill-level" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "skill-bar" },
                ...{ class: (`level-${skill.proficiency}`) },
            });
        }
    }
}
/** @type {__VLS_StyleScopedClasses['profile-page']} */ ;
/** @type {__VLS_StyleScopedClasses['loading-state']} */ ;
/** @type {__VLS_StyleScopedClasses['error-state']} */ ;
/** @type {__VLS_StyleScopedClasses['btn']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-secondary']} */ ;
/** @type {__VLS_StyleScopedClasses['profile-content']} */ ;
/** @type {__VLS_StyleScopedClasses['hero-split']} */ ;
/** @type {__VLS_StyleScopedClasses['hero-left']} */ ;
/** @type {__VLS_StyleScopedClasses['avatar']} */ ;
/** @type {__VLS_StyleScopedClasses['avatar-img']} */ ;
/** @type {__VLS_StyleScopedClasses['name']} */ ;
/** @type {__VLS_StyleScopedClasses['headline']} */ ;
/** @type {__VLS_StyleScopedClasses['contact-links']} */ ;
/** @type {__VLS_StyleScopedClasses['contact-link']} */ ;
/** @type {__VLS_StyleScopedClasses['contact-link']} */ ;
/** @type {__VLS_StyleScopedClasses['hero-right']} */ ;
/** @type {__VLS_StyleScopedClasses['terminal']} */ ;
/** @type {__VLS_StyleScopedClasses['terminal-header']} */ ;
/** @type {__VLS_StyleScopedClasses['terminal-buttons']} */ ;
/** @type {__VLS_StyleScopedClasses['terminal-button']} */ ;
/** @type {__VLS_StyleScopedClasses['terminal-button-close']} */ ;
/** @type {__VLS_StyleScopedClasses['terminal-button']} */ ;
/** @type {__VLS_StyleScopedClasses['terminal-button-minimize']} */ ;
/** @type {__VLS_StyleScopedClasses['terminal-button']} */ ;
/** @type {__VLS_StyleScopedClasses['terminal-button-maximize']} */ ;
/** @type {__VLS_StyleScopedClasses['terminal-title']} */ ;
/** @type {__VLS_StyleScopedClasses['terminal-body']} */ ;
/** @type {__VLS_StyleScopedClasses['terminal-line']} */ ;
/** @type {__VLS_StyleScopedClasses['terminal-prompt']} */ ;
/** @type {__VLS_StyleScopedClasses['terminal-text']} */ ;
/** @type {__VLS_StyleScopedClasses['terminal-cursor']} */ ;
/** @type {__VLS_StyleScopedClasses['section']} */ ;
/** @type {__VLS_StyleScopedClasses['bio']} */ ;
/** @type {__VLS_StyleScopedClasses['section']} */ ;
/** @type {__VLS_StyleScopedClasses['timeline-list']} */ ;
/** @type {__VLS_StyleScopedClasses['timeline-item']} */ ;
/** @type {__VLS_StyleScopedClasses['timeline-content']} */ ;
/** @type {__VLS_StyleScopedClasses['timeline-header']} */ ;
/** @type {__VLS_StyleScopedClasses['timeline-title']} */ ;
/** @type {__VLS_StyleScopedClasses['timeline-desc']} */ ;
/** @type {__VLS_StyleScopedClasses['empty-text']} */ ;
/** @type {__VLS_StyleScopedClasses['section']} */ ;
/** @type {__VLS_StyleScopedClasses['timeline-list']} */ ;
/** @type {__VLS_StyleScopedClasses['timeline-item']} */ ;
/** @type {__VLS_StyleScopedClasses['timeline-content']} */ ;
/** @type {__VLS_StyleScopedClasses['timeline-header']} */ ;
/** @type {__VLS_StyleScopedClasses['timeline-title']} */ ;
/** @type {__VLS_StyleScopedClasses['timeline-desc']} */ ;
/** @type {__VLS_StyleScopedClasses['empty-text']} */ ;
/** @type {__VLS_StyleScopedClasses['section']} */ ;
/** @type {__VLS_StyleScopedClasses['skills-section']} */ ;
/** @type {__VLS_StyleScopedClasses['skills-list']} */ ;
/** @type {__VLS_StyleScopedClasses['skill-item']} */ ;
/** @type {__VLS_StyleScopedClasses['skill-name']} */ ;
/** @type {__VLS_StyleScopedClasses['skill-level']} */ ;
/** @type {__VLS_StyleScopedClasses['skill-bar']} */ ;
var __VLS_dollars;
const __VLS_self = (await import('vue')).defineComponent({
    setup() {
        return {
            headImg: headImg,
            loading: loading,
            error: error,
            profile: profile,
            workExperiences: workExperiences,
            educationRecords: educationRecords,
            skills: skills,
            displayedText: displayedText,
            loadProfile: loadProfile,
            formatDateRange: formatDateRange,
        };
    },
});
export default (await import('vue')).defineComponent({
    setup() {
        return {};
    },
});
; /* PartiallyEnd: #4569/main.vue */
