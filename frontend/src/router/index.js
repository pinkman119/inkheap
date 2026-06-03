import { createRouter, createWebHistory } from 'vue-router';
import { useAuthStore } from '@/stores/auth';

const routes = [
    {
        path: '/',
        name: 'home',
        component: () => import('../views/HomeOverview.vue'),
        meta: { title: '工作台总览', requiresAuth: true }
    },
    {
        path: '/articles',
        name: 'articles',
        component: () => import('../views/ArticleBoard.vue'),
        meta: { title: '文章管理', requiresAuth: true }
    },
    {
        path: '/diary',
        name: 'diary',
        component: () => import('../views/DiaryCalendar.vue'),
        meta: { title: '日记日历', requiresAuth: true }
    },
    {
        path: '/profile',
        name: 'profile',
        component: () => import('../views/ProfileWorkspace.vue'),
        meta: { title: '个人档案', requiresAuth: true }
    },
    {
        path: '/login',
        name: 'login',
        component: () => import('../views/LoginPortal.vue'),
        meta: { title: '登录', layout: 'auth', guestOnly: true, requiresAuth: false }
    }
];

const router = createRouter({
    history: createWebHistory(),
    routes
});

router.beforeEach((to, _from, next) => {
    const authStore = useAuthStore();
    if (!authStore.ready) {
        authStore.initialize();
    }

    const requiresAuth = to.meta.requiresAuth !== false;
    if (requiresAuth && !authStore.isAuthenticated && to.name !== 'login') {
        next({ name: 'login', query: { redirect: to.fullPath } });
        return;
    }

    if (to.meta.guestOnly && authStore.isAuthenticated) {
        const redirectTarget = to.query.redirect || '/';
        next(redirectTarget);
        return;
    }

    next();
});

router.afterEach((to) => {
    if (to.meta?.title) {
        document.title = `${to.meta.title} · PersonaFlow`;
    }
});

export default router;
