<script setup>
import { ref, computed, watch, nextTick, onMounted, onBeforeUnmount } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAdminAuth } from '@/composables/useAdminAuth'
import { useApi } from '@/composables/useApi'
import { useAdminBadges } from '@/composables/useAdminBadges'
import { useTheme } from '@/composables/useTheme'
import BrandMark from '@/components/BrandMark.vue'
import ConfirmDialog from '@/components/ConfirmDialog.vue'

const route = useRoute()
const router = useRouter()
const { user, clearAuth, updateUser } = useAdminAuth()
const { get, assetUrl } = useApi()
const { toggleTheme } = useTheme()

// ===== 侧栏：桌面折叠 / 移动端抽屉 =====
const sidebarCollapsed = ref(false)
const mobileOpen = ref(false)
const mqMobile = window.matchMedia('(max-width: 900px)')

function onMenuToggle() {
  if (mqMobile.matches) mobileOpen.value = !mobileOpen.value
  else sidebarCollapsed.value = !sidebarCollapsed.value
}

function onMqChange() {
  if (mqMobile.matches) sidebarCollapsed.value = false
  else mobileOpen.value = false
}

// ===== 面包屑：当前页标题（取 meta.title 第一段）=====
const pageTitle = computed(() => String(route.meta?.title || '后台').split(' · ')[0])

// ===== 菜单高亮（含 新建/编辑 子路由）=====
function isActive(prefix) {
  return route.path === prefix || route.path.startsWith(prefix + '/')
}

// ===== 侧栏红点：收信箱未读数 / 友链待审核数（跨组件共享，操作后可实时刷新）=====
const { unreadCount, pendingFriendCount, refreshAll } = useAdminBadges()

// ===== 用户下拉菜单 =====
const userMenuOpen = ref(false)
const userName = computed(() => user.value?.username || '墨堆主理人')
const userInitial = computed(() => userName.value.trim().charAt(0) || '墨')

// ===== 当前管理员头像（「系统用户」里配置，存于 admin_users.avatar）=====
const avatarFailed = ref(false)
const userAvatar = computed(() => user.value?.avatar || '')
const avatarSrc = computed(() => (avatarFailed.value ? '' : assetUrl(userAvatar.value)))
// 换头像后重置加载失败的降级标记，避免一直显示首字
watch(userAvatar, () => { avatarFailed.value = false })

function onDocClick(e) {
  if (userMenuOpen.value && !e.target.closest('.user-menu')) userMenuOpen.value = false
}

function onKeydown(e) {
  if (e.key !== 'Escape') return
  userMenuOpen.value = false
  mobileOpen.value = false
}

// ===== 退出登录：确认弹窗卡片（替换原生 confirm）=====
const logoutConfirmOpen = ref(false)

function handleLogout() {
  userMenuOpen.value = false
  logoutConfirmOpen.value = true
}

function cancelLogout() {
  logoutConfirmOpen.value = false
}

function confirmLogout() {
  logoutConfirmOpen.value = false
  clearAuth()
  router.push({ name: 'admin-login' })
}

// ===== 主题切换（图标旋转动画，与原型一致）=====
const themeSpinning = ref(false)

function onToggleTheme() {
  toggleTheme()
  themeSpinning.value = false
  nextTick(() => requestAnimationFrame(() => { themeSpinning.value = true }))
}

// ===== 路由切换时收起移动端抽屉 / 用户菜单 =====
watch(() => route.fullPath, () => {
  mobileOpen.value = false
  userMenuOpen.value = false
})

onMounted(async () => {
  document.addEventListener('click', onDocClick)
  document.addEventListener('keydown', onKeydown)
  mqMobile.addEventListener('change', onMqChange)
  await refreshAll()
  // 同步当前管理员资料：头像等字段可能未包含在旧版本的本地缓存里
  try {
    const me = await get('/admin/auth/me')
    if (me) updateUser({ username: me.username, role: me.role, avatar: me.avatar ?? null })
  } catch {
    /* 忽略：个人资料非关键 */
  }
})

onBeforeUnmount(() => {
  document.removeEventListener('click', onDocClick)
  document.removeEventListener('keydown', onKeydown)
  mqMobile.removeEventListener('change', onMqChange)
})
</script>

