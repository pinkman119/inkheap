<script setup>
</script>

<template>
  <div class="admin-shell">
    <header class="admin-header">
      <div class="header-left">
        <button class="menu-toggle" @click="toggleSidebar" title="菜单">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="3" y1="6" x2="21" y2="6"/>
            <line x1="3" y1="12" x2="21" y2="12"/>
            <line x1="3" y1="18" x2="21" y2="18"/>
          </svg>
        </button>
        <div class="brand">
          <span class="brand-dot"></span>
          <span class="brand-text">墨堆 Admin</span>
        </div>
      </div>
      <div class="header-right">
        <span class="user-name">{{ user?.username || 'Admin' }}</span>
        <button class="btn-logout" @click="handleLogout" title="退出登录">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
            <polyline points="16,17 21,12 16,7"/>
            <line x1="21" y1="12" x2="9" y2="12"/>
          </svg>
        </button>
      </div>
    </header>
    <div class="admin-body">
      <aside class="admin-sidebar" :class="{ collapsed: sidebarCollapsed }">
        <nav class="sidebar-nav">
          <div class="nav-section">
            <div class="section-label">工作台</div>
            <router-link to="/admin/dashboard" class="nav-item" active-class="active">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
                <rect x="3" y="3" width="7" height="9"/><rect x="14" y="3" width="7" height="5"/><rect x="14" y="12" width="7" height="9"/><rect x="3" y="16" width="7" height="5"/>
              </svg>
              <span>仪表盘</span>
            </router-link>
          </div>
          <div class="nav-section">
            <div class="section-label">首页</div>
            <router-link to="/admin/home-page" class="nav-item" active-class="active">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
                <path d="M3 11l9-8 9 8"/><path d="M5 10v10a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V10"/><path d="M9 21v-6h6v6"/>
              </svg>
              <span>首页管理</span>
            </router-link>
          </div>
          <div class="nav-section">
            <div class="section-label">知识库</div>
            <router-link to="/admin/categories" class="nav-item" active-class="active">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
                <path d="M3 7h18M3 12h18M3 17h18"/><circle cx="7" cy="7" r="1.4" fill="currentColor" stroke="none"/><circle cx="7" cy="12" r="1.4" fill="currentColor" stroke="none"/><circle cx="7" cy="17" r="1.4" fill="currentColor" stroke="none"/>
              </svg>
              <span>分类管理</span>
            </router-link>
            <router-link to="/admin/articles" class="nav-item" active-class="active">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14,2 14,8 20,8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>
              </svg>
              <span>文章管理</span>
            </router-link>
          </div>
        </nav>
      </aside>
      <main class="admin-content">
        <slot />
      </main>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAdminAuth } from '@/composables/useAdminAuth'

const router = useRouter()
const { user, clearAuth } = useAdminAuth()
const sidebarCollapsed = ref(false)

function toggleSidebar() {
  sidebarCollapsed.value = !sidebarCollapsed.value
}

function handleLogout() {
  clearAuth()
  router.push({ name: 'admin-login' })
}
</script>

<style scoped>
.admin-shell {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background: var(--bg-body);
  color: var(--text-primary);
  font-family: var(--font-sans);
}

/* ===== Header ===== */
.admin-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 60px;
  padding: 0 24px;
  background: var(--bg-card);
  border-bottom: 1px solid var(--border);
  flex-shrink: 0;
  z-index: 100;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 16px;
}

.menu-toggle {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border: none;
  background: transparent;
  color: var(--text-secondary);
  cursor: pointer;
  border-radius: var(--radius-sm);
  transition: background var(--transition);
}
.menu-toggle:hover { background: var(--bg-soft); }

.brand {
  display: flex;
  align-items: center;
  gap: 10px;
}

.brand-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: var(--accent);
}

.brand-text {
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary);
}

.header-right {
  display: flex;
  align-items: center;
  gap: 16px;
}

.user-name {
  font-size: 14px;
  color: var(--text-secondary);
}

.btn-logout {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border: 1px solid var(--border);
  background: var(--bg-card);
  color: var(--text-secondary);
  cursor: pointer;
  border-radius: var(--radius-sm);
  transition: all var(--transition);
}
.btn-logout:hover {
  border-color: #e03131;
  color: #e03131;
  background: #fff5f5;
}

/* ===== Body ===== */
.admin-body {
  display: flex;
  flex: 1;
  overflow: hidden;
}

/* ===== Sidebar ===== */
.admin-sidebar {
  width: 210px;
  background: var(--bg-card);
  border-right: 1px solid var(--border);
  overflow-y: auto;
  flex-shrink: 0;
  transition: width var(--transition);
}

.admin-sidebar.collapsed {
  width: 64px;
}

.admin-sidebar.collapsed .section-label {
  opacity: 0;
  height: 0;
  padding: 0;
  margin: 0;
  overflow: hidden;
}

.admin-sidebar.collapsed .sidebar-nav {
  padding: 16px 8px;
  align-items: center;
}

.admin-sidebar.collapsed .nav-item {
  justify-content: center;
  gap: 0;
  padding: 10px 0;
}

.admin-sidebar.collapsed .nav-item span {
  display: none;
}

.sidebar-nav {
  padding: 16px 12px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.nav-section {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.section-label {
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: var(--text-tertiary);
  padding: 8px 12px 4px;
}

.nav-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 12px;
  border-radius: var(--radius-sm);
  color: var(--text-secondary);
  text-decoration: none;
  font-size: 14px;
  font-weight: 500;
  transition: all var(--transition);
  position: relative;
}

.nav-item:hover {
  background: var(--bg-soft);
  color: var(--text-primary);
}

.nav-item.active {
  background: var(--accent-light);
  color: var(--accent);
}

.nav-item.active::before {
  content: '';
  position: absolute;
  left: 0;
  top: 8px;
  bottom: 8px;
  width: 3px;
  border-radius: 0 2px 2px 0;
  background: var(--accent);
}

/* ===== Content ===== */
.admin-content {
  flex: 1;
  overflow-y: auto;
  padding: 32px;
  background: var(--bg-body);
}
</style>
