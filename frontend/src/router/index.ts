import { createRouter, createWebHistory, type RouteLocationNormalized, type NavigationGuardNext } from 'vue-router';
import { useAuthStore } from '@/stores/auth';

const routes = [
  // ===== 前台路由（无需认证）=====
  {
    path: '/',
    name: 'public-home',
    component: () => import('../views/public/PublicProfile.vue'),
    meta: {
      title: '个人主页',
      layout: 'public'
    }
  },
  {
    path: '/docs',
    name: 'public-docs',
    component: () => import('../views/public/PublicDocs.vue'),
    meta: {
      title: '文档',
      layout: 'public'
    }
  },
  {
    path: '/notes',
    name: 'public-notes',
    component: () => import('../views/public/PublicNotes.vue'),
    meta: {
      title: '小记',
      layout: 'public'
    }
  },
  {
    path: '/resume',
    name: 'public-resume',
    component: () => import('../views/public/PublicResume.vue'),
    meta: {
      title: '简历',
      layout: 'public'
    }
  },
  {
    path: '/life',
    name: 'public-life',
    component: () => import('../views/public/PublicLife.vue'),
    meta: {
      title: '生活',
      layout: 'public'
    }
  },
  {
    path: '/articles',
    name: 'public-articles',
    component: () => import('../views/public/PublicArticles.vue'),
    meta: {
      title: '文章列表',
      layout: 'public'
    }
  },
  {
    path: '/articles/:id',
    name: 'public-article-detail',
    component: () => import('../views/public/PublicArticleDetail.vue'),
    meta: {
      title: '文章详情',
      layout: 'public'
    }
  },
  {
    path: '/stats',
    name: 'public-stats',
    component: () => import('../views/public/PublicStats.vue'),
    meta: {
      title: '蒸馏',
      layout: 'public'
    }
  },
  {
    path: '/dark-stats',
    name: 'public-dark-stats',
    component: () => import('../views/public/PublicDarkStats.vue'),
    meta: {
      title: '蒸馏',
      layout: 'public'
    }
  },

  // ===== 后台路由（需要认证）=====
  {
    path: '/admin',
    redirect: '/admin/dashboard'
  },
  {
    path: '/admin/dashboard',
    name: 'admin-dashboard',
    component: () => import('../views/admin/HomeOverview.vue'),
    meta: {
      title: '工作台总览',
      layout: 'admin',
      requiresAuth: true
    }
  },
  {
    path: '/admin/articles',
    name: 'admin-articles',
    component: () => import('../views/admin/ArticleBoard.vue'),
    meta: {
      title: '文章管理',
      layout: 'admin',
      requiresAuth: true
    }
  },
  {
    path: '/admin/diary',
    name: 'admin-diary',
    component: () => import('../views/admin/DiaryCalendar.vue'),
    meta: {
      title: '日记管理',
      layout: 'admin',
      requiresAuth: true
    }
  },
  {
    path: '/admin/profile',
    name: 'admin-profile',
    component: () => import('../views/admin/ProfileWorkspace.vue'),
    meta: {
      title: '个人档案',
      layout: 'admin',
      requiresAuth: true
    }
  },
  {
    path: '/admin/login',
    name: 'admin-login',
    component: () => import('../views/admin/LoginPortal.vue'),
    meta: {
      title: '登录',
      layout: 'auth',
      guestOnly: true
    }
  },

  // ===== 兼容旧路由（可选，后续可删除）=====
  {
    path: '/profile',
    redirect: '/admin/profile'
  },
  {
    path: '/diary',
    redirect: '/admin/diary'
  },

  // ===== 404 重定向 =====
  {
    path: '/:pathMatch(.*)*',
    redirect: '/'
  }
];

const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior() {
    return { top: 0 };
  }
});

router.beforeEach((to, _from, next: NavigationGuardNext) => {
  const authStore = useAuthStore();
  if (!authStore.ready) {
    authStore.initialize();
  }

  // 前台路由：无需认证
  if (to.meta.layout === 'public') {
    next();
    return;
  }

  // 登录页特殊处理
  if (to.meta.guestOnly && authStore.isAuthenticated) {
    const redirectTarget = (to.query.redirect as string) || '/admin/dashboard';
    next(redirectTarget);
    return;
  }

  // 后台路由：需要认证
  const requiresAuth = to.meta.requiresAuth !== false;
  if (requiresAuth && !authStore.isAuthenticated && to.name !== 'admin-login') {
    next({ name: 'admin-login', query: { redirect: to.fullPath } });
    return;
  }

  next();
});

router.afterEach((to: RouteLocationNormalized) => {
  if (to.meta?.title) {
    const suffix = to.meta.layout === 'public' ? ' · PersonaFlow' : ' · PersonaFlow Admin';
    document.title = `${to.meta.title}${suffix}`;
  }
});

export default router;
