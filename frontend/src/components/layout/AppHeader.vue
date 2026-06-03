<template>
  <header class="app-header">
    <div class="app-header__left">
      <h2>{{ pageTitle }}</h2>
      <p>{{ pageSubtitle }}</p>
    </div>

    <div class="app-header__right">
      <div class="search">
        <span class="search__icon">⌕</span>
        <input
          v-model="keyword"
          type="search"
          placeholder="在文章、日记或简历中检索..."
          @keydown.enter.prevent="handleSearch"
        />
        <button
          v-if="keyword"
          type="button"
          class="search__clear"
          @click="handleClear"
          aria-label="清除检索"
        >
          ×
        </button>
        <button
          type="button"
          class="search__submit"
          :disabled="!keyword.trim()"
          @click="handleSearch"
        >
          检索
        </button>
      </div>
      <div class="account">
        <div class="account__avatar">{{ initials }}</div>
        <div class="account__meta">
          <span class="account__name">{{ displayName }}</span>
          <span class="account__role">{{ primaryRole }}</span>
        </div>
        <button class="account__logout" type="button" @click="handleLogout">
          退出
        </button>
      </div>
    </div>
  </header>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useRoute, useRouter, type LocationQueryRaw } from 'vue-router';
import { storeToRefs } from 'pinia';
import { useAuthStore } from '@/stores/auth';
import { useDiarySearchStore } from '@/stores/diarySearch';
import { logout as requestLogout } from '@/services/authService';

const keyword = ref('');
const route = useRoute();
const router = useRouter();
const authStore = useAuthStore();
const diarySearchStore = useDiarySearchStore();
const { keyword: activeKeyword } = storeToRefs(diarySearchStore);

const pageTitle = computed(() => route.meta.title ?? 'PersonaFlow');
const pageSubtitle = computed(() => {
  switch (route.name) {
    case 'articles':
      return '编排内容结构、分发文章与归档分类';
    case 'diary':
      return '以日历视角回顾情绪、计划与成长轨迹';
    case 'profile':
      return '保持个人档案常新，让履历随时可用';
    default:
      return '跨越文章、日记、简历的一体化信息中心';
  }
});

const displayName = computed(() => authStore.username ?? '未登录用户');
const initials = computed(() => (displayName.value ? displayName.value.slice(0, 1).toUpperCase() : 'U'));
const primaryRole = computed(() => authStore.roles[0] ?? '访客');

const syncKeywordFromRoute = () => {
  if (route.name !== 'diary') {
    diarySearchStore.clear();
    keyword.value = '';
    return;
  }

  const routeKeyword = typeof route.query.search === 'string' ? route.query.search : '';
  if (routeKeyword) {
    keyword.value = routeKeyword;
    diarySearchStore.setKeyword(routeKeyword);
  } else {
    keyword.value = activeKeyword.value;
  }
};

const updateDiaryQuery = async (searchValue: string) => {
  if (route.name !== 'diary') {
    return;
  }

  const nextQuery: LocationQueryRaw = { ...route.query };
  if (searchValue) {
    nextQuery.search = searchValue;
  } else {
    delete nextQuery.search;
  }

  await router.replace({ name: 'diary', query: nextQuery }).catch(() => {
    /* noop */
  });
};

const handleSearch = async () => {
  const trimmed = keyword.value.trim();

  if (!trimmed) {
    diarySearchStore.clear();
    keyword.value = '';
    await updateDiaryQuery('');
    return;
  }

  if (route.name !== 'diary') {
    await router.push({ name: 'diary', query: { search: trimmed } }).catch(() => {
      /* noop */
    });
    return;
  }

  await diarySearchStore.search(trimmed);
  keyword.value = trimmed;
  await updateDiaryQuery(trimmed);
};

const handleClear = async () => {
  diarySearchStore.clear();
  keyword.value = '';
  await updateDiaryQuery('');
};

