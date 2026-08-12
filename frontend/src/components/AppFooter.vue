<script setup>
import { computed } from 'vue'

const props = defineProps({
  /** 上下内边距：首页/关于我/小记 28px，文章详情/简历 36px，知识库列表 40px */
  paddingY: { type: String, default: '28px' },
  /** 简历页原型的页脚有 64px 上外边距 */
  marginTop: { type: String, default: '0' },
  /** 站点名称 */
  brand: { type: String, default: '墨堆' },
  /** 一句站点 slogan，留空则不展示 */
  slogan: { type: String, default: '以设计记录思考' },
  /** 导航链接 */
  links: {
    type: Array,
    default: () => [
      { label: '首页', to: '/' },
      { label: '知识库', to: '/articles' },
      { label: '简历', to: '/resume' },
      { label: '关于我', to: '/about' },
      { label: '小记', to: '/xiaoji' },
    ],
  },
  /** 社交 / 联系方式 */
  socials: {
    type: Array,
    default: () => [
      { label: '语雀', href: 'https://www.yuque.com', icon: 'doc' },
      { label: 'GitHub', href: 'https://github.com', icon: 'github' },
    ],
  },
  /** 备案号 / 出处信息，留空则不展示 */
  icp: { type: String, default: '' },
  /** 版权起始年份，默认 2024 */
  since: { type: [String, Number], default: 2024 },
})

const year = new Date().getFullYear()
const copyright = computed(() =>
  props.since && Number(props.since) < year
    ? `© ${props.since}–${year}`
    : `© ${year}`,
)

function scrollTop() {
  window.scrollTo({ top: 0, behavior: 'smooth' })
}
</script>

<template>
  <footer class="footer" :style="{ '--footer-py': paddingY, '--footer-mt': marginTop }">
    <div class="footer-inner">
      <!-- 上：三栏 -->
      <div class="footer-cols">
        <!-- 品牌 -->
        <div class="footer-brand">
          <div class="brand-row">
            <span class="brand-mark" aria-hidden="true">
              <svg viewBox="0 0 28 28" xmlns="http://www.w3.org/2000/svg">
                <rect width="28" height="28" rx="8" fill="var(--accent)" />
                <circle cx="14" cy="9" r="3.2" fill="#ffffff" />
                <rect x="7.5" y="14.5" width="13" height="2.8" rx="1.4" fill="#ffffff" />
                <rect x="7.5" y="19" width="13" height="2.8" rx="1.4" fill="#ffffff" />
              </svg>
            </span>
            <span class="brand-name">{{ brand }}</span>
          </div>
          <p v-if="slogan" class="brand-slogan">{{ slogan }}</p>
        </div>

        <!-- 导航 -->
        <nav class="footer-nav" aria-label="页脚导航">
          <h3 class="footer-title">导航</h3>
          <ul>
            <li v-for="link in links" :key="link.to">
              <RouterLink :to="link.to">{{ link.label }}</RouterLink>
            </li>
          </ul>
        </nav>

        <!-- 社交 -->
        <div class="footer-social">
          <h3 class="footer-title">关注</h3>
          <div class="social-row">
            <a
              v-for="s in socials"
              :key="s.label"
              class="social-link"
              :href="s.href"
              :title="s.label"
              target="_blank"
              rel="noopener noreferrer"
            >
              <svg
                v-if="s.icon === 'doc'"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="1.5"
                stroke-linecap="round"
                stroke-linejoin="round"
                aria-hidden="true"
              >
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="16" y1="13" x2="8" y2="13" />
                <line x1="16" y1="17" x2="8" y2="17" />
                <polyline points="10 9 9 9 8 9" />
              </svg>
              <svg
                v-else
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="1.5"
                stroke-linecap="round"
                stroke-linejoin="round"
                aria-hidden="true"
              >
                <path
                  d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"
                />
              </svg>
              <span>{{ s.label }}</span>
            </a>
          </div>
        </div>
      </div>

      <!-- 下：版权行 -->
      <div class="footer-bottom">
        <p class="copyright">
          <slot>{{ copyright }} {{ brand }} · {{ slogan || '以设计记录思考' }}</slot>
        </p>
        <p v-if="icp" class="icp">{{ icp }}</p>
        <button class="back-top" type="button" aria-label="返回顶部" @click="scrollTop">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <polyline points="18 15 12 9 6 15" />
          </svg>
          回到顶部
        </button>
      </div>
    </div>
  </footer>
