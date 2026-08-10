<template>
  <component :is="layoutComponent">
    <RouterView />
  </component>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useRoute } from 'vue-router';
import PublicLayout from './layouts/PublicLayout.vue';
import AdminLayout from './layouts/AdminLayout.vue';

const route = useRoute();

const layoutComponent = computed(() => {
  const layout = route.meta.layout as string;

  switch (layout) {
    case 'public':
      return PublicLayout;
    case 'auth':
      // 登录页使用简化的 admin 布局
      return AdminLayout;
    case 'admin':
    default:
      return AdminLayout;
  }
});
</script>

<style>
/* 移除原有全局样式，样式由布局组件提供 */
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}
</style>