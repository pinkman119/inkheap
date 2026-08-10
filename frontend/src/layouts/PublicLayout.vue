<template>
  <div class="public-layout">
    <PublicHeader />
    <main class="public-layout__content">
      <slot />
    </main>
    <PublicFooter />
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue';
import PublicHeader from '../components/public/PublicHeader.vue';
import PublicFooter from '../components/public/PublicFooter.vue';

// 静态加载前台样式，避免动态加载导致的布局跳动
import '../styles/public.css';

onMounted(() => {
  // 确保样式表已加载
  if (!document.querySelector('link[href*="public.css"]')) {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = new URL('/src/styles/public.css', import.meta.url).href;
    document.head.appendChild(link);
  }
});
</script>

<style scoped>
.public-layout {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background: var(--public-bg);
  color: var(--public-text);
}

.public-layout__content {
  flex: 1;
  width: 100%;
  padding: 2rem 0;
}
</style>