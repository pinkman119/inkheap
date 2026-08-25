<script setup>
import { computed } from 'vue'
import { useMode } from '../composables/useMode'
import logoUrl from '../assets/logo.png'

const { isWork } = useMode()

const props = defineProps({
  /** 上下内边距（原型：64px 上 / 32px 下） */
  paddingY: { type: String, default: '64px 32px' },
  /** 上外边距：默认 auto 让页脚贴底；简历页原型需 64px */
  marginTop: { type: String, default: 'auto' },
  /** 站点名称 */
  brand: { type: String, default: '墨堆' },
  /** 一句站点 slogan */
  slogan: { type: String, default: '以设计记录思考' },
  /** 站内导航链接（默认按模式动态计算） */
  links: { type: Array, default: null },
  /** 友链（外链），留空则不展示该列 */
  friendLinks: {
    type: Array,
    default: () => [
      { label: '源码', href: 'https://github.com/pinkman119/inkheap.git' },
    ],
  },
  /** 社交 / 联系方式：icon 支持 github / mail / doc */
  socials: {
    type: Array,
    default: () => [
      { label: 'GitHub', href: 'https://github.com', icon: 'github' },
      { label: '邮箱', href: 'mailto:hi@modui.design', icon: 'mail' },
      { label: '语雀', href: 'https://www.yuque.com', icon: 'doc' },
    ],
  },
  /** 版权声明（可传字符串数组，每项一行），留空则不展示 */
  license: {
    type: [Array, String],
    default: () => [
      '项目代码：MIT Commons Clause（开源 · 非商用）',
      '项目知识库：CC BY-NC 4.0（署名 · 非商用）',
    ],
  },
  /** 备案号，留空则不展示 */
  icp: { type: String, default: '苏ICP备2024125779号' },
  /** 版权起始年份，默认 2024 */
  since: { type: [String, Number], default: 2024 },
})

// 导航链接：全模式显示「联系我」；工作模式额外显示 关于我 / 小记；生活模式额外显示 知识库 / 简历
const navLinks = computed(() => {
  if (props.links && props.links.length) return props.links
  const base = [{ label: '联系我', to: '/contact' }]
  const modeLinks = isWork.value
    ? [
        { label: '关于我', to: '/about' },
        { label: '小记', to: '/xiaoji' },
      ]
    : [
        { label: '知识库', to: '/articles' },
        { label: '简历', to: '/resume' },
      ]
  return [...modeLinks, ...base]
})

const year = new Date().getFullYear()
const copyright = computed(() =>
  props.since && Number(props.since) < year
    ? `© ${props.since}–${year}`
    : `© ${year}`,
)
const licenseItems = computed(() =>
  Array.isArray(props.license) ? props.license : props.license ? [props.license] : [],
)

function scrollTop() {
  window.scrollTo({ top: 0, behavior: 'smooth' })
}
</script>

<template>
  <footer class="site-footer" :style="{ '--footer-py': paddingY, '--footer-mt': marginTop }">
    <!-- 回到顶部：悬浮于页脚上边缘居中 -->
    <button class="footer-top" type="button" aria-label="回到顶部" @click="scrollTop">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <line x1="12" y1="19" x2="12" y2="5" />
        <polyline points="5 12 12 5 19 12" />
      </svg>
    </button>

    <div class="site-footer__inner">
      <!-- 顶部行：品牌 + 圆形图标栏 -->
      <div class="footer-row">
        <div class="footer-brand">
          <RouterLink to="/" class="footer-brand__logo" aria-label="墨堆">
            <img :src="logoUrl" alt="墨堆" />
          </RouterLink>
          <div class="footer-brand__text">
            <span class="footer-brand__name">{{ brand }}</span>
            <span class="footer-brand__tag">{{ slogan }}</span>
          </div>
        </div>

        <div class="footer-icons">
          <a
            v-for="s in socials"
            :key="s.label"
            class="footer-icon"
            :href="s.href"
            :aria-label="s.label"
            :title="s.label"
            target="_blank"
            rel="noopener noreferrer"
          >
            <!-- GitHub -->
            <svg v-if="s.icon === 'github'" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M12 .5C5.7.5.5 5.7.5 12c0 5.1 3.3 9.4 7.9 10.9.6.1.8-.2.8-.5v-1.8c-3.2.7-3.9-1.5-3.9-1.5-.5-1.3-1.3-1.7-1.3-1.7-1.1-.7.1-.7.1-.7 1.2.1 1.8 1.2 1.8 1.2 1 1.8 2.7 1.3 3.4 1 .1-.8.4-1.3.7-1.6-2.6-.3-5.3-1.3-5.3-5.8 0-1.3.5-2.3 1.2-3.1-.1-.3-.5-1.5.1-3.1 0 0 1-.3 3.3 1.2a11.5 11.5 0 0 1 6 0C17.3 4.7 18.3 5 18.3 5c.6 1.6.2 2.8.1 3.1.8.8 1.2 1.8 1.2 3.1 0 4.5-2.7 5.5-5.3 5.8.4.4.8 1.1.8 2.2v3.3c0 .3.2.6.8.5 4.6-1.5 7.9-5.8 7.9-10.9C23.5 5.7 18.3.5 12 .5z" />
            </svg>
            <!-- 邮箱 -->
            <svg v-else-if="s.icon === 'mail'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path d="M22 6l-10 7L2 6" />
              <rect x="2" y="4" width="20" height="16" rx="2" />
            </svg>
            <!-- 语雀（默认） -->
            <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
              <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
            </svg>
          </a>
        </div>
      </div>

      <!-- 两列导航 -->
      <div class="footer-nav">
        <div class="footer-nav__col">
          <h4>导航</h4>
          <div class="footer-links">
            <RouterLink v-for="link in navLinks" :key="link.to" class="footer-link" :to="link.to">{{ link.label }}</RouterLink>
          </div>
        </div>
        <div v-if="friendLinks.length" class="footer-nav__col">
          <h4>扩展</h4>
          <div class="footer-links">
            <a
              v-for="f in friendLinks"
              :key="f.href"
              class="footer-link"
              :href="f.href"
              target="_blank"
              rel="noopener noreferrer"
            >{{ f.label }}</a>
          </div>
        </div>
      </div>

      <!-- 底部版权行 -->
      <div class="footer-bottom">
        <div class="footer-meta">
          <span v-if="licenseItems.length">{{ licenseItems.join(' · ') }}</span>
          <span><slot>{{ copyright }} {{ brand }}</slot></span>
          <a
            v-if="icp"
            class="footer-beian"
            href="https://beian.miit.gov.cn"
            target="_blank"
            rel="noopener noreferrer"
          >{{ icp }}</a>
        </div>
      </div>
    </div>
  </footer>
