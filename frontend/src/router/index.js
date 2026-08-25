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
    path: '/xiaoji/:slug',
    name: 'note-detail',
    component: () => import('@/views/NoteDetailView.vue'),
    props: true,
    meta: { title: '小记详情 - 墨堆', layout: 'layout-flow', navKey: 'notes' },
  },
  {
    path: '/contact',
    name: 'contact',
    component: () => import('@/views/ContactView.vue'),
    meta: { title: '联系我 · 墨堆', layout: 'layout-flow', navKey: 'contact' },
  },
  { path: '/:pathMatch(.*)*', redirect: '/' },
]

// ===================== Admin 路由 =====================

const adminRoutes = [
  {
    path: '/admin/login',
    name: 'admin-login',
    component: () => import('@/views/admin/LoginView.vue'),
    meta: { title: '登录 · 墨堆 Admin', layout: 'layout-login', auth: false },
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
    path: '/admin/contact',
    name: 'admin-contact',
    component: () => import('@/views/admin/ContactManageView.vue'),
    meta: { title: '收信箱 · 墨堆 Admin', layout: 'layout-admin', auth: true },
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
  {
    path: '/admin/categories',
    name: 'admin-categories',
    component: () => import('@/views/admin/CategoryManageView.vue'),
    meta: { title: '分类管理 · 墨堆 Admin', layout: 'layout-admin', auth: true },
  },
  {
    path: '/admin/home-page',
    name: 'admin-home-page',
    component: () => import('@/views/admin/HomePageManageView.vue'),
    meta: { title: '首页管理 · 墨堆 Admin', layout: 'layout-admin', auth: true },
  },
  {
    path: '/admin/resume',
    name: 'admin-resume',
    component: () => import('@/views/admin/ResumeManageView.vue'),
    meta: { title: '简历管理 · 墨堆 Admin', layout: 'layout-admin', auth: true },
  },
  {
    path: '/admin/xiaoji',
    name: 'admin-xiaoji',
    component: () => import('@/views/admin/AdminXiaojiListView.vue'),
    meta: { title: '小记管理 · 墨堆 Admin', layout: 'layout-admin', auth: true },
  },
  {
    path: '/admin/xiaoji/new',
    name: 'admin-xiaoji-new',
    component: () => import('@/views/admin/AdminXiaojiEditView.vue'),
    meta: { title: '新建小记 · 墨堆 Admin', layout: 'layout-admin', auth: true },
  },
  {
    path: '/admin/xiaoji/:id/edit',
    name: 'admin-xiaoji-edit',
    component: () => import('@/views/admin/AdminXiaojiEditView.vue'),
    meta: { title: '编辑小记 · 墨堆 Admin', layout: 'layout-admin', auth: true },
  },
  // ===== 关于我管理 =====
  {
    path: '/admin/about/profile',
    name: 'admin-about-profile',
    component: () => import('@/views/admin/about/ProfileManageView.vue'),
    meta: { title: '关于我·个人资料 · 墨堆 Admin', layout: 'layout-admin', auth: true },
  },
  {
    path: '/admin/about/footprints',
    name: 'admin-about-footprints',
    component: () => import('@/views/admin/about/FootprintsManageView.vue'),
    meta: { title: '关于我·足迹 · 墨堆 Admin', layout: 'layout-admin', auth: true },
  },
  {
    path: '/admin/about/events',
    name: 'admin-about-events',
    component: () => import('@/views/admin/about/EventsManageView.vue'),
    meta: { title: '关于我·事件日历 · 墨堆 Admin', layout: 'layout-admin', auth: true },
  },
  // ===== 数字生命管理 =====
  {
    path: '/admin/digital-life/model',
    name: 'admin-digital-life-model',
    component: () => import('@/views/admin/digitallife/ModelManageView.vue'),
    meta: { title: '数字生命·模型管理 · 墨堆 Admin', layout: 'layout-admin', auth: true },
  },
  {
    path: '/admin/digital-life/persona',
    name: 'admin-digital-life-persona',
    component: () => import('@/views/admin/digitallife/PersonaManageView.vue'),
    meta: { title: '数字生命·人格编写 · 墨堆 Admin', layout: 'layout-admin', auth: true },
  },
  {
    path: '/admin/digital-life/training',
    name: 'admin-digital-life-training',
    component: () => import('@/views/admin/digitallife/TrainingManageView.vue'),
    meta: { title: '数字生命·训练管理 · 墨堆 Admin', layout: 'layout-admin', auth: true },
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
  // 前台页面 PV 上报（排除 admin 后台路由）
  if (!to.path.startsWith('/admin')) reportVisit(to.path)
})

// ===================== 前台 PV 上报 =====================

// API 基础路径判断与 useApi 保持一致：
// 开发环境（Vite 5173/4173）直连后端 3000；生产同源走 Nginx 反代
const VISIT_IS_DEV =
  typeof window !== 'undefined' &&
  (window.location.port === '5173' || window.location.port === '4173')
const VISIT_BASE = VISIT_IS_DEV ? 'http://localhost:3000/api' : '/api'

// 同一路径 30 秒内只上报一次（防刷新抖动 / 短时间往返）
const VISIT_THROTTLE_MS = 30 * 1000
const visitLastAt = new Map()

function reportVisit(path) {
  const now = Date.now()
  const last = visitLastAt.get(path) || 0
  if (now - last < VISIT_THROTTLE_MS) return
  visitLastAt.set(path, now)

  fetch(`${VISIT_BASE}/visit`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ path }),
  }).catch(() => {
    /* 上报失败静默忽略 */
  })
}

export default router
