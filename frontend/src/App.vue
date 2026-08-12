<script setup>
import { watch, computed } from 'vue'
import { useRoute } from 'vue-router'
import AdminShell from '@/layouts/AdminShell.vue'

const route = useRoute()

const isAdmin = computed(() => route.path.startsWith('/admin'))

/**
 * 原型把布局差异写在 <body> 上（首页/关于我/小记是 flex 列，数字生命是满屏不滚动）。
 * SPA 里统一落到 #app + <html>，逐页还原。
 */
watch(
  () => route.meta.layout,
  (layout) => {
    const app = document.getElementById('app')
    if (!app) return
    if (layout === 'layout-admin') {
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
  <!-- Admin 路由：使用 Admin 布局外壳 -->
  <AdminShell v-if="isAdmin">
    <RouterView v-slot="{ Component }">
      <component :is="Component" />
    </RouterView>
  </AdminShell>

  <!-- 公共页面：普通 RouterView -->
  <RouterView v-else v-slot="{ Component }">
    <component :is="Component" />
  </RouterView>
</template>
