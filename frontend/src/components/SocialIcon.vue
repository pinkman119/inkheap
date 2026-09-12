<script setup>
/**
 * 页脚社交图标渲染器。
 * 优先渲染自定义 SVG（后台录入，已由服务端清洗），否则渲染预设图标。
 */
import { computed } from 'vue'
import { getFooterIcon } from '@/utils/footer-icons'

const props = defineProps({
  /** 预设图标 key，如 github / mail / yuque */
  name: { type: String, default: '' },
  /** 自定义 SVG 源码（优先级高于 name） */
  svg: { type: String, default: '' },
})

const icon = computed(() => getFooterIcon(props.name))
const hasCustomSvg = computed(() => !!props.svg && /<svg[\s\S]*<\/svg>/i.test(props.svg))
</script>

<template>
  <!-- 自定义 SVG：后台录入的完整图标源码 -->
  <span v-if="hasCustomSvg" class="social-icon social-icon--custom" v-html="svg" />
  <!-- 预设图标 -->
  <svg
    v-else
    class="social-icon"
    :class="{ 'brand-icon': icon.brand, 'is-dark-invert': icon.darkInvert }"
    :viewBox="icon.viewBox"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
  >
    <path
      v-for="(p, i) in icon.paths"
      :key="i"
      :d="typeof p === 'string' ? p : p.d"
      :fill="typeof p === 'string' ? 'none' : p.fill || 'none'"
      :opacity="typeof p === 'string' ? undefined : p.opacity"
    />
  </svg>
</template>

<style scoped>
.social-icon {
  width: 100%;
  height: 100%;
  display: block;
  flex-shrink: 0;
}

/* 自定义 SVG：约束内部 svg 尺寸，与预设图标保持一致 */
.social-icon--custom :deep(svg) {
  width: 100%;
  height: 100%;
  display: block;
}

/* 深色主题下深色品牌图标（GitHub / X）会淹没在深色背景中，改为跟随文字色 */
[data-theme='dark'] .social-icon.brand-icon.is-dark-invert path {
  fill: currentColor;
}
</style>
