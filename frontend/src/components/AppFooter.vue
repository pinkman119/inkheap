<script setup>
defineProps({
  /** 上下内边距：首页/关于我/小记 28px，文章详情/简历 36px，知识库列表 40px */
  paddingY: { type: String, default: '28px' },
  /** 简历页原型的页脚有 64px 上外边距 */
  marginTop: { type: String, default: '0' },
})
</script>

<template>
  <footer class="footer" :style="{ '--footer-py': paddingY, '--footer-mt': marginTop }">
    <p><slot>© 2024 墨堆 · 以设计记录思考</slot></p>
  </footer>
</template>

<style scoped>
.footer {
  border-top: 1px solid var(--border-light);
  padding: var(--footer-py, 28px) 24px;
  margin-top: var(--footer-mt, 0);
  text-align: center;
}

.footer p {
  font-size: 13px;
  color: var(--text-tertiary);
}

@media print {
  .footer {
    display: none !important;
  }
}
</style>
