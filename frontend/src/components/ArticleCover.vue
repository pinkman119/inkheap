<script setup>
import { computed, ref } from 'vue'
import { useApi } from '@/composables/useApi'

const props = defineProps({
  // 文章标题（用于无封面时的文字占位封面）
  title: { type: String, default: '' },
  // 封面图地址（后端相对路径或外链），为空时回退至文字封面
  coverImage: { type: String, default: '' },
  // 宽高比：列表卡片常用 '4/3'，详情页常用 '16/9'
  ratio: { type: String, default: '4/3' },
  // 图片加载失败时是否回退到文字封面（默认 true，保证总有一个封面）
  fallbackOnError: { type: Boolean, default: true },
  // 文字封面最多显示行数（列表卡片空间小用 3，详情页大图用更大值以减少省略）
  maxLines: { type: Number, default: 3 },
})

const api = useApi()
const imgFailed = ref(false)

// 是否展示真实图片：有封面地址且未加载失败
const showImage = computed(
  () => !!props.coverImage && !(props.fallbackOnError && imgFailed.value),
)

// 补全资源路径（兼容后端相对路径）
const resolvedSrc = computed(() =>
  props.coverImage ? api.assetUrl(props.coverImage) : '',
)

// 标题最多保留 50 字（超出截断并省略）
const displayTitle = computed(() => {
  const t = (props.title || '').trim()
  return t.length > 50 ? t.slice(0, 50) + '…' : t
})

// 依据标题长度自适应字号，兼容最长 50 字而不溢出。
// 越短字号越大（更有设计感），越长字号越小（保证可读、不溢出）。
// 宽幅封面（如详情页 16/9）整体放大字号，让标题分多行显示、尽量不省略。
const wideScale = computed(() => (props.ratio.includes('16/9') ? 2.1 : 1))
const titleFontSize = computed(() => {
  const len = displayTitle.value.length
  if (len === 0) return '0px'
  let base
  if (len <= 6) base = 40
  else if (len <= 12) base = 32
  else if (len <= 20) base = 26
  else if (len <= 35) base = 21
  else base = 18
  return Math.round(base * wideScale.value) + 'px'
})

function onImgError() {
  if (props.fallbackOnError) imgFailed.value = true
}
</script>

<template>
  <div class="article-cover" :style="{ aspectRatio: ratio }">
    <!-- 有封面：展示图片 -->
    <img
      v-if="showImage"
      :src="resolvedSrc"
      :alt="displayTitle"
      class="cover-img"
      loading="lazy"
      @error="onImgError"
    />

    <!-- 无封面（或图片加载失败）：绿色渐变背景 + 标题文字 -->
    <div v-else class="cover-fallback">
      <span
        class="cover-fallback__title"
        :style="{ fontSize: titleFontSize, WebkitLineClamp: maxLines, lineClamp: maxLines }"
      >
        {{ displayTitle || '墨堆' }}
      </span>
    </div>
  </div>
</template>

<style scoped>
.article-cover {
  position: relative;
  width: 100%;
  overflow: hidden;
  background-color: var(--bg-card);
}

.cover-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

/* ===== 绿色质感渐变 + 标题文字封面 ===== */
.cover-fallback {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 8% 9%;
  box-sizing: border-box;
  /* 主色：页面主体绿（accent -> accent-hover）对角渐变 */
  background-color: var(--accent);
  background-image:
    radial-gradient(
      120% 120% at 18% 12%,
      rgba(255, 255, 255, 0.28) 0%,
      rgba(255, 255, 255, 0) 42%
    ),
    radial-gradient(
      130% 130% at 85% 100%,
      rgba(0, 0, 0, 0.22) 0%,
      rgba(0, 0, 0, 0) 50%
    ),
    linear-gradient(135deg, var(--accent) 0%, var(--accent-hover) 100%);
  background-blend-mode: screen, multiply, normal;
}

.cover-fallback__title {
  color: #fff;
  font-family: var(--font-serif);
  font-weight: 700;
  line-height: 1.3;
  letter-spacing: 0.01em;
  text-align: center;
  word-break: break-word;
  overflow-wrap: anywhere;
  /* 多行显示，超出 maxLines 才省略，避免标题被过早截断 */
  display: -webkit-box;
  -webkit-box-orient: vertical;
  overflow: hidden;
  text-shadow: 0 2px 10px rgba(0, 0, 0, 0.22);
}
</style>
