import { computed, onMounted, ref } from 'vue';
import { fetchProfile } from '../../services/profileService';
const profile = ref(null);
const loading = ref(true);
const error = ref(null);
const exporting = ref(false);
const loadProfile = async () => {
    loading.value = true;
    error.value = null;
    try {
        profile.value = await fetchProfile();
    }
    catch (err) {
        error.value = '加载过程中出现问题，请稍后重试。';
        console.error('[ProfileWorkspace] loadProfile', err);
    }
    finally {
        loading.value = false;
    }
};
onMounted(loadProfile);
const identityFields = computed(() => {
    const current = profile.value;
    if (!current)
        return [];
    return [
        { key: 'fullName', label: '姓名', value: current.fullName, type: 'text' },
        { key: 'headline', label: '定位', value: current.headline ?? '待补充', type: 'text' },
        { key: 'email', label: '邮箱', value: current.email, type: 'email' },
        { key: 'location', label: '所在城市', value: current.location ?? '待补充', type: 'text' },
        { key: 'wesite', label: '网站', value: current.website ?? '', type: 'link', fallback: '未填写' }
    ];
});
const workExperiences = computed(() => profile.value?.workExperiences ?? []);
const educationRecords = computed(() => profile.value?.educationRecords ?? []);
const skills = computed(() => {
    const entries = profile.value?.skills ?? [];
    return entries.map((skill) => ({
        id: skill.id,
        name: skill.name,
        badge: skill.proficiency ? skill.proficiency.toUpperCase() : null,
        description: skill.description
    }));
});
const formatRange = (start, end) => {
    const startLabel = formatDateLabel(start);
    const endLabel = end ? formatDateLabel(end) : '至今';
    return `${startLabel} — ${endLabel}`;
};
const formatDateLabel = (value) => {
    const [year, month] = value.split('-');
    return `${year}.${month}`;
};
const startEditing = () => {
    // 编辑流程将在后续迭代中接入
};
const exportResume = async () => {
    if (!profile.value)
        return;
    exporting.value = true;
    try {
        // 后续会替换为真正的导出流程
        await new Promise((resolve) => setTimeout(resolve, 600));
    }
    finally {
        exporting.value = false;
    }
};
debugger; /* PartiallyEnd: #3632/scriptSetup.vue */
const __VLS_ctx = {};
let __VLS_components;
let __VLS_directives;
/** @type {__VLS_StyleScopedClasses['primary-card']} */ ;
/** @type {__VLS_StyleScopedClasses['timeline']} */ ;
/** @type {__VLS_StyleScopedClasses['primary-card']} */ ;
/** @type {__VLS_StyleScopedClasses['primary-card']} */ ;
/** @type {__VLS_StyleScopedClasses['timeline']} */ ;
/** @type {__VLS_StyleScopedClasses['status-card']} */ ;
/** @type {__VLS_StyleScopedClasses['primary-card']} */ ;
/** @type {__VLS_StyleScopedClasses['timeline']} */ ;
/** @type {__VLS_StyleScopedClasses['primary-card']} */ ;
/** @type {__VLS_StyleScopedClasses['timeline']} */ ;
/** @type {__VLS_StyleScopedClasses['status-card']} */ ;
/** @type {__VLS_StyleScopedClasses['skills']} */ ;
/** @type {__VLS_StyleScopedClasses['skills-grid']} */ ;
/** @type {__VLS_StyleScopedClasses['status-card']} */ ;
/** @type {__VLS_StyleScopedClasses['status-card']} */ ;
/** @type {__VLS_StyleScopedClasses['status-card']} */ ;
/** @type {__VLS_StyleScopedClasses['status-card']} */ ;
/** @type {__VLS_StyleScopedClasses['status-card']} */ ;
/** @type {__VLS_StyleScopedClasses['primary-card']} */ ;
/** @type {__VLS_StyleScopedClasses['timeline']} */ ;
/** @type {__VLS_StyleScopedClasses['status-card']} */ ;
/** @type {__VLS_StyleScopedClasses['skills-grid']} */ ;
// CSS variable injection 
// CSS variable injection end 
__VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
    ...{ class: "profile-workspace" },
});
if (__VLS_ctx.error) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.section, __VLS_intrinsicElements.section)({
        ...{ class: "status-card error" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.h3, __VLS_intrinsicElements.h3)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({});
    (__VLS_ctx.error);
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (__VLS_ctx.loadProfile) },
        type: "button",
    });
}
else if (__VLS_ctx.loading) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.section, __VLS_intrinsicElements.section)({
        ...{ class: "status-card loading" },
    });
    for (const [index] of __VLS_getVForSourceType((5))) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "shimmer-row" },
            key: (index),
        });
    }
}
else if (__VLS_ctx.profile) {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.section, __VLS_intrinsicElements.section)({
        ...{ class: "primary-card" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.header, __VLS_intrinsicElements.header)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.h3, __VLS_intrinsicElements.h3)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (__VLS_ctx.startEditing) },
        type: "button",
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "grid" },
    });
    for (const [field] of __VLS_getVForSourceType((__VLS_ctx.identityFields))) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.dl, __VLS_intrinsicElements.dl)({
            key: (field.key),
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.dt, __VLS_intrinsicElements.dt)({});
        (field.label);
        __VLS_asFunctionalElement(__VLS_intrinsicElements.dd, __VLS_intrinsicElements.dd)({});
        if (field.type === 'email') {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.a, __VLS_intrinsicElements.a)({
                href: (`mailto:${field.value}`),
            });
            (field.value);
        }
        else if (field.type === 'link') {
            if (field.value) {
                __VLS_asFunctionalElement(__VLS_intrinsicElements.a, __VLS_intrinsicElements.a)({
                    href: (field.value),
                    target: "_blank",
                    rel: "noopener",
                });
                (field.value);
            }
            else {
                __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                    ...{ class: "muted" },
                });
                (field.fallback ?? '未填写');
            }
        }
        else {
            (field.value);
        }
    }
    if (__VLS_ctx.profile.bio) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
            ...{ class: "bio" },
        });
        (__VLS_ctx.profile.bio);
    }
    __VLS_asFunctionalElement(__VLS_intrinsicElements.section, __VLS_intrinsicElements.section)({
        ...{ class: "timeline" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.header, __VLS_intrinsicElements.header)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.h3, __VLS_intrinsicElements.h3)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (__VLS_ctx.exportResume) },
        type: "button",
        disabled: (__VLS_ctx.exporting),
    });
    (__VLS_ctx.exporting ? '生成中…' : '导出 PDF');
    __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
        ...{ class: "columns" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.article, __VLS_intrinsicElements.article)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.h4, __VLS_intrinsicElements.h4)({});
    if (__VLS_ctx.workExperiences.length) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.ul, __VLS_intrinsicElements.ul)({});
        for (const [item] of __VLS_getVForSourceType((__VLS_ctx.workExperiences))) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.li, __VLS_intrinsicElements.li)({
                key: (item.id ?? `${item.company}-${item.startDate}`),
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "item-header" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
            (item.company);
            (item.title);
            __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
            (__VLS_ctx.formatRange(item.startDate, item.endDate));
            if (item.description) {
                __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({});
                (item.description);
            }
        }
    }
    else {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
            ...{ class: "empty-state" },
        });
    }
    __VLS_asFunctionalElement(__VLS_intrinsicElements.article, __VLS_intrinsicElements.article)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.h4, __VLS_intrinsicElements.h4)({});
    if (__VLS_ctx.educationRecords.length) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.ul, __VLS_intrinsicElements.ul)({});
        for (const [record] of __VLS_getVForSourceType((__VLS_ctx.educationRecords))) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.li, __VLS_intrinsicElements.li)({
                key: (record.id ?? `${record.school}-${record.startDate}`),
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "item-header" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.strong, __VLS_intrinsicElements.strong)({});
            (record.school);
            if (record.degree || record.fieldOfStudy) {
                (record.degree ?? record.fieldOfStudy);
            }
            __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({});
            (__VLS_ctx.formatRange(record.startDate, record.endDate));
            if (record.description) {
                __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({});
                (record.description);
            }
        }
    }
    else {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({
            ...{ class: "empty-state" },
        });
    }
    if (__VLS_ctx.skills.length) {
        __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
            ...{ class: "skills" },
        });
        __VLS_asFunctionalElement(__VLS_intrinsicElements.h5, __VLS_intrinsicElements.h5)({});
        __VLS_asFunctionalElement(__VLS_intrinsicElements.ul, __VLS_intrinsicElements.ul)({
            ...{ class: "skills-grid" },
        });
        for (const [skill] of __VLS_getVForSourceType((__VLS_ctx.skills))) {
            __VLS_asFunctionalElement(__VLS_intrinsicElements.li, __VLS_intrinsicElements.li)({
                key: (skill.id ?? `${skill.name}-${skill.description ?? ''}`),
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.div, __VLS_intrinsicElements.div)({
                ...{ class: "skill-header" },
            });
            __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                ...{ class: "skill-name" },
            });
            (skill.name);
            if (skill.badge) {
                __VLS_asFunctionalElement(__VLS_intrinsicElements.span, __VLS_intrinsicElements.span)({
                    ...{ class: "skill-badge" },
                });
                (skill.badge);
            }
            if (skill.description) {
                __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({});
                (skill.description);
            }
        }
    }
}
else {
    __VLS_asFunctionalElement(__VLS_intrinsicElements.section, __VLS_intrinsicElements.section)({
        ...{ class: "status-card empty" },
    });
    __VLS_asFunctionalElement(__VLS_intrinsicElements.h3, __VLS_intrinsicElements.h3)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.p, __VLS_intrinsicElements.p)({});
    __VLS_asFunctionalElement(__VLS_intrinsicElements.button, __VLS_intrinsicElements.button)({
        ...{ onClick: (__VLS_ctx.startEditing) },
        type: "button",
        ...{ class: "primary" },
    });
}
/** @type {__VLS_StyleScopedClasses['profile-workspace']} */ ;
/** @type {__VLS_StyleScopedClasses['status-card']} */ ;
/** @type {__VLS_StyleScopedClasses['error']} */ ;
/** @type {__VLS_StyleScopedClasses['status-card']} */ ;
/** @type {__VLS_StyleScopedClasses['loading']} */ ;
/** @type {__VLS_StyleScopedClasses['shimmer-row']} */ ;
/** @type {__VLS_StyleScopedClasses['primary-card']} */ ;
/** @type {__VLS_StyleScopedClasses['grid']} */ ;
/** @type {__VLS_StyleScopedClasses['muted']} */ ;
/** @type {__VLS_StyleScopedClasses['bio']} */ ;
/** @type {__VLS_StyleScopedClasses['timeline']} */ ;
/** @type {__VLS_StyleScopedClasses['columns']} */ ;
/** @type {__VLS_StyleScopedClasses['item-header']} */ ;
/** @type {__VLS_StyleScopedClasses['empty-state']} */ ;
/** @type {__VLS_StyleScopedClasses['item-header']} */ ;
/** @type {__VLS_StyleScopedClasses['empty-state']} */ ;
/** @type {__VLS_StyleScopedClasses['skills']} */ ;
/** @type {__VLS_StyleScopedClasses['skills-grid']} */ ;
/** @type {__VLS_StyleScopedClasses['skill-header']} */ ;
/** @type {__VLS_StyleScopedClasses['skill-name']} */ ;
/** @type {__VLS_StyleScopedClasses['skill-badge']} */ ;
/** @type {__VLS_StyleScopedClasses['status-card']} */ ;
/** @type {__VLS_StyleScopedClasses['empty']} */ ;
/** @type {__VLS_StyleScopedClasses['primary']} */ ;
var __VLS_dollars;
const __VLS_self = (await import('vue')).defineComponent({
    setup() {
        return {
            profile: profile,
            loading: loading,
            error: error,
            exporting: exporting,
            loadProfile: loadProfile,
            identityFields: identityFields,
            workExperiences: workExperiences,
            educationRecords: educationRecords,
            skills: skills,
            formatRange: formatRange,
            startEditing: startEditing,
            exportResume: exportResume,
        };
    },
});
export default (await import('vue')).defineComponent({
    setup() {
        return {};
    },
});
; /* PartiallyEnd: #4569/main.vue */