<template>
  <div class="admin" :class="{ collapsed: sidebarCollapsed, 'mobile-open': mobileOpen }">
    <aside class="sidenav">
      <div class="sidenav__brand">
        <BrandMark />
        <span class="brand-name">墨堆</span>
        <span class="sidenav__tag">后台</span>
      </div>

      <nav class="sidenav__nav">
        <div class="sidenav__group">
          <div class="sidenav__group-title">概览</div>
          <router-link to="/admin/dashboard" class="sidenav__item" :class="{ active: isActive('/admin/dashboard') }">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/></svg>
            <span class="sidenav__label">仪表盘</span>
          </router-link>
        </div>

        <div class="sidenav__group">
          <div class="sidenav__group-title">内容运营</div>
          <router-link to="/admin/categories" class="sidenav__item" :class="{ active: isActive('/admin/categories') }">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.83z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>
            <span class="sidenav__label">分类管理</span>
          </router-link>
          <router-link to="/admin/articles" class="sidenav__item" :class="{ active: isActive('/admin/articles') }">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>
            <span class="sidenav__label">文章管理</span>
          </router-link>
          <router-link to="/admin/xiaoji" class="sidenav__item" :class="{ active: isActive('/admin/xiaoji') }">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
            <span class="sidenav__label">小记管理</span>
          </router-link>
        </div>

        <div class="sidenav__group">
          <div class="sidenav__group-title">关于我</div>
          <router-link to="/admin/about/profile" class="sidenav__item" :class="{ active: isActive('/admin/about/profile') }">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
            <span class="sidenav__label">个人资料</span>
          </router-link>
          <router-link to="/admin/about/footprints" class="sidenav__item" :class="{ active: isActive('/admin/about/footprints') }">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
            <span class="sidenav__label">足迹</span>
          </router-link>
          <router-link to="/admin/about/events" class="sidenav__item" :class="{ active: isActive('/admin/about/events') }">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
            <span class="sidenav__label">事件日历</span>
          </router-link>
          <router-link to="/admin/resume" class="sidenav__item" :class="{ active: isActive('/admin/resume') }">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
            <span class="sidenav__label">简历管理</span>
          </router-link>
        </div>

        <div class="sidenav__group">
          <div class="sidenav__group-title">数字生命</div>
          <router-link to="/admin/digital-life/model" class="sidenav__item" :class="{ active: isActive('/admin/digital-life/model') }">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></svg>
            <span class="sidenav__label">模型管理</span>
          </router-link>
          <router-link to="/admin/digital-life/persona" class="sidenav__item" :class="{ active: isActive('/admin/digital-life/persona') }">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
            <span class="sidenav__label">人格编写</span>
          </router-link>
          <router-link to="/admin/digital-life/training" class="sidenav__item" :class="{ active: isActive('/admin/digital-life/training') }">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
            <span class="sidenav__label">训练管理</span>
          </router-link>
        </div>

        <div class="sidenav__group">
          <div class="sidenav__group-title">系统</div>
          <router-link to="/admin/users" class="sidenav__item" :class="{ active: isActive('/admin/users') }">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
            <span class="sidenav__label">系统用户</span>
          </router-link>
          <router-link to="/admin/home-page" class="sidenav__item" :class="{ active: isActive('/admin/home-page') }">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><line x1="4" y1="21" x2="4" y2="14"/><line x1="4" y1="10" x2="4" y2="3"/><line x1="12" y1="21" x2="12" y2="12"/><line x1="12" y1="8" x2="12" y2="3"/><line x1="20" y1="21" x2="20" y2="16"/><line x1="20" y1="12" x2="20" y2="3"/><line x1="1" y1="14" x2="7" y2="14"/><line x1="9" y1="8" x2="15" y2="8"/><line x1="17" y1="16" x2="23" y2="16"/></svg>
            <span class="sidenav__label">首页管理</span>
          </router-link>
          <router-link to="/admin/footer" class="sidenav__item" :class="{ active: isActive('/admin/footer') }">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M22 8H2a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h20a1 1 0 0 0 1-1V9a1 1 0 0 0-1-1z"/><line x1="6" y1="12" x2="10" y2="12"/><line x1="6" y1="16" x2="10" y2="16"/><line x1="14" y1="12" x2="18" y2="12"/><line x1="14" y1="16" x2="18" y2="16"/></svg>
            <span class="sidenav__label">底部管理</span>
          </router-link>
          <router-link to="/admin/site-config" class="sidenav__item" :class="{ active: isActive('/admin/site-config') }">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
            <span class="sidenav__label">站点设置</span>
          </router-link>
          <router-link to="/admin/contact" class="sidenav__item" :class="{ active: isActive('/admin/contact') }">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
            <span class="sidenav__label">收信箱</span>
            <span v-if="unreadCount > 0" class="nav-badge">{{ unreadCount > 99 ? '99+' : unreadCount }}</span>
          </router-link>
          <router-link to="/admin/comments" class="sidenav__item" :class="{ active: isActive('/admin/comments') }">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
            <span class="sidenav__label">评论管理</span>
          </router-link>
          <router-link to="/admin/friends" class="sidenav__item" :class="{ active: isActive('/admin/friends') }">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="7" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0"/><path d="M16 4.5a3.5 3.5 0 0 1 0 7"/><path d="M18 14a6.5 6.5 0 0 1 3.5 5.6"/></svg>
            <span class="sidenav__label">友链管理</span>
            <span v-if="pendingFriendCount > 0" class="nav-badge">{{ pendingFriendCount > 99 ? '99+' : pendingFriendCount }}</span>
          </router-link>
          <router-link to="/" class="sidenav__item">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
            <span class="sidenav__label">返回站点</span>
          </router-link>
        </div>
      </nav>

      <div class="sidenav__foot">墨堆 · Admin v0.1</div>
    </aside>

    <div class="admin__main">
      <header class="topbar">
        <div class="topbar__left">
          <button class="topbar__menu" type="button" aria-label="切换菜单" @click="onMenuToggle">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
          </button>
          <div class="topbar__title">
            <span class="topbar__crumb">后台</span>
            <span class="topbar__sep">/</span>
            <span class="topbar__current">{{ pageTitle }}</span>
          </div>
        </div>
        <div class="topbar__right">
          <router-link to="/" class="topbar__return">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
            <span>返回站点</span>
          </router-link>
          <button class="theme-toggle" type="button" aria-label="切换主题" @click="onToggleTheme">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" :class="{ spin: themeSpinning }"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>
          </button>
          <div class="user-menu">
            <button class="topbar__user" type="button" aria-haspopup="true" :aria-expanded="userMenuOpen" :title="userName" @click.stop="userMenuOpen = !userMenuOpen">
              <img v-if="avatarSrc" :src="avatarSrc" alt="" class="topbar__user-img" @error="avatarFailed = true" />
              <template v-else>{{ userInitial }}</template>
            </button>
            <div class="user-dropdown" :class="{ open: userMenuOpen }" role="menu" aria-label="账户菜单">
              <div class="user-dropdown__head">
                <span class="user-dropdown__avatar">
                  <img v-if="avatarSrc" :src="avatarSrc" alt="" class="avatar-img" @error="avatarFailed = true" />
                  <template v-else>{{ userInitial }}</template>
                </span>
                <span class="user-dropdown__meta">
                  <span class="user-dropdown__name">{{ userName }}</span>
                  <span class="user-dropdown__role">管理员</span>
                </span>
              </div>
              <button class="user-dropdown__item" type="button" role="menuitem" @click="handleLogout">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
                <span>退出登录</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      <main class="admin-content">
        <slot />
      </main>
    </div>
  </div>

  <div class="sidenav-backdrop" :class="{ show: mobileOpen }" @click="mobileOpen = false"></div>

  <!-- ===== 退出登录确认弹窗（与事件日历删除确认同款）===== -->
  <ConfirmDialog
    :open="logoutConfirmOpen"
    title="退出登录"
    confirm-label="退出"
    :danger="false"
    @cancel="cancelLogout"
    @confirm="confirmLogout"
  >
    确定要退出登录吗？
  </ConfirmDialog>
