<template>
  <header class="public-header">
    <div class="container">
      <div class="public-header__inner">
        <RouterLink to="/" class="public-header__logo">
          <!-- <span class="logo-dot"></span> -->
          
          <span class="logo-text">墨堆</span>
        </RouterLink>
        <nav class="public-header__nav">
          <RouterLink to="/" class="nav-item" active-class="nav-item--active">首页</RouterLink>
          <RouterLink :to="isDarkMode ? '/notes' : '/docs'" class="nav-item" active-class="nav-item--active">{{ isDarkMode ? '小记' : '文档' }}</RouterLink>
          <RouterLink :to="isDarkMode ? '/life' : '/resume'" class="nav-item" active-class="nav-item--active">{{ isDarkMode ? '生活' : '简历' }}</RouterLink>
          <RouterLink :to="isDarkMode ? '/dark-stats' : '/stats'" class="nav-item" active-class="nav-item--active">{{ isDarkMode ? '蒸馏' : '蒸馏' }}</RouterLink>
          <button class="theme-toggle" @click="toggleTheme" :title="isDarkMode ? '切换到亮色模式' : '切换到暗色模式'">
            <svg v-if="isDarkMode" class="theme-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="5"></circle>
              <line x1="12" y1="1" x2="12" y2="3"></line>
              <line x1="12" y1="21" x2="12" y2="23"></line>
              <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>
              <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
              <line x1="1" y1="12" x2="3" y2="12"></line>
              <line x1="21" y1="12" x2="23" y2="12"></line>
              <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line>
              <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
            </svg>
            <svg v-else class="theme-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
            </svg>
          </button>
        </nav>
      </div>
    </div>
  </header>
</template>

<script setup lang="ts">
import { RouterLink } from 'vue-router';
import { ref, onMounted, watch } from 'vue';

const isDarkMode = ref(false);

const toggleTheme = () => {
  isDarkMode.value = !isDarkMode.value;
};

// 挂载时检查系统主题偏好
onMounted(() => {
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  isDarkMode.value = prefersDark;
});

// 监听 isDarkMode 变化，更新页面主题
watch(isDarkMode, (newValue) => {
  if (newValue) {
    document.body.classList.add('dark-mode');
  } else {
    document.body.classList.remove('dark-mode');
  }
}, { immediate: true });
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Ma+Shan+Zheng&family=ZCOOL+QingKe+HuangYou&family=ZCOOL+XiaoWei&display=swap');
.public-header {
  background: var(--public-surface);
  border-bottom: 1px solid var(--public-border);
  position: sticky;
  top: 0;
  z-index: 100;
  display: flex;
  align-items: center;
  height: 80px;
  width: 100%;
}


.public-header__inner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 60px;
  width: 100%;
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 var(--public-spacing-lg);
}

.public-header__logo {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  text-decoration: none;
  color: var(--public-text);
  font-size: 28px;
  font-family: 'Ma Shan Zheng', 'ZCOOL QingKe HuangYou', 'ZCOOL XiaoWei', serif;
  letter-spacing: 2px;
}

.logo-dot {
  width: 1rem;
  height: 1rem;
  border-radius: 50%;
  background: linear-gradient(135deg, #333333, #666666 70%);
}

.public-header__nav {
  display: flex;
  align-items: center;
  gap: 1.5rem;
  font-size: 20px;
  margin-left: auto;
}

.nav-item {
  color: var(--public-text);
  text-decoration: none;
  font-size: 16px;
  font-family: 'Ma Shan Zheng', 'ZCOOL QingKe HuangYou', 'ZCOOL XiaoWei', serif;
  transition: all 0.2s ease;
  padding: 0.5rem 1rem;
  border-radius: 9999px;
  letter-spacing: 1px;
  white-space: nowrap;
}

.nav-item:hover {
  background-color: #f4f4f5;
}

.nav-item--active {
  color: var(--public-text);
  background-color: #f4f4f5;
}

@media (max-width: 640px) {
  .public-header__nav {
    gap: 1rem;
  }

  .nav-item {
    font-size: var(--public-font-size-xs);
  }
}

/* 主题切换按钮 */
.theme-toggle {
  background: none;
  border: none;
  cursor: pointer;
  padding: 0.5rem;
  border-radius: 9999px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
  color: var(--public-text);
  white-space: nowrap;
}

.theme-toggle:hover {
  background-color: #f4f4f5;
}

.theme-icon {
  width: 20px;
  height: 20px;
}
</style>

<style>
/* 全局夜间模式样式 */
.dark-mode .public-header {
  background-color: #1c2128;
  border-bottom-color: var(--public-border);
}

.dark-mode .public-header__logo {
  color: var(--public-text);
}

.dark-mode .nav-item {
  color: var(--public-text-secondary);
}

.dark-mode .nav-item:hover {
  background-color: #444c56;
  color: var(--public-text);
}

.dark-mode .nav-item--active {
  color: var(--public-text);
  background-color: #444c56;
}

.dark-mode .theme-toggle {
  color: var(--public-text);
}

.dark-mode .theme-toggle:hover {
  background-color: #444c56;
}
</style>