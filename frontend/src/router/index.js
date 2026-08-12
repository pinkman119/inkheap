import { createRouter, createWebHashHistory } from 'vue-router'

/**
 * 路由表：一个原型页面 ↔ 一个 view。
 * meta.layout 还原原型里写在 <body> 上的布局差异；
 * meta.navKey 对应原型脚本里的 activeNavKey。
 */
const routes = [
  {
    path: '/',
    name: 'home',
    component: () => import('@/views/HomeView.vue'),
    meta: { title: '王五 - 产品经理 / 设计师 · 墨堆', layout: 'layout-column', navKey: 'home' },
  },
  {
    path: '/articles',
    name: 'articles',
    component: () => import('@/views/ArticleListView.vue'),
    meta: { title: '文章 - 墨堆', layout: 'layout-flow', navKey: 'kb' },
  },
  {
    path: '/articles/:slug',
    name: 'article-detail',
    component: () => import('@/views/ArticleDetailView.vue'),
    meta: {
      title: 'openSpec 入门：用规格文件驱动 AI 编码 - 墨堆',
      layout: 'layout-flow',
      navKey: 'kb',
    },
  },
  {
    path: '/resume',
    name: 'resume',
    component: () => import('@/views/ResumeView.vue'),
    meta: { title: '简历 - 墨堆', layout: 'layout-flow', navKey: 'resume' },
  },
  {
    path: '/digital-life',
    name: 'digital-life',
    component: () => import('@/views/DigitalLifeView.vue'),
    meta: { title: '数字生命 · 墨堆', layout: 'layout-fixed', navKey: 'digital' },
  },
  {
    path: '/about',
    name: 'about',
    component: () => import('@/views/AboutMeView.vue'),
    meta: { title: '关于我 · 慕士塔格猫 · 墨堆', layout: 'layout-column', navKey: 'about' },
  },
  {
    path: '/xiaoji',
    name: 'xiaoji',
    component: () => import('@/views/XiaojiView.vue'),
    meta: { title: '小记 · 生活杂谈 · 墨堆', layout: 'layout-column', navKey: 'notes' },
  },
  {
    path: '/xiaoji/:id',
    name: 'note-detail',
    component: () => import('@/views/NoteDetailView.vue'),
    meta: { title: '小记详情 - 墨堆', layout: 'layout-flow', navKey: 'notes' },
  },
  { path: '/:pathMatch(.*)*', redirect: '/' },
]

// ===================== Admin 路由 =====================

const adminRoutes = [
  {
    path: '/admin/login',
    name: 'admin-login',
    component: () => import('@/views/admin/LoginView.vue'),
    meta: { title: '登录 · 墨堆 Admin', layout: 'layout-admin', auth: false },
  },
  {
    path: '/admin',
    redirect: '/admin/dashboard',
  },
  {
    path: '/admin/dashboard',
    name: 'admin-dashboard',
    component: () => import('@/views/admin/DashboardView.vue'),
    meta: { title: '仪表盘 · 墨堆 Admin', layout: 'layout-admin', auth: true },
  },
  {
    path: '/admin/articles',
    name: 'admin-articles',
    component: () => import('@/views/admin/ArticleListView.vue'),
    meta: { title: '文章管理 · 墨堆 Admin', layout: 'layout-admin', auth: true },
  },
  {
    path: '/admin/articles/new',
    name: 'admin-article-new',
    component: () => import('@/views/admin/ArticleEditView.vue'),
    meta: { title: '新建文章 · 墨堆 Admin', layout: 'layout-admin', auth: true },
  },
  {
    path: '/admin/articles/:id/edit',
    name: 'admin-article-edit',
    component: () => import('@/views/admin/ArticleEditView.vue'),
    meta: { title: '编辑文章 · 墨堆 Admin', layout: 'layout-admin', auth: true },
  },
]

const router = createRouter({
  history: createWebHashHistory(import.meta.env.BASE_URL),
  routes: [...routes, ...adminRoutes],
  scrollBehavior(to, from, savedPosition) {
    if (savedPosition) return savedPosition
    if (to.hash) return { el: to.hash, behavior: 'smooth', top: 90 }
    return { top: 0 }
  },
})

// ===================== Admin 路由守卫 =====================

router.beforeEach((to, from, next) => {
  if (to.meta?.auth) {
    const token = localStorage.getItem('admin_token')
    if (!token) {
      return next({ name: 'admin-login', query: { redirect: to.fullPath } })
    }
  }
  next()
})

router.afterEach((to) => {
  if (to.meta?.title) document.title = to.meta.title
})

export default router