</template>

<style scoped>
.footer {
  border-top: 1px solid var(--border-light);
  padding: var(--footer-py, 28px) 24px;
  margin-top: var(--footer-mt, 0);
  background-color: var(--bg-soft);
}

.footer-inner {
  max-width: 1040px;
  margin: 0 auto;
}

/* 三栏 */
.footer-cols {
  display: grid;
  grid-template-columns: 1.4fr 1fr 1fr;
  gap: 40px;
  padding-bottom: 28px;
  border-bottom: 1px solid var(--border-light);
}

/* 品牌 */
.brand-row {
  display: flex;
  align-items: center;
  gap: 10px;
}

.brand-mark {
  display: inline-flex;
  width: 28px;
  height: 28px;
  flex-shrink: 0;
}

.brand-mark svg {
  width: 100%;
  height: 100%;
}

.brand-name {
  font-family: var(--font-serif);
  font-size: 20px;
  font-weight: 700;
  color: var(--text-brand);
  letter-spacing: 0.06em;
}

.brand-slogan {
  margin-top: 14px;
  font-size: 13px;
  line-height: 1.7;
  color: var(--text-tertiary);
  max-width: 280px;
}

/* 标题 */
.footer-title {
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.08em;
  color: var(--text-secondary);
  margin-bottom: 14px;
  text-transform: uppercase;
}

/* 导航 */
.footer-nav ul {
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.footer-nav a {
  font-size: 14px;
  color: var(--text-secondary);
  text-decoration: none;
  transition: color var(--transition);
}

.footer-nav a:hover {
  color: var(--accent);
}

/* 社交 */
.social-row {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.social-link {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 7px 14px;
  border-radius: 100px;
  border: 1px solid var(--border);
  background-color: var(--bg-card);
  color: var(--text-secondary);
  text-decoration: none;
  font-size: 13px;
  transition: all var(--transition);
}

.social-link svg {
  width: 15px;
  height: 15px;
}

.social-link:hover {
  border-color: var(--accent);
  color: #ffffff;
  background-color: var(--accent);
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(45, 130, 100, 0.22);
}

[data-theme='dark'] .social-link:hover {
  box-shadow: 0 4px 12px rgba(95, 197, 154, 0.18);
}

/* 版权行 */
.footer-bottom {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
  padding-top: 22px;
}

.copyright {
  font-size: 13px;
  color: var(--text-tertiary);
}

.icp {
  font-size: 12px;
  color: var(--text-tertiary);
  opacity: 0.8;
}

.back-top {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 7px 14px;
  border-radius: 100px;
  border: 1px solid var(--border);
  background-color: var(--bg-card);
  color: var(--text-secondary);
  font-size: 13px;
  cursor: pointer;
  font-family: inherit;
  transition: all var(--transition);
}

.back-top svg {
  width: 14px;
  height: 14px;
}

.back-top:hover {
  border-color: var(--accent);
  color: var(--accent);
  transform: translateY(-1px);
}

/* 响应式 */
@media (max-width: 768px) {
  .footer-cols {
    grid-template-columns: 1fr 1fr;
    gap: 28px 24px;
  }

  .footer-brand {
    grid-column: 1 / -1;
  }
}

@media (max-width: 480px) {
  .footer-cols {
    grid-template-columns: 1fr;
  }

  .footer-bottom {
    flex-direction: column;
    align-items: flex-start;
  }
}

@media print {
  .footer {
    display: none !important;
  }
}
</style>
