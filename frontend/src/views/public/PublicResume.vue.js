import { ref, onMounted, onBeforeUnmount } from 'vue';
const mockResume = {
    fullName: '张三',
    title: 'Java 开发工程师 · AI 应用开发',
    email: 'zhangsan@example.com',
    phone: '138-0000-0000',
    location: '深圳',
    github: 'https://github.com/zhangsan',
    blog: 'https://zhangsan.dev',
    summary: '拥有 5 年 Java 后端开发经验，近 2 年深耕 AI 应用落地。擅长 Spring Boot / Spring Cloud 微服务架构、高并发系统设计，熟悉 LLM 应用开发（LangChain、蒸馏）、模型微调与部署。热爱技术分享，坚持写技术博客，追求用工程化思维解决实际问题。',
    skillCategories: [
        {
            name: '后端开发',
            skills: ['Java 8/17', 'Spring Boot', 'Spring Cloud', 'MyBatis', 'JPA', 'MySQL', 'Redis', 'RabbitMQ', 'Kafka', 'Elasticsearch']
        },
        {
            name: 'AI 应用',
            skills: ['LangChain', '蒸馏', 'LLM Fine-tuning', 'Prompt Engineering', 'Agent 开发', 'OpenAI API', '向量数据库', 'Embedding']
        },
        {
            name: '前端 & 工具',
            skills: ['Vue.js', 'TypeScript', 'Docker', 'Kubernetes', 'Git', 'CI/CD', 'Jenkins', 'Nginx', 'Linux']
        }
    ],
    workExperiences: [
        {
            id: '1',
            company: '某 AI 科技公司',
            title: '高级 Java 开发工程师',
            startDate: '2023-03',
            endDate: null,
            description: '负责 AI 应用平台后端架构设计与核心功能开发，推动大模型在企业级场景的落地。',
            highlights: [
                '主导设计基于 Spring Cloud Alibaba 的微服务架构，支撑日均千万级 API 调用',
                '开发 蒸馏 知识库系统，结合 LangChain + 向量数据库实现企业文档智能问答，准确率达 92%',
                '搭建 LLM Agent 框架，支持多工具链编排与流式输出，已服务 3 个核心业务线',
                '优化大模型推理网关，通过缓存 + 请求合并将平均响应延迟降低 60%'
            ]
        },
        {
            id: '2',
            company: '某互联网公司',
            title: 'Java 开发工程师',
            startDate: '2021-01',
            endDate: '2023-02',
            description: '参与电商平台后端服务开发，负责订单、支付等核心模块的设计与实现。',
            highlights: [
                '重构订单系统，将接口响应时间从 800ms 优化至 200ms，支撑大促期间 10 倍流量峰值',
                '设计并实现分布式事务方案（Seata + 消息队列），保证订单与支付数据最终一致性',
                '开发智能推荐引擎，基于用户行为数据实现个性化商品推荐，点击率提升 25%'
            ]
        },
        {
            id: '3',
            company: '某软件公司',
            title: '初级 Java 开发工程师',
            startDate: '2019-07',
            endDate: '2020-12',
            description: '负责企业内部管理系统及数据平台的后端开发工作。',
            highlights: [
                '独立完成数据报表平台后端开发，支持多维度数据聚合与可视化导出',
                '引入 Redis 缓存方案，将热点数据查询性能提升 10 倍',
                '参与项目 CI/CD 流水线搭建，实现自动化构建、测试与部署'
            ]
        }
    ],
    projects: [
        {
            id: 'p1',
            name: '智能知识库问答系统',
            role: '核心开发者 & 架构师',
            period: '2024.06 - 至今',
            description: '面向企业的 蒸馏 知识库问答平台，支持 PDF、Word、网页等多源文档导入，实现基于大模型的智能检索与问答。',
            highlights: [
                '基于 LangChain + Milvus 向量数据库构建 蒸馏 pipeline，支持分块策略与多路召回',
                '实现混合检索（关键词 + 语义）与重排序，Top-5 召回准确率 95%+',
                '设计多轮对话管理模块，支持上下文感知与追问澄清',
                '开发可视化配置后台，支持 Prompt 模板管理与效果 A/B 测试'
            ],
            techStack: ['Spring Boot', 'LangChain', 'Milvus', 'OpenAI', 'Redis', 'MySQL', 'Vue.js']
        },
        {
            id: 'p2',
            name: 'AI 辅助代码审查工具',
            role: '项目负责人',
            period: '2023.09 - 2024.03',
            description: '基于大模型的代码审查助手，自动分析 Git Diff 并生成审查建议，提升团队 Code Review 效率。',
            highlights: [
                '设计 Prompt 工程策略，针对 Java 项目定制代码审查维度（安全、性能、规范）',
                '集成 GitLab Webhook，实现提交自动触发审查并评论至 MR',
                '引入 Function Calling 机制，支持调用静态分析工具增强审查深度',
                '团队 Code Review 平均耗时从 2 小时降至 30 分钟'
            ],
            techStack: ['Python', 'FastAPI', 'LangChain', 'GitLab API', 'PostgreSQL', 'Docker']
        },
        {
            id: 'p3',
            name: '高并发秒杀系统',
            role: '后端负责人',
            period: '2022.03 - 2022.08',
            description: '电商平台限时秒杀系统，支持百万级并发请求，保障系统稳定性与数据一致性。',
            highlights: [
                '采用 Redis + Lua 脚本实现库存预扣减，消除超卖风险',
                '使用 RabbitMQ 异步下单削峰，将峰值 TPS 从 3000 提升至 50000',
                '设计多层限流策略（Nginx + Sentinel），保障核心服务不被冲垮',
                '全链路压测验证，秒杀场景下 99 分位延迟 < 100ms'
            ],
            techStack: ['Spring Boot', 'Redis', 'RabbitMQ', 'Sentinel', 'MySQL', 'Nginx']
        }
    ],
    educationRecords: [
        {
            id: '1',
            school: '某某大学',
            degree: '硕士',
            fieldOfStudy: '计算机科学与技术',
            startDate: '2017-09',
            endDate: '2019-06',
            description: '研究方向：自然语言处理。发表 2 篇 EI 论文，获研究生国家奖学金。'
        },
        {
            id: '2',
            school: '某某理工大学',
            degree: '学士',
            fieldOfStudy: '软件工程',
            startDate: '2013-09',
            endDate: '2017-06',
            description: 'GPA 3.7/4.0，获 ACM 程序设计竞赛省级银奖，校级优秀毕业生。'
        }
    ]
};
const loading = ref(true);
const error = ref(null);
const resume = ref(null);
const loadResume = async () => {
    loading.value = true;
    error.value = null;
    try {
        await new Promise(resolve => setTimeout(resolve, 300));
        resume.value = mockResume;
    }
    catch (err) {
        error.value = '加载简历失败，请稍后重试。';
        console.error('[PublicResume] loadResume', err);
    }
    finally {
        loading.value = false;
    }
};
const getInitials = (name) => {
    if (!name)
        return '?';
    return name.split('').slice(0, 2).join('').toUpperCase();
};
const formatDateRange = (start, end) => {
    const fmt = (v) => v.replace('-', '.');
    return `${fmt(start)} — ${end ? fmt(end) : '至今'}`;
};
onMounted(() => {
    document.documentElement.style.overflow = 'hidden';
    document.body.style.overflow = 'hidden';
    loadResume();
});
onBeforeUnmount(() => {
    document.documentElement.style.overflow = '';
    document.body.style.overflow = '';
});
debugger; /* PartiallyEnd: #3632/scriptSetup.vue */
const __VLS_ctx = {};
let __VLS_components;
let __VLS_directives;
/** @type {__VLS_StyleScopedClasses['resume-left']} */ ;
/** @type {__VLS_StyleScopedClasses['resume-left']} */ ;
/** @type {__VLS_StyleScopedClasses['inline-link']} */ ;
/** @type {__VLS_StyleScopedClasses['edu-item']} */ ;
/** @type {__VLS_StyleScopedClasses['skill-group']} */ ;
/** @type {__VLS_StyleScopedClasses['skill-tag']} */ ;
/** @type {__VLS_StyleScopedClasses['resume-right']} */ ;
/** @type {__VLS_StyleScopedClasses['resume-right']} */ ;
/** @type {__VLS_StyleScopedClasses['right-section']} */ ;
/** @type {__VLS_StyleScopedClasses['timeline-item']} */ ;
/** @type {__VLS_StyleScopedClasses['timeline-item__card']} */ ;
/** @type {__VLS_StyleScopedClasses['timeline-item__points']} */ ;
/** @type {__VLS_StyleScopedClasses['timeline-item__points']} */ ;
/** @type {__VLS_StyleScopedClasses['project-card']} */ ;
/** @type {__VLS_StyleScopedClasses['project-card__points']} */ ;
/** @type {__VLS_StyleScopedClasses['project-card__points']} */ ;
/** @type {__VLS_StyleScopedClasses['resume-page']} */ ;
/** @type {__VLS_StyleScopedClasses['resume-layout']} */ ;
/** @type {__VLS_StyleScopedClasses['resume-left']} */ ;
/** @type {__VLS_StyleScopedClasses['resume-right']} */ ;
/** @type {__VLS_StyleScopedClasses['resume-page']} */ ;
/** @type {__VLS_StyleScopedClasses['resume-left']} */ ;
/** @type {__VLS_StyleScopedClasses['resume-right']} */ ;
/** @type {__VLS_StyleScopedClasses['timeline-item__header']} */ ;
/** @type {__VLS_StyleScopedClasses['project-card__header']} */ ;
// CSS variable injection 
// CSS variable injection end 
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "resume-page" },
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
        ...{ onClick: (__VLS_ctx.loadResume) },
        ...{ class: "btn btn-secondary" },
    });
}
else if (__VLS_ctx.resume) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "resume-layout" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.aside, __VLS_intrinsicElements.aside)({
        ...{ class: "resume-left" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "left-card" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "profile-compact" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "profile-compact__avatar" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "profile-compact__initials" },
    });
    (__VLS_ctx.getInitials(__VLS_ctx.resume.fullName));
    __VLS_asFunctionalElement(__VLS_intrinsicElements.h2, __VLS_intrinsicElements.h2)({
        ...{ class: "profile-compact__name" },
    });
    (__VLS_ctx.resume.fullName);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
        ...{ class: "profile-compact__title" },
    });
    (__VLS_ctx.resume.title);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "profile-compact__contact" },
    });
    if (__VLS_ctx.resume.email) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "contact-row" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.svg, __VLS_intrinsicElements.svg)({
            width: "16",
            height: "16",
            viewBox: "0 0 24 24",
            fill: "none",
            stroke: "currentColor",
            'stroke-width': "2",
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.rect)({
            x: "2",
            y: "4",
            width: "20",
            height: "16",
            rx: "2",
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.path)({
            d: "m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7",
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
        (__VLS_ctx.resume.email);
    }
    if (__VLS_ctx.resume.phone) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "contact-row" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.svg, __VLS_intrinsicElements.svg)({
            width: "16",
            height: "16",
            viewBox: "0 0 24 24",
            fill: "none",
            stroke: "currentColor",
            'stroke-width': "2",
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.path)({
            d: "M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z",
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
        (__VLS_ctx.resume.phone);
    }
    if (__VLS_ctx.resume.location) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "contact-row" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.svg, __VLS_intrinsicElements.svg)({
            width: "16",
            height: "16",
            viewBox: "0 0 24 24",
            fill: "none",
            stroke: "currentColor",
            'stroke-width': "2",
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.path)({
            d: "M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z",
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.circle)({
            cx: "12",
            cy: "10",
            r: "3",
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
        (__VLS_ctx.resume.location);
    }
    if (__VLS_ctx.resume.github || __VLS_ctx.resume.blog) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "profile-compact__links" },
        });
        if (__VLS_ctx.resume.github) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.a, __VLS_intrinsicElements.a)({
                href: (__VLS_ctx.resume.github),
                target: "_blank",
                rel: "noopener",
                ...{ class: "inline-link" },
            });
        }
        if (__VLS_ctx.resume.blog) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.a, __VLS_intrinsicElements.a)({
                href: (__VLS_ctx.resume.blog),
                target: "_blank",
                rel: "noopener",
                ...{ class: "inline-link" },
            });
        }
    }
    __VLS_asFunctionalElement(__VLS_intrinsicElements.section, __VLS_intrinsicElements.section)({
        ...{ class: "left-card" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.h3, __VLS_intrinsicElements.h3)({
        ...{ class: "left-card__title" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "left-card__icon" },
    });
    for (const [record] of __VLS_getVForSourceType((__VLS_ctx.resume.educationRecords))) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            key: (record.id),
            ...{ class: "edu-item" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "edu-item__date" },
        });
        (__VLS_ctx.formatDateRange(record.startDate, record.endDate));
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "edu-item__school" },
        });
        (record.school);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "edu-item__major" },
        });
        (record.degree);
        (record.fieldOfStudy);
        if (record.description) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
                ...{ class: "edu-item__desc" },
            });
            (record.description);
        }
    }
    __VLS_asFunctionalElement(__VLS_intrinsicElements.section, __VLS_intrinsicElements.section)({
        ...{ class: "left-card" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.h3, __VLS_intrinsicElements.h3)({
        ...{ class: "left-card__title" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
        ...{ class: "left-card__icon" },
    });
    for (const [category] of __VLS_getVForSourceType((__VLS_ctx.resume.skillCategories))) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            key: (category.name),
            ...{ class: "skill-group" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.h4, __VLS_intrinsicElements.h4)({
            ...{ class: "skill-group__name" },
        });
        (category.name);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "skill-group__tags" },
        });
        for (const [skill] of __VLS_getVForSourceType((category.skills))) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                key: (skill),
                ...{ class: "skill-tag" },
            });
            (skill);
        }
    }
    __VLS_asFunctionalElement(__VLS_intrinsicElements.main, __VLS_intrinsicElements.main)({
        ...{ class: "resume-right" },
    });
    if (__VLS_ctx.resume.summary) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.section, __VLS_intrinsicElements.section)({
            ...{ class: "right-section" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.h2, __VLS_intrinsicElements.h2)({
            ...{ class: "right-section__title" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
            ...{ class: "summary-text" },
        });
        (__VLS_ctx.resume.summary);
    }
    __VLS_asFunctionalElement(__VLS_intrinsicElements.section, __VLS_intrinsicElements.section)({
        ...{ class: "right-section" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.h2, __VLS_intrinsicElements.h2)({
        ...{ class: "right-section__title" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "timeline" },
    });
    for (const [item] of __VLS_getVForSourceType((__VLS_ctx.resume.workExperiences))) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            key: (item.id),
            ...{ class: "timeline-item" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "timeline-item__dot" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "timeline-item__card" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "timeline-item__header" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.h3, __VLS_intrinsicElements.h3)({
            ...{ class: "timeline-item__company" },
        });
        (item.company);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
            ...{ class: "timeline-item__role" },
        });
        (item.title);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.time, __VLS_intrinsicElements.time)({
            ...{ class: "timeline-item__date" },
        });
        (__VLS_ctx.formatDateRange(item.startDate, item.endDate));
        if (item.description) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
                ...{ class: "timeline-item__desc" },
            });
            (item.description);
        }
        if (item.highlights && item.highlights.length) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.ul, __VLS_intrinsicElements.ul)({
                ...{ class: "timeline-item__points" },
            });
            for (const [h, idx] of __VLS_getVForSourceType((item.highlights))) {
                __VLS_asFunctionalElement(__VLS_intrinsicElements.li, __VLS_intrinsicElements.li)({
                    key: (idx),
                });
                (h);
            }
        }
    }
    __VLS_asFunctionalElement(__VLS_intrinsicElements.section, __VLS_intrinsicElements.section)({
        ...{ class: "right-section" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.h2, __VLS_intrinsicElements.h2)({
        ...{ class: "right-section__title" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "projects" },
    });
    for (const [project] of __VLS_getVForSourceType((__VLS_ctx.resume.projects))) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            key: (project.id),
            ...{ class: "project-card" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "project-card__header" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.h3, __VLS_intrinsicElements.h3)({
            ...{ class: "project-card__name" },
        });
        (project.name);
        if (project.role) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                ...{ class: "project-card__role" },
            });
            (project.role);
        }
        if (project.period) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "project-card__period" },
            });
            (project.period);
        }
        if (project.description) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
                ...{ class: "project-card__desc" },
            });
            (project.description);
        }
        if (project.highlights && project.highlights.length) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.ul, __VLS_intrinsicElements.ul)({
                ...{ class: "project-card__points" },
            });
            for (const [h, idx] of __VLS_getVForSourceType((project.highlights))) {
                __VLS_asFunctionalElement(__VLS_intrinsicElements.li, __VLS_intrinsicElements.li)({
                    key: (idx),
                });
                (h);
            }
        }
        if (project.techStack && project.techStack.length) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "project-card__tech" },
            });
            for (const [tech] of __VLS_getVForSourceType((project.techStack))) {
                __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                    key: (tech),
                    ...{ class: "tech-tag" },
                });
                (tech);
            }
        }
    }
}
/** @type {__VLS_StyleScopedClasses['resume-page']} */ ;
/** @type {__VLS_StyleScopedClasses['loading-state']} */ ;
/** @type {__VLS_StyleScopedClasses['error-state']} */ ;
/** @type {__VLS_StyleScopedClasses['btn']} */ ;
/** @type {__VLS_StyleScopedClasses['btn-secondary']} */ ;
/** @type {__VLS_StyleScopedClasses['resume-layout']} */ ;
/** @type {__VLS_StyleScopedClasses['resume-left']} */ ;
/** @type {__VLS_StyleScopedClasses['left-card']} */ ;
/** @type {__VLS_StyleScopedClasses['profile-compact']} */ ;
/** @type {__VLS_StyleScopedClasses['profile-compact__avatar']} */ ;
/** @type {__VLS_StyleScopedClasses['profile-compact__initials']} */ ;
/** @type {__VLS_StyleScopedClasses['profile-compact__name']} */ ;
/** @type {__VLS_StyleScopedClasses['profile-compact__title']} */ ;
/** @type {__VLS_StyleScopedClasses['profile-compact__contact']} */ ;
/** @type {__VLS_StyleScopedClasses['contact-row']} */ ;
/** @type {__VLS_StyleScopedClasses['contact-row']} */ ;
/** @type {__VLS_StyleScopedClasses['contact-row']} */ ;
/** @type {__VLS_StyleScopedClasses['profile-compact__links']} */ ;
/** @type {__VLS_StyleScopedClasses['inline-link']} */ ;
/** @type {__VLS_StyleScopedClasses['inline-link']} */ ;
/** @type {__VLS_StyleScopedClasses['left-card']} */ ;
/** @type {__VLS_StyleScopedClasses['left-card__title']} */ ;
/** @type {__VLS_StyleScopedClasses['left-card__icon']} */ ;
/** @type {__VLS_StyleScopedClasses['edu-item']} */ ;
/** @type {__VLS_StyleScopedClasses['edu-item__date']} */ ;
/** @type {__VLS_StyleScopedClasses['edu-item__school']} */ ;
/** @type {__VLS_StyleScopedClasses['edu-item__major']} */ ;
/** @type {__VLS_StyleScopedClasses['edu-item__desc']} */ ;
/** @type {__VLS_StyleScopedClasses['left-card']} */ ;
/** @type {__VLS_StyleScopedClasses['left-card__title']} */ ;
/** @type {__VLS_StyleScopedClasses['left-card__icon']} */ ;
/** @type {__VLS_StyleScopedClasses['skill-group']} */ ;
/** @type {__VLS_StyleScopedClasses['skill-group__name']} */ ;
/** @type {__VLS_StyleScopedClasses['skill-group__tags']} */ ;
/** @type {__VLS_StyleScopedClasses['skill-tag']} */ ;
/** @type {__VLS_StyleScopedClasses['resume-right']} */ ;
/** @type {__VLS_StyleScopedClasses['right-section']} */ ;
/** @type {__VLS_StyleScopedClasses['right-section__title']} */ ;
/** @type {__VLS_StyleScopedClasses['summary-text']} */ ;
/** @type {__VLS_StyleScopedClasses['right-section']} */ ;
/** @type {__VLS_StyleScopedClasses['right-section__title']} */ ;
/** @type {__VLS_StyleScopedClasses['timeline']} */ ;
/** @type {__VLS_StyleScopedClasses['timeline-item']} */ ;
/** @type {__VLS_StyleScopedClasses['timeline-item__dot']} */ ;
/** @type {__VLS_StyleScopedClasses['timeline-item__card']} */ ;
/** @type {__VLS_StyleScopedClasses['timeline-item__header']} */ ;
/** @type {__VLS_StyleScopedClasses['timeline-item__company']} */ ;
/** @type {__VLS_StyleScopedClasses['timeline-item__role']} */ ;
/** @type {__VLS_StyleScopedClasses['timeline-item__date']} */ ;
/** @type {__VLS_StyleScopedClasses['timeline-item__desc']} */ ;
/** @type {__VLS_StyleScopedClasses['timeline-item__points']} */ ;
/** @type {__VLS_StyleScopedClasses['right-section']} */ ;
/** @type {__VLS_StyleScopedClasses['right-section__title']} */ ;
/** @type {__VLS_StyleScopedClasses['projects']} */ ;
/** @type {__VLS_StyleScopedClasses['project-card']} */ ;
/** @type {__VLS_StyleScopedClasses['project-card__header']} */ ;
/** @type {__VLS_StyleScopedClasses['project-card__name']} */ ;
/** @type {__VLS_StyleScopedClasses['project-card__role']} */ ;
/** @type {__VLS_StyleScopedClasses['project-card__period']} */ ;
/** @type {__VLS_StyleScopedClasses['project-card__desc']} */ ;
/** @type {__VLS_StyleScopedClasses['project-card__points']} */ ;
/** @type {__VLS_StyleScopedClasses['project-card__tech']} */ ;
/** @type {__VLS_StyleScopedClasses['tech-tag']} */ ;
var __VLS_dollars;
const __VLS_self = (await import('vue')).defineComponent({
    setup() {
        return {
            loading: loading,
            error: error,
            resume: resume,
            loadResume: loadResume,
            getInitials: getInitials,
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