</template>

<style scoped>
.site-footer {
  position: relative;
  border-top: 1px solid var(--border-light);
  background-color: var(--bg-soft);
  margin-top: var(--footer-mt, auto);
  padding: var(--footer-py, 64px 32px) 24px;
  color: var(--text-secondary);
  font-size: 14px;
}

.site-footer__inner {
  max-width: 1100px;
  margin: 0 auto;
}

/* 回到顶部 */
.footer-top {
  position: absolute;
  top: 0;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 46px;
  height: 46px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: var(--accent);
  color: #fff;
  border: 4px solid var(--bg-soft);
  cursor: pointer;
  box-shadow: var(--shadow-md);
  z-index: 5;
  transition: all var(--transition);
}

.footer-top:hover {
  background-color: var(--accent-hover);
  transform: translate(-50%, -50%) translateY(-3px);
  box-shadow: var(--shadow-lg);
}

.footer-top svg {
  width: 20px;
  height: 20px;
}

/* 顶部行：品牌 + 圆形图标栏 */
.footer-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 24px;
  flex-wrap: wrap;
  margin-bottom: 36px;
}

.footer-brand {
  display: flex;
  align-items: center;
  gap: 12px;
}

.footer-brand__logo {
  width: 34px;
  height: 34px;
  flex-shrink: 0;
  display: block;
}

.footer-brand__logo svg,
.footer-brand__logo img {
  width: 100%;
  height: 100%;
  display: block;
  object-fit: contain;
}

.footer-brand__text {
  display: flex;
  flex-direction: column;
  line-height: 1.5;
}

.footer-brand__name {
  font-family: var(--font-serif);
  font-size: 18px;
  font-weight: 700;
  color: var(--text-primary);
  letter-spacing: 0.04em;
}

.footer-brand__tag {
  font-size: 12.5px;
  color: var(--text-tertiary);
}

.footer-icons {
  display: flex;
  gap: 12px;
}

.footer-icon {
  width: 42px;
  height: 42px;
  border-radius: 50%;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background-color: var(--bg-card);
  border: 1px solid var(--border);
  color: var(--text-secondary);
  text-decoration: none;
  transition: all var(--transition);
}

.footer-icon:hover {
  color: var(--accent);
  border-color: var(--accent);
  background-color: var(--accent-light);
  transform: translateY(-2px);
  box-shadow: var(--shadow-sm);
}

.footer-icon svg {
  width: 19px;
  height: 19px;
}

/* 导航（两列） */
.footer-nav {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 28px 40px;
  margin-bottom: 34px;
}

.footer-nav__col h4 {
  font-size: 13px;
  font-weight: 600;
  letter-spacing: 0.08em;
  color: var(--text-primary);
  margin-bottom: 14px;
}

.footer-links {
  display: flex;
  flex-wrap: wrap;
  gap: 6px 18px;
  align-items: center;
}

.footer-link {
  font-size: 13px;
  color: var(--text-secondary);
  text-decoration: none;
  transition: color var(--transition);
}

.footer-link:hover {
  color: var(--accent);
  text-decoration: underline;
}

/* 底部版权行 */
.footer-bottom {
  display: flex;
  align-items: center;
  justify-content: center;
  padding-top: 22px;
  border-top: 1px solid var(--border-light);
}

.footer-meta {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 18px;
  font-size: 12.5px;
  color: var(--text-tertiary);
  flex-wrap: wrap;
}

.footer-beian {
  color: var(--text-tertiary);
  text-decoration: none;
  transition: color var(--transition);
}

.footer-beian:hover {
  color: var(--accent);
}

@media (max-width: 768px) {
  .site-footer {
    padding: 56px 18px 28px;
  }

  .footer-nav {
    grid-template-columns: 1fr;
    gap: 24px;
  }
}

@media print {
  .site-footer {
    display: none !important;
  }
}
</style>
