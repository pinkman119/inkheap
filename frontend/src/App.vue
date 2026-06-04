<template>
  <RouterView v-if="isAuthLayout" />
  <div v-else class="app-shell">
    <aside class="app-shell__sidebar">
      <div class="brand">
        <span class="brand__dot" />
        <div>
          <h1>PersonaFlow</h1>
          <p>Personal knowledge & story hub</p>
        </div>
      </div>
      <nav>
        <RouterLink
          v-for="link in links"
          :key="link.to"
          :to="link.to"
          class="nav-link"
          active-class="nav-link--active"
        >
          <span class="nav-link__icon">{{ link.icon }}</span>
          <span>{{ link.label }}</span>
        </RouterLink>
      </nav>
    </aside>

    <main class="app-shell__main">
      <AppHeader />
      <section class="app-shell__content">
        <RouterView />
      </section>
    </main>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useRoute } from 'vue-router';

import AppHeader from './components/layout/AppHeader.vue';

const route = useRoute();

const links = computed(() => [
  { to: '/', label: '总览', icon: '⌘' },
  { to: '/articles', label: '文章管理', icon: '✎' },
  { to: '/diary', label: '日记日历', icon: '☀︎' },
  { to: '/profile', label: '个人档案', icon: '✶' }
]);

const isAuthLayout = computed(() => route.meta.layout === 'auth');
</script>

<style scoped>
.app-shell {
  display: grid;
  grid-template-columns: 16rem 1fr;
  min-height: 100vh;
  height: 100vh;
  background: var(--surface-backdrop);
  overflow: hidden;
}

.app-shell__sidebar {
  background: var(--surface-sidebar);
  color: var(--text-on-sidebar);
  padding: 2.5rem 1.75rem;
  display: flex;
  flex-direction: column;
  gap: 2.5rem;
  border-right: 1px solid rgba(255, 255, 255, 0.08);
  position: sticky;
  top: 0;
  height: 100vh;
  align-self: start;
}

.brand {
  display: flex;
  align-items: center;
  gap: 0.9rem;
  font-family: 'Space Grotesk', sans-serif;
}

.brand h1 {
  font-size: 1.35rem;
  letter-spacing: 0.05em;
  margin: 0;
}

.brand p {
  margin: 0;
  font-size: 0.75rem;
  opacity: 0.7;
}

.brand__dot {
  width: 1rem;
  height: 1rem;
  border-radius: 50%;
  background: linear-gradient(135deg, #ffd166, #ef476f 70%);
}

.nav-link {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.65rem 0.85rem;
  color: inherit;
  text-decoration: none;
  border-radius: 0.75rem;
  font-size: 0.95rem;
  transition: background 160ms ease, transform 160ms ease;
}

.nav-link__icon {
  font-size: 1rem;
  opacity: 0.7;
}

.nav-link:hover {
  transform: translateX(4px);
  background: rgba(255, 255, 255, 0.1);
}

.nav-link--active {
  background: rgba(255, 255, 255, 0.16);
  color: #fff;
}

.app-shell__main {
  display: flex;
  flex-direction: column;
  padding: 2.5rem 2.5rem 2rem;
  gap: 1.5rem;
  height: 100vh;
  overflow-y: auto;
  min-height: 0;
}

.app-shell__content {
  flex: 1;
  background: rgba(255, 255, 255, 0.18);
  border-radius: 1.75rem;
  padding: 2rem;
  backdrop-filter: blur(24px);
  box-shadow: 0 18px 45px rgba(20, 18, 38, 0.14);
  overflow: visible;
}

@media (max-width: 960px) {
  .app-shell {
    grid-template-columns: 1fr;
    height: auto;
    overflow: visible;
  }

  .app-shell__sidebar {
    flex-direction: row;
    align-items: center;
    justify-content: space-between;
    padding: 1.5rem 1.25rem;
    border-right: none;
    border-bottom: 1px solid rgba(255, 255, 255, 0.08);
    position: static;
    height: auto;
  }

  nav {
    display: flex;
    gap: 0.5rem;
  }

  .nav-link {
    padding: 0.5rem 0.75rem;
  }

  .app-shell__main {
    height: auto;
    overflow: visible;
  }

  .app-shell__content {
    overflow: visible;
  }
}
</style>