</template>

<style scoped>
/* ===== Admin shell: sidenav + topbar（样式取自原型 homepage-manage.html）===== */
.admin {
  display: flex;
  height: 100vh;
  background: var(--bg-body);
  color: var(--text-primary);
  font-family: var(--font-sans);
}

.admin__main {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
}

/* ===== Sidenav ===== */
.sidenav {
  width: 248px;
  flex-shrink: 0;
  background-color: var(--bg-sidebar);
  border-right: 1px solid var(--border-light);
  display: flex;
  flex-direction: column;
  transition: width 0.28s cubic-bezier(0.4, 0, 0.2, 1), transform 0.28s cubic-bezier(0.4, 0, 0.2, 1);
  z-index: 95;
}

.sidenav__brand {
  display: flex;
  align-items: center;
  gap: 10px;
  height: 64px;
  padding: 0 20px;
  flex-shrink: 0;
  border-bottom: 1px solid var(--border-light);
}

.brand-mark {
  --mark-size: 28px;
}

.brand-name {
  font-family: var(--font-serif);
  font-size: 20px;
  font-weight: 700;
  letter-spacing: 0.08em;
  line-height: 1;
  color: var(--accent);
}

.sidenav__tag {
  font-family: var(--font-mono);
  font-size: 11px;
  font-weight: 500;
  letter-spacing: 0.08em;
  color: var(--accent);
  background-color: var(--accent-light);
  padding: 2px 8px;
  border-radius: 100px;
  margin-left: 2px;
}

