<script setup>
import { computed, onMounted, ref } from 'vue'
import { useMode } from '../composables/useMode'
import { useApi } from '@/composables/useApi'
import BrandMark from '@/components/BrandMark.vue'
import SocialIcon from '@/components/SocialIcon.vue'

const { isWork } = useMode()
const api = useApi()

const props = defineProps({
  /** 上下内边距（原型：64px 上 / 32px 下） */
  paddingY: { type: String, default: '64px 32px' },
  /** 上外边距：默认 auto 让页脚贴底；简历页原型需 64px */
  marginTop: { type: String, default: 'auto' },
  /** 站点名称 */
  brand: { type: String, default: '墨堆' },
  /** 一句站点 slogan */
  slogan: { type: String, default: '光阴易逝，数字永生' },
  /** 站内导航链接（默认按模式动态计算） */
  links: { type: Array, default: null },
  /** 友链（外链），留空则不展示该列 */
  friendLinks: {
    type: Array,
    default: () => [
      { label: '源码', href: 'https://github.com/pinkman119/inkheap.git' },
    ],
  },
  /** 社交 / 联系方式：后台「底部管理 · 社交图标」有配置时优先使用，此处作为兜底默认值 */
  socials: {
    type: Array,
    default: () => [
      { label: 'GitHub', href: 'https://github.com', icon: 'github' },
      { label: '邮箱', href: 'mailto:hi@modui.design', icon: 'mail' },
      { label: '语雀', href: 'https://www.yuque.com', icon: 'yuque' },
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

// 数据库页脚链接（后台「底部管理」配置）：null = 未加载或加载失败，此时回退默认值
const dbLinks = ref(null)
// 页脚全局配置（备案号 / 备案地址）：null = 未加载或加载失败，此时回退 props 默认值
const dbConfig = ref(null)

onMounted(async () => {
  const [linksRes, configRes] = await Promise.allSettled([
    api.get('/public/footer-links'),
    api.get('/public/footer-config'),
  ])

  if (linksRes.status === 'fulfilled') {
    dbLinks.value = Array.isArray(linksRes.value) ? linksRes.value : []
  } else {
    console.warn('[AppFooter] 加载页脚链接失败，使用默认值', linksRes.reason)
    dbLinks.value = []
  }

  if (configRes.status === 'fulfilled' && configRes.value) {
    dbConfig.value = configRes.value
  } else {
    console.warn('[AppFooter] 加载页脚备案配置失败，使用默认值', configRes.reason)
    dbConfig.value = null
  }
})

// 备案信息：后台配置优先（空串 = 主动隐藏），未加载到配置时回退 props 默认值
const icpText = computed(() => (dbConfig.value ? dbConfig.value.icpNo : props.icp))
const icpHref = computed(() => (dbConfig.value && dbConfig.value.icpUrl) || 'https://beian.miit.gov.cn')

// 按当前模式过滤：mode = 0 全模式显示；1 = 仅工作；2 = 仅生活
function filterByMode(list) {
  const expected = isWork.value ? 1 : 2
  return list.filter((l) => l.mode === 0 || l.mode === expected)
}

// 导航链接：DB 有配置则优先使用（type=nav，按模式过滤）；否则回退 props / 模式默认值
// 列表项必须使用「记录 id」生成唯一 key：不同导航可能指向同一路由
// （例如「小记」与「邻居」都指向 /xiaoji），若用 to 当 key 会出现重复 key，
// Vue 在模式切换 diff 时无法正确卸载旧节点，导致链接每次切换越积越多。
const navLinks = computed(() => {
  const navFromDb = (dbLinks.value || [])
    .filter((l) => l.type === 'nav')
    .sort((a, b) => a.sortOrder - b.sortOrder)
  let items
  if (navFromDb.length) {
    items = filterByMode(navFromDb)
  } else if (props.links && props.links.length) {
    items = props.links
  } else {
    // 邻居：工作 / 生活双模式都显示（后台配置的 mode=0 条目同样两种模式都出现）
    const base = [
      { label: '联系我', to: '/contact' },
      { label: '邻居', to: '/friends' },
    ]
    const modeLinks = isWork.value
      ? [
          { label: '关于我', to: '/about' },
          { label: '小记', to: '/xiaoji' },
        ]
      : [
          { label: '知识库', to: '/articles' },
          { label: '简历', to: '/resume' },
        ]
    items = [...modeLinks, ...base]
  }
  return items.map((l, i) => ({
    key: `nav-${l.id ?? i}`,
    label: l.label,
    to: l.to ?? l.url,
  }))
})

// 扩展列：DB 有配置则优先使用（type=ext，按模式过滤）；否则回退 props 默认值
const extLinks = computed(() => {
  const extFromDb = (dbLinks.value || [])
    .filter((l) => l.type === 'ext')
    .sort((a, b) => a.sortOrder - b.sortOrder)
  const items = extFromDb.length ? filterByMode(extFromDb) : props.friendLinks || []
  return items.map((l, i) => ({
    key: `ext-${l.id ?? i}`,
    label: l.label,
    href: l.href ?? l.url,
  }))
})

// 圆形社交图标栏：DB 有配置则优先使用（type=social，按模式过滤）；否则回退 props 默认值
const socialList = computed(() => {
  const socialFromDb = (dbLinks.value || [])
    .filter((l) => l.type === 'social')
    .sort((a, b) => a.sortOrder - b.sortOrder)
  const items = socialFromDb.length
    ? filterByMode(socialFromDb).map((l) => ({
        label: l.label,
        href: l.url,
        icon: l.icon,
        svg: l.svg,
        id: l.id,
      }))
    : (props.socials || []).map((s) => ({ ...s, href: s.href, icon: s.icon, svg: s.svg }))
  return items.map((s, i) => ({
    key: `soc-${s.id ?? i}`,
    label: s.label,
    href: s.href,
    icon: s.icon,
    svg: s.svg,
  }))
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
            <BrandMark />
          </RouterLink>
          <div class="footer-brand__text">
            <span class="footer-brand__name">{{ brand }}</span>
            <span class="footer-brand__tag">{{ slogan }}</span>
          </div>
        </div>

        <div v-if="socialList.length" class="footer-icons">
          <a
            v-for="s in socialList"
            :key="s.key"
            class="footer-icon"
            :href="s.href"
            :aria-label="s.label"
            :title="s.label"
            target="_blank"
            rel="noopener noreferrer"
          >
            <SocialIcon :name="s.icon" :svg="s.svg" />
          </a>
        </div>
      </div>

      <!-- 两列导航 -->
      <div class="footer-nav">
        <div v-if="navLinks.length" class="footer-nav__col">
          <h4>导航</h4>
          <div class="footer-links">
            <RouterLink v-for="link in navLinks" :key="link.key" class="footer-link" :to="link.to">{{ link.label }}</RouterLink>
          </div>
        </div>
        <div v-if="extLinks.length" class="footer-nav__col">
          <h4>扩展</h4>
          <div class="footer-links">
            <a
              v-for="f in extLinks"
              :key="f.key"
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
            v-if="icpText"
            class="footer-beian"
            :href="icpHref"
            target="_blank"
            rel="noopener noreferrer"
          >{{ icpText }}</a>
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
  --mark-size: 34px;
  display: inline-flex;
  flex-shrink: 0;
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

/* 图标本体尺寸（SocialIcon 根元素：预设为 svg，自定义为包裹 span） */
.footer-icon > svg,
.footer-icon > span {
  width: 19px;
  height: 19px;
  flex-shrink: 0;
}

/* 品牌图标（语雀 / GitHub / X）hover 时转为跟随文字的剪影，保证与主色背景的对比度 */
.footer-icon:hover :deep(svg.brand-icon path) {
  fill: currentColor;
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
