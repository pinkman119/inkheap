<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import AppHeader from '@/components/AppHeader.vue'
import AppFooter from '@/components/AppFooter.vue'
import ResumeContent from '@/components/resume/ResumeContent.vue'
import { useApi } from '@/composables/useApi'
import { takePreloaded } from '@/composables/usePreload'
import { defaultResumeContent } from '@/data/resume'

const { get } = useApi()

/* ===== 简历数据（接口优先，失败降级默认数据） ===== */
const resume = ref(defaultResumeContent)
const loadFailed = ref(false)

onMounted(async () => {
  try {
    const data = takePreloaded('resume') || (await get('/public/resume'))
    if (data?.content && typeof data.content === 'object') {
      resume.value = data.content
    }
  } catch {
    loadFailed.value = true
  }
  window.addEventListener('scroll', onScroll, { passive: true })
})

onBeforeUnmount(() => {
  window.removeEventListener('scroll', onScroll)
})

/* ===== Reading progress ===== */
const progressRatio = ref(0)
const progressWidth = computed(() => progressRatio.value * 100 + '%')
const progressValue = computed(() => Math.round(progressRatio.value * 100))

function onScroll() {
  const h = document.documentElement
  const scrollable = h.scrollHeight - h.clientHeight
  progressRatio.value = scrollable > 0 ? h.scrollTop / scrollable : 0
}
</script>

<template>
  <div
    class="progress"
    role="progressbar"
    aria-label="阅读进度"
    aria-valuemin="0"
    aria-valuemax="100"
    :aria-valuenow="progressValue"
    :style="{ width: progressWidth }"
  />

  <AppHeader active-key="" narrow />

  <div v-if="loadFailed" class="load-tip">简历数据加载失败，当前展示默认内容。</div>

  <ResumeContent :content="resume" />

  <AppFooter margin-top="64px" />
</template>

<style scoped>
.progress {
  position: fixed;
  top: 0;
  left: 0;
  height: 2px;
  width: 0%;
  background-color: var(--accent);
  z-index: 200;
  transition: width 0.1s linear;
}

.load-tip {
  max-width: 1120px;
  margin: 24px auto 0;
  padding: 10px 18px;
  font-size: 13.5px;
  color: var(--accent-hover);
  background-color: var(--accent-light);
  border-radius: var(--radius-sm);
}
</style>
