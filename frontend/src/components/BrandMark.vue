<script setup>
/**
 * 墨堆品牌印记：甲骨文风格「墨」字（上「黑」下「土」）。
 * 绿色圆角方块 + 白色线刻，浅色 / 夜间主题自动适配。
 * 尺寸由 CSS 变量 --mark-size 控制（默认 40px）：圆角 30%、字形 75%。
 */
</script>

<template>
  <span class="brand-mark" aria-hidden="true">
    <svg
      class="brand-glyph"
      viewBox="0 0 64 64"
      fill="none"
      stroke="currentColor"
      stroke-width="3.2"
      stroke-linecap="round"
      stroke-linejoin="round"
    >
      <!-- 上部：甲骨文「黑」——人形 + 面部墨刑刻痕 -->
      <path d="M32 5 L32 8" />
      <path d="M32 8 L39 15 L32 22 L25 15 Z" />
      <path d="M28 15 L36 15" />
      <path d="M32 22 L32 29" />
      <path d="M32 25 L21 33" />
      <path d="M32 25 L43 33" />
      <path d="M32 29 L23 42" />
      <path d="M32 29 L41 42" />
      <!-- 下部：甲骨文「土」——地面 + 土堆 -->
      <path d="M10 48 L54 48" />
      <path d="M32 48 L32 57" />
      <path d="M22 57 L42 57" />
    </svg>
  </span>
</template>

<style scoped>
/* 品牌方块：绿色渐变圆角印章，尺寸随 --mark-size 缩放 */
.brand-mark {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: var(--mark-size, 40px);
  height: var(--mark-size, 40px);
  flex-shrink: 0;
  border-radius: calc(var(--mark-size, 40px) * 0.3);
  /* 与 mode-toggle 滑块同源的绿色斜向渐变，保持主色一致 */
  background: linear-gradient(135deg, var(--accent), var(--accent-hover));
  /* 顶部高光 + 底部内阴影 + 柔和投影：轻微立体的"釉面"感 */
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.3),
    inset 0 -2px 3px rgba(0, 0, 0, 0.07),
    0 1px 0 rgba(0, 0, 0, 0.04),
    0 4px 10px rgba(45, 130, 100, 0.18);
  transition:
    transform var(--transition),
    box-shadow var(--transition),
    background var(--transition);
}

/* 甲骨文「墨」：白色线刻（currentColor），尺寸为方块的 75% */
.brand-glyph {
  width: calc(var(--mark-size, 40px) * 0.75);
  height: calc(var(--mark-size, 40px) * 0.75);
  flex-shrink: 0;
  color: #fff;
  user-select: none;
}

/* 夜间模式：背景加深，字面用亮绿纯色 */
[data-theme='dark'] .brand-mark {
  background: linear-gradient(135deg, #1f5a45, #143a2c);
  border: 1px solid rgba(95, 197, 154, 0.22);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.08),
    inset 0 -2px 4px rgba(0, 0, 0, 0.35),
    0 1px 0 rgba(0, 0, 0, 0.4),
    0 4px 12px rgba(0, 0, 0, 0.45);
}

[data-theme='dark'] .brand-glyph {
  color: #5fc59a;
}
</style>
