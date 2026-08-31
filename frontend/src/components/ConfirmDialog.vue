<script setup>
/**
 * 通用确认弹窗卡片（样式取自事件日历的删除确认）。
 * 用来替换各页面里的原生 window.confirm。
 *
 * 用法：
 *   <ConfirmDialog :open="open" title="删除事件" @cancel="..." @confirm="...">
 *     确定要删除 <strong>xxx</strong> 吗？
 *   </ConfirmDialog>
 */
defineProps({
  open: { type: Boolean, default: false },
  title: { type: String, default: '确认操作' },
  /** 橙色警示补充文字，不需要则不传 */
  warn: { type: String, default: '' },
  confirmLabel: { type: String, default: '确定' },
  cancelLabel: { type: String, default: '取消' },
  /** 请求进行中：按钮禁用并显示「处理中…」 */
  loading: { type: Boolean, default: false },
  /** true = 红色危险按钮；false = 主色按钮 */
  danger: { type: Boolean, default: true },
})

const emit = defineEmits(['confirm', 'cancel'])
</script>

<template>
  <transition name="confirm-fade">
    <div v-if="open" class="confirm-mask" @click.self="emit('cancel')">
      <div class="confirm-card" role="dialog" aria-modal="true" :aria-label="title">
        <div class="confirm-icon">!</div>
        <h3>{{ title }}</h3>
        <p class="confirm-text"><slot /></p>
        <p v-if="warn" class="confirm-warn">{{ warn }}</p>
        <div class="confirm-actions">
          <button class="btn btn--ghost" type="button" :disabled="loading" @click="emit('cancel')">
            {{ cancelLabel }}
          </button>
          <button
            class="btn"
            :class="danger ? 'btn--danger' : 'btn--primary'"
            type="button"
            :disabled="loading"
            @click="emit('confirm')"
          >
            {{ loading ? '处理中…' : confirmLabel }}
          </button>
        </div>
      </div>
    </div>
  </transition>
</template>

<style scoped>
.confirm-mask {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(4px);
  z-index: 1200;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
}

.confirm-card {
  width: 100%;
  max-width: 380px;
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-lg);
  padding: 26px 24px;
  text-align: center;
}
.confirm-icon {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  background: #fdf1ef;
  color: #e0533d;
  font-size: 24px;
  font-weight: 700;
  line-height: 44px;
  margin: 0 auto 12px;
}
.confirm-card h3 { margin: 0 0 10px; font-size: 18px; }
.confirm-text {
  color: var(--text-secondary);
  font-size: 14px;
  margin: 0 0 18px;
  line-height: 1.6;
}
.confirm-text :deep(strong) { color: var(--text-primary); font-weight: 600; }
.confirm-warn {
  color: #e6a23c;
  font-size: 13px;
  margin: -8px 0 18px;
  line-height: 1.6;
}
.confirm-actions { display: flex; justify-content: center; gap: 10px; }

/* ===== Buttons ===== */
.btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-family: var(--font-sans);
  font-size: 14px;
  font-weight: 500;
  padding: 10px 18px;
  border-radius: 10px;
  cursor: pointer;
  border: 1px solid transparent;
  transition: all var(--transition);
  white-space: nowrap;
}
.btn:focus-visible { outline: 2px solid var(--accent); outline-offset: 3px; }
.btn--ghost {
  background: transparent;
  color: var(--text-secondary);
  border-color: var(--border);
  padding: 8px 14px;
  font-size: 13px;
}
.btn--ghost:hover:not(:disabled) {
  border-color: var(--accent);
  color: var(--accent);
  background-color: var(--accent-light);
}
.btn--ghost:disabled { opacity: 0.5; cursor: not-allowed; }
.btn--danger {
  background-color: #e0533d;
  color: #fff;
  border-color: #e0533d;
  padding: 8px 14px;
  font-size: 13px;
}
.btn--danger:hover:not(:disabled) { background-color: #c9442f; border-color: #c9442f; }
.btn--danger:disabled { opacity: 0.6; cursor: not-allowed; }
.btn--primary {
  background-color: var(--accent);
  color: #fff;
  border-color: var(--accent);
  padding: 8px 14px;
  font-size: 13px;
}
.btn--primary:hover:not(:disabled) { background-color: var(--accent-hover); border-color: var(--accent-hover); }
.btn--primary:disabled { opacity: 0.6; cursor: not-allowed; }

.confirm-fade-enter-active,
.confirm-fade-leave-active { transition: opacity 0.2s; }
.confirm-fade-enter-from,
.confirm-fade-leave-to { opacity: 0; }
.confirm-fade-enter-active .confirm-card { transition: transform 0.2s ease; }
.confirm-fade-enter-from .confirm-card { transform: translateY(-8px) scale(0.98); }
</style>