.sidenav__nav {
  flex: 1;
  overflow-y: auto;
  padding: 16px 12px;
  /* 隐藏滚动条：菜单仍可滚动，仅去掉轨道与滑块，避免侧栏视觉突兀 */
  scrollbar-width: none; /* Firefox */
  -ms-overflow-style: none; /* 旧版 Edge / IE */
}

.sidenav__nav::-webkit-scrollbar {
  width: 0;
  height: 0;
  display: none;
}

.sidenav__group {
  margin-bottom: 18px;
}
.sidenav__group:last-child {
  margin-bottom: 0;
}

.sidenav__group-title {
  font-family: var(--font-mono);
  font-size: 11px;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  color: var(--text-tertiary);
  padding: 0 12px 8px;
}

.sidenav__item {
  position: relative;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 12px;
  margin-bottom: 2px;
  border-radius: 10px;
  color: var(--text-secondary);
  text-decoration: none;
  font-size: 14.5px;
  font-weight: 500;
  transition: color var(--transition), background-color var(--transition);
}

.sidenav__item svg {
  width: 18px;
  height: 18px;
  flex-shrink: 0;
}

.sidenav__item:hover {
  background-color: var(--accent-light);
  color: var(--accent);
}

.sidenav__item.active {
  background-color: var(--accent-light);
  color: var(--accent);
  font-weight: 600;
}

.sidenav__item.active::before {
  content: '';
  position: absolute;
  left: 0;
  top: 50%;
  transform: translateY(-50%);
  width: 3px;
  height: 18px;
  border-radius: 100px;
  background-color: var(--accent);
}

.nav-badge {
  margin-left: auto;
  min-width: 18px;
  height: 18px;
  padding: 0 5px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  font-weight: 600;
  line-height: 1;
  color: #fff;
  background: #e03131;
  border-radius: 999px;
}

.sidenav__foot {
  flex-shrink: 0;
  padding: 14px 20px;
  border-top: 1px solid var(--border-light);
  font-family: var(--font-mono);
  font-size: 11.5px;
  color: var(--text-tertiary);
  letter-spacing: 0.04em;
}

/* ===== Topbar ===== */
.topbar {
  height: 64px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 24px;
  background-color: var(--bg-body);
  border-bottom: 1px solid var(--border-light);
  z-index: 90;
}

.topbar__left {
  display: flex;
  align-items: center;
  gap: 14px;
  min-width: 0;
}

.topbar__menu {
  width: 38px;
  height: 38px;
  border-radius: 10px;
  flex-shrink: 0;
  border: 1px solid var(--border);
  background: transparent;
  color: var(--text-secondary);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all var(--transition);
}
.topbar__menu:hover {
  border-color: var(--accent);
  color: var(--accent);
  background-color: var(--accent-light);
}
.topbar__menu svg {
  width: 20px;
  height: 20px;
}

.topbar__title {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.topbar__crumb {
  font-size: 13px;
  color: var(--text-tertiary);
}

.topbar__sep {
  color: var(--text-tertiary);
}

.topbar__current {
  font-family: var(--font-serif);
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.topbar__right {
  display: flex;
  align-items: center;
  gap: 14px;
  flex-shrink: 0;
}

.topbar__return {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-family: var(--font-sans);
  font-size: 13.5px;
  font-weight: 500;
  color: var(--text-secondary);
  text-decoration: none;
  padding: 7px 14px;
  border-radius: 100px;
  border: 1px solid var(--border);
  transition: all var(--transition);
}
.topbar__return svg {
  width: 15px;
  height: 15px;
}
.topbar__return:hover {
  border-color: var(--accent);
  color: var(--accent);
  background-color: var(--accent-light);
}

/* ===== User menu（头像下拉）===== */
.user-menu {
  position: relative;
}

.topbar__user {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  flex-shrink: 0;
  background-color: var(--accent);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: var(--font-serif);
  font-weight: 600;
  font-size: 15px;
  border: none;
  padding: 0;
  cursor: pointer;
  transition: transform var(--transition), box-shadow var(--transition);
}
.topbar__user:hover {
  transform: translateY(-1px);
  box-shadow: var(--shadow-md);
}
/* 配置了头像时铺满圆形按钮并裁切 */
.topbar__user-img {
  flex: none;
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: 50%;
  display: block;
}
.topbar__user:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
}

[data-theme='dark'] .topbar__user {
  color: #0f0f0f;
}

.user-dropdown {
  position: absolute;
  top: calc(100% + 12px);
  right: 0;
  width: 224px;
  background-color: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-lg);
  padding: 8px;
  z-index: 200;
  overflow: hidden;
  opacity: 0;
  transform: translateY(-6px) scale(0.98);
  transform-origin: top right;
  visibility: hidden;
  transition: opacity var(--transition), transform var(--transition), visibility var(--transition);
}
.user-dropdown.open {
  opacity: 1;
  transform: translateY(0) scale(1);
  visibility: visible;
}