watch(
  () => route.fullPath,
  () => {
    syncKeywordFromRoute();
  },
  { immediate: true }
);

watch(activeKeyword, (value) => {
  if (route.name !== 'diary') {
    return;
  }
  if (value !== keyword.value) {
    keyword.value = value;
  }
});

const handleLogout = async () => {
  try {
    await requestLogout();
  } catch (error) {
    console.warn('[logout] failed to notify server', error);
  } finally {
    authStore.signOut();
    router.replace({ name: 'login', query: { redirect: route.fullPath } }).catch(() => {
      /* noop */
    });
  }
};
</script>

<style scoped>
.app-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1.5rem;
}

.app-header__left h2 {
  margin: 0;
  font-size: 1.65rem;
  letter-spacing: -0.02em;
}

.app-header__left p {
  margin: 0.4rem 0 0;
  color: var(--text-secondary);
}

.app-header__right {
  display: flex;
  align-items: center;
  gap: 1.25rem;
}

.search {
  display: flex;
  align-items: center;
  gap: 0.45rem;
  background: var(--surface-card);
  border-radius: 999px;
  padding: 0.6rem 0.6rem 0.6rem 1rem;
  box-shadow: 0 18px 36px rgba(51, 68, 140, 0.08);
  transition: box-shadow 180ms ease;
}

.search:focus-within {
  box-shadow: 0 24px 48px rgba(51, 68, 140, 0.14);
}

.search__icon {
  font-size: 1rem;
  opacity: 0.55;
}

.search input {
  border: none;
  outline: none;
  background: transparent;
  font-size: 0.95rem;
  color: inherit;
  min-width: 16rem;
}

.search__clear,
.search__submit {
  border: none;
  cursor: pointer;
  transition: transform 160ms ease, box-shadow 160ms ease, opacity 160ms ease;
}

.search__clear {
  width: 1.75rem;
  height: 1.75rem;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.35);
  color: rgba(59, 63, 102, 0.75);
  font-size: 0.85rem;
  font-weight: 600;
}

.search__clear:hover {
  background: rgba(59, 63, 102, 0.1);
}

.search__submit {
  background: linear-gradient(135deg, #4c5df0, #7a6bff);
  color: #fff;
  padding: 0.45rem 1.1rem;
  border-radius: 0.85rem;
  font-weight: 600;
  box-shadow: 0 14px 28px rgba(74, 94, 242, 0.24);
}

.search__submit:hover {
  transform: translateY(-1px);
  box-shadow: 0 20px 38px rgba(74, 94, 242, 0.34);
}

.search__submit:disabled {
  opacity: 0.45;
  cursor: not-allowed;
  transform: none;
  box-shadow: none;
}

.account {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.35rem 0.65rem;
  border-radius: 999px;
  background: var(--surface-card);
  box-shadow: 0 12px 24px rgba(31, 35, 68, 0.12);
}

.account__avatar {
  width: 2rem;
  height: 2rem;
  border-radius: 50%;
  background: linear-gradient(135deg, #4c5df0, #7a6bff);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  letter-spacing: 0.05em;
}

.account__meta {
  display: flex;
  flex-direction: column;
  line-height: 1.1;
}

.account__name {
  font-weight: 600;
}

.account__role {
  font-size: 0.75rem;
  color: var(--text-secondary);
}

.account__logout {
  border: none;
  background: rgba(76, 93, 240, 0.12);
  color: #4653d8;
  border-radius: 999px;
  padding: 0.45rem 0.85rem;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s ease;
}

.account__logout:hover {
  background: rgba(76, 93, 240, 0.22);
}

@media (max-width: 768px) {
  .app-header {
    flex-direction: column;
    align-items: flex-start;
  }

  .app-header__right {
    width: 100%;
    justify-content: space-between;
  }

  .search {
    flex: 1;
    padding-right: 0.75rem;
  }

  .search input {
    min-width: 0;
  }
}
</style>
