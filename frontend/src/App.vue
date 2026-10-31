<script setup>
import { watch, computed } from 'vue'
import { useRoute } from 'vue-router'
import AdminShell from '@/layouts/AdminShell.vue'
import AuthModal from '@/components/AuthModal.vue'
import { useUserAuth } from '@/composables/useUserAuth'

const route = useRoute()

const isAdmin = computed(() => route.path.startsWith('/admin') && route.meta.layout !== 'layout-login')
const isLogin = computed(() => route.meta.layout === 'layout-login')

// 前台访客登录态：应用启动时通过 me 接口探测（cookie 维持，14 天）
const { refresh } = useUserAuth()
refresh()

/**
 * 原型把布局差异写在 <body> 上（首页/关于我/小记是 flex 列，数字生命是满屏不滚动）。
 * SPA 里统一落到 #app + <html>，逐页还原。
 */
watch(
  () => route.meta.layout,
  (layout) => {
    const app = document.getElementById('app')
    if (!app) return
    if (layout === 'layout-admin' || layout === 'layout-login') {
      app.className = ''
      document.documentElement.classList.remove('layout-fixed')
    } else {
      app.className = layout || 'layout-flow'
      document.documentElement.classList.toggle('layout-fixed', layout === 'layout-fixed')
    }
  },
  { immediate: true },
)
</script>

<template>
  <!-- 登录页：独立全屏布局，不套 Admin 外壳 -->
  <RouterView v-if="isLogin" v-slot="{ Component }">
    <component :is="Component" />
  </RouterView>

  <!-- Admin 路由：使用 Admin 布局外壳 -->
  <AdminShell v-else-if="isAdmin">
    <RouterView v-slot="{ Component }">
      <component :is="Component" />
    </RouterView>
  </AdminShell>

  <!-- 公共页面：普通 RouterView -->
  <RouterView v-else v-slot="{ Component }">
    <component :is="Component" />
  </RouterView>

  <!-- 全局登录弹窗（数字生命 / 评论区共用） -->
  <AuthModal />
</template>