.user-dropdown__head {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 10px 12px;
  margin-bottom: 6px;
  border-bottom: 1px solid var(--border-light);
}

.user-dropdown__avatar {
  width: 38px;
  height: 38px;
  border-radius: 50%;
  flex-shrink: 0;
  background-color: var(--accent);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: var(--font-serif);
  font-weight: 600;
  font-size: 16px;
}
[data-theme='dark'] .user-dropdown__avatar {
  color: #0f0f0f;
}
.user-dropdown__avatar .avatar-img {
  flex: none;
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: 50%;
  display: block;
}

.user-dropdown__meta {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.user-dropdown__name {
  font-family: var(--font-sans);
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
}

.user-dropdown__role {
  font-size: 12px;
  color: var(--text-tertiary);
}

.user-dropdown__item {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  padding: 9px 10px;
  border: none;
  background: transparent;
  cursor: pointer;
  font-family: var(--font-sans);
  font-size: 14px;
  color: var(--text-secondary);
  border-radius: 8px;
  text-align: left;
  transition: all var(--transition);
}
.user-dropdown__item svg {
  width: 16px;
  height: 16px;
  flex-shrink: 0;
}
.user-dropdown__item:hover {
  background-color: var(--accent-light);
  color: var(--accent);
}
.user-dropdown__item:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: -2px;
}

/* ===== Theme toggle ===== */
.theme-toggle {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  border: 1px solid var(--border);
  background: transparent;
  color: var(--text-secondary);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all var(--transition);
}
.theme-toggle:hover {
  border-color: var(--accent);
  color: var(--accent);
  background-color: var(--accent-light);
}
.theme-toggle svg {
  transition: transform 0.55s cubic-bezier(0.22, 1, 0.36, 1);
}
.theme-toggle svg.spin {
  transform: rotate(360deg);
}

/* ===== Backdrop（移动端抽屉遮罩）===== */
.sidenav-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.45);
  opacity: 0;
  visibility: hidden;
  transition: opacity 0.28s ease, visibility 0.28s ease;
  z-index: 80;
}
.sidenav-backdrop.show {
  opacity: 1;
  visibility: visible;
}

/* ===== 折叠：桌面图标栏 ===== */
.admin.collapsed .sidenav {
  width: 76px;
}
.admin.collapsed .brand-name,
.admin.collapsed .sidenav__tag,
.admin.collapsed .sidenav__label,
.admin.collapsed .sidenav__group-title,
.admin.collapsed .sidenav__foot,
.admin.collapsed .nav-badge {
  display: none;
}
.admin.collapsed .sidenav__brand {
  justify-content: center;
  padding: 0;
}
.admin.collapsed .sidenav__item {
  justify-content: center;
  padding: 11px 0;
}
.admin.collapsed .sidenav__group {
  padding: 0 8px;
}

/* ===== 移动端：off-canvas 抽屉 ===== */
@media (max-width: 900px) {
  .sidenav {
    position: fixed;
    left: 0;
    top: 0;
    bottom: 0;
    height: 100vh;
    transform: translateX(-100%);
    box-shadow: var(--shadow-lg);
  }
  .admin.mobile-open .sidenav {
    transform: translateX(0);
  }
  .topbar {
    padding: 0 16px;
  }
  .topbar__return span {
    display: none;
  }
}

/* ===== 内容区（类名保持，供页面滚动锁定等逻辑使用）===== */
.admin-content {
  flex: 1;
  overflow-y: auto;
  padding: 32px;
  background: var(--bg-body);
}
</style>
