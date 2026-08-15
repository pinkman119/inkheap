<script setup>
/**
 * 简历内容渲染组件（无状态）。
 * 严格对齐 prototypes/resume.html 的布局与样式。
 * 前台 ResumeView 与后台 ResumeManageView 预览区复用本组件。
 */
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'

const props = defineProps({
  /** 简历 content 对象（profile/info/education/certificates/about/techCategories/projects/experiences） */
  content: {
    type: Object,
    required: true,
  },
})

// 使用 computed：props.content 可能在异步加载后被整体替换（如前台从接口获取生效版本），
// 若直接用 const 快照则内容更新后组件不会重新渲染。
const c = computed(() => props.content || {})

const navRef = ref(null)

function onDownload() {
  window.print()
}

/* ===== 页内锚点跳转 =====
 * 项目路由为 hash 模式，原生 <a href="#about"> 会被 Vue Router 当成路由跳转，
 * 因此这里拦截默认行为，改为在当前页面内平滑滚动到对应模块。
 */
function scrollToSection(e) {
  const id = e.currentTarget.getAttribute('href').slice(1)
  const el = document.getElementById(id)
  if (!el) return
  el.scrollIntoView({ behavior: 'smooth', block: 'start' })
  // 点击时直接高亮目标，避免平滑滚动中途的位置误判覆盖。
  // 锁定高亮直到滚动结束，再由滚动监听接管坐标计算。
  setActive(id)
  lockHighlight()
}

/* ===== 点击高亮锁定 ===== */
let highlightLocked = false
let unlockTimer = null
function lockHighlight() {
  highlightLocked = true
  clearTimeout(unlockTimer)
  unlockTimer = setTimeout(() => {
    highlightLocked = false
    pickActive()
  }, 1000)
}

/* ===== 锚点导航高亮（scroll 坐标法） ===== */
let navLinks = []
let navMap = {}
let navSections = []
let rafId = null
let spyAttached = false

function setActive(id) {
  if (!navLinks.length) return
  navLinks.forEach((l) => l.classList.toggle('active', l === navMap[id]))
}

function pickActive() {
  if (!navSections.length || highlightLocked) return
  const h = document.documentElement
  const scrollable = h.scrollHeight - h.clientHeight
  // 滚到页面底部时高亮最后一个模块（最后一项可能不足以滚到检测线）
  if (scrollable > 0 && h.scrollTop >= scrollable - 2) {
    setActive(navSections[navSections.length - 1].id)
    return
  }
  // 检测线：与模块 scroll-margin-top:150px 对齐（取 160 留余量），模块被滚动到
  // top≈150 时应判为「已到达」。顶部已滚过该线的最后一个模块即当前阅读模块。
  const LINE = 160
  let target = null
  for (const s of navSections) {
    if (s.getBoundingClientRect().top <= LINE) target = s
  }
  if (target) setActive(target.id)
}

function onSpyScroll() {
  if (rafId) return
  rafId = requestAnimationFrame(() => {
    rafId = null
    pickActive()
  })
}

function onSpyScrollEnd() {
  highlightLocked = false
  pickActive()
}

function setupSpy() {
  const nav = navRef.value
  if (!nav) return
  navLinks = Array.from(nav.querySelectorAll('a'))
  navMap = {}
  navSections = navLinks
    .map((a) => {
      const el = document.getElementById(a.getAttribute('href').slice(1))
      if (el) navMap[el.id] = a
      return el
    })
    .filter(Boolean)
  if (!navSections.length) return
  pickActive()
  if (!spyAttached) {
    window.addEventListener('scroll', onSpyScroll, { passive: true })
    if ('onscrollend' in window) window.addEventListener('scrollend', onSpyScrollEnd)
    spyAttached = true
  }
}

onMounted(setupSpy)
onBeforeUnmount(() => {
  clearTimeout(unlockTimer)
  if (rafId) cancelAnimationFrame(rafId)
  window.removeEventListener('scroll', onSpyScroll)
  if ('onscrollend' in window) window.removeEventListener('scrollend', onSpyScrollEnd)
})

/* ===== 侧栏图标 ===== */
const infoIcons = {
  mail: '<path d="M22 6l-10 7L2 6"></path><rect x="2" y="4" width="20" height="16" rx="2"></rect>',
  chat: '<path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path>',
  location: '<path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle>',
  user: '<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle>',
  badge: '<path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="8.5" cy="7" r="4"></circle><polyline points="17 11 19 13 23 9"></polyline>',
}
function infoIcon(name) {
  return infoIcons[name] || infoIcons.user
}

/* 关于我段落允许少量 HTML（strong） */
</script>

<template>
  <div class="page">
    <!-- Hero -->
    <section class="hero">
      <div class="hero-main">
        <div class="avatar-xl" aria-hidden="true">{{ c.profile?.avatarText }}</div>
        <div>
          <div class="hero-name-row">
            <h1 class="hero-name">{{ c.profile?.name }}</h1>
            <span
              v-if="c.profile?.heroInfo"
              class="hero-info"
              tabindex="0"
              role="img"
              :aria-label="c.profile.heroInfo"
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
              >
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="12" y1="16" x2="12" y2="12"></line>
                <line x1="12" y1="8" x2="12.01" y2="8"></line>
              </svg>
              <span class="hero-info-tip" role="tooltip">{{ c.profile.heroInfo }}</span>
            </span>
          </div>
          <p class="hero-handle">{{ c.profile?.handle }}</p>
          <p class="hero-tagline">{{ c.profile?.tagline }}</p>
        </div>
      </div>
      <div class="hero-side">
        <button class="btn-download" type="button" @click="onDownload">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            aria-hidden="true"
          >
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
            <polyline points="7 10 12 15 17 10"></polyline>
            <line x1="12" y1="15" x2="12" y2="3"></line>
          </svg>
          下载 PDF
        </button>
      </div>
    </section>

    <div class="layout">
      <!-- Main -->
      <main class="main">
        <nav ref="navRef" class="resume-nav" aria-label="简历导航">
          <a href="#about" @click.prevent="scrollToSection">关于我</a>
          <a href="#tech" @click.prevent="scrollToSection">技术与能力</a>
          <a href="#projects" @click.prevent="scrollToSection">项目经历</a>
          <a href="#experience" @click.prevent="scrollToSection">工作经历</a>
        </nav>

        <!-- 关于我 -->
        <section class="section" id="about">
          <h2 class="section-title">关于我</h2>
          <p
            v-for="(lead, i) in (c.about?.leads || [])"
            :key="i"
            class="lead-text"
            :style="i > 0 ? 'margin-top:14px;' : ''"
            v-html="lead"
          ></p>
          <div v-if="c.about?.callout" class="callout">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
              aria-hidden="true"
            >
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="12" y1="16" x2="12" y2="12"></line>
              <line x1="12" y1="8" x2="12.01" y2="8"></line>
            </svg>
            <p>{{ c.about.callout }}</p>
          </div>
        </section>

        <!-- 技术与能力 -->
        <section class="section" id="tech">
          <h2 class="section-title">技术与能力</h2>
          <div v-for="cat in (c.techCategories || [])" :key="cat.title" class="tech-cat">
            <h3 class="tech-cat-title">{{ cat.title }}</h3>
            <div class="tech-list">
              <div v-for="item in cat.items" :key="item.name" class="tech-item">
                <div class="tech-name">{{ item.name }}</div>
                <p class="tech-desc">{{ item.desc }}</p>
              </div>
            </div>
          </div>
        </section>

        <!-- 项目经历 -->
        <section class="section" id="projects">
          <h2 class="section-title">项目经历</h2>
          <div v-for="project in (c.projects || [])" :key="project.title" class="proj">
            <div class="proj-head">
              <div class="proj-title">{{ project.title }}</div>
              <div class="proj-year">{{ project.year }}</div>
            </div>
            <p class="proj-desc">{{ project.desc }}</p>
            <div class="proj-tags">
              <span
                v-for="tag in project.tags"
                :key="tag.label"
                class="tag"
                :class="{ 'tag--accent': tag.accent }"
                >{{ tag.label }}</span
              >
            </div>
          </div>
        </section>

        <!-- 工作经历 -->
        <section class="section" id="experience">
          <h2 class="section-title">工作经历</h2>
          <ul class="exp">
            <li v-for="item in (c.experiences || [])" :key="item.role" class="exp-item">
              <div class="exp-head">
                <div class="exp-role">{{ item.role }}</div>
                <div class="exp-period">{{ item.period }}</div>
              </div>
              <div class="exp-org">{{ item.org }}</div>
              <ul class="exp-desc">
                <li v-for="point in item.points" :key="point">{{ point }}</li>
              </ul>
            </li>
          </ul>
        </section>
      </main>

      <!-- Sidebar -->
      <aside class="aside">
        <div class="side-card">
          <div class="side-title">个人信息</div>
          <ul class="info-list">
            <li v-for="item in (c.info || [])" :key="item.label">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
                aria-hidden="true"
                v-html="infoIcon(item.icon)"
              ></svg>
              <div class="info-content">
                <span class="info-label">{{ item.label }}</span>
                <a v-if="item.href" :href="item.href">{{ item.value }}</a>
                <span v-else class="info-value">{{ item.value }}</span>
              </div>
            </li>
          </ul>

          <div v-if="c.education" class="info-block" id="education">
            <div class="info-block-title">教育背景</div>
            <div class="edu-school">
              {{ c.education.school }}
              <span v-if="c.education.period" class="edu-year">{{ c.education.period }}</span>
            </div>
            <div v-if="c.education.major" class="edu-major">{{ c.education.major }}</div>
          </div>

          <div v-if="(c.certificates || []).length" class="info-block">
            <div class="info-block-title">资质 / 证书</div>
            <div class="tag-group">
              <span
                v-for="cert in c.certificates"
                :key="cert.label"
                class="tag"
                :class="{ 'tag--accent': cert.accent }"
                >{{ cert.label }}</span
              >
            </div>
          </div>
        </div>
      </aside>
    </div>
  </div>
</template>

<style scoped>
/* ===== Layout ===== */
.page {
  max-width: 1120px;
  margin: 0 auto;
  padding: 40px 24px 80px;
}

.layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 300px;
  gap: 48px;
  align-items: start;
  margin-top: 36px;
}

/* ===== Hero ===== */
.hero {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 32px;
  background-color: var(--bg-green-soft);
  border: 1px solid color-mix(in srgb, var(--accent) 18%, transparent);
  border-radius: var(--radius-lg);
  padding: 36px 40px;
}

.hero-main {
  display: flex;
  align-items: center;
  gap: 24px;
  min-width: 0;
}

.avatar-xl {
  width: 88px;
  height: 88px;
  border-radius: 24px;
  flex-shrink: 0;
  background: linear-gradient(135deg, #2d8264, #5fc59a);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: var(--font-serif);
  font-size: 40px;
  font-weight: 700;
  box-shadow: var(--shadow-md);
}

.hero-name {
  font-family: var(--font-serif);
  font-size: 32px;
  font-weight: 700;
  line-height: 1.2;
  letter-spacing: 0.04em;
}

.hero-name-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.hero-info {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  color: var(--text-tertiary);
  cursor: help;
}

.hero-info svg {
  width: 15px;
  height: 15px;
}

.hero-info:hover,
.hero-info:focus-visible {
  color: var(--accent);
  outline: none;
}

.hero-info-tip {
  position: absolute;
  top: calc(100% + 8px);
  left: 0;
  z-index: 30;
  width: max-content;
  max-width: 300px;
  padding: 8px 12px;
  background: var(--bg-card);
  color: var(--text-secondary);
  font-size: 12.5px;
  line-height: 1.6;
  border: 1px solid var(--border-light);
  border-radius: 8px;
  box-shadow: var(--shadow-md);
  opacity: 0;
  visibility: hidden;
  transform: translateY(-4px);
  transition:
    opacity 150ms ease,
    transform 150ms ease,
    visibility 150ms ease;
  pointer-events: none;
}

.hero-info:hover .hero-info-tip,
.hero-info:focus-visible .hero-info-tip {
  opacity: 1;
  visibility: visible;
  transform: translateY(0);
}

.hero-handle {
  font-size: 14px;
  color: var(--accent-hover);
  font-weight: 500;
  margin: 4px 0 8px;
  letter-spacing: 0.02em;
}

.hero-tagline {
  font-size: 14.5px;
  color: var(--text-secondary);
  max-width: 460px;
  line-height: 1.7;
}

.hero-side {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 16px;
  flex-shrink: 0;
}

.btn-download {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  background-color: var(--accent);
  color: #fff;
  border: none;
  cursor: pointer;
  font-family: var(--font-sans);
  font-size: 14px;
  font-weight: 600;
  letter-spacing: 0.04em;
  padding: 11px 22px;
  border-radius: 100px;
  transition: all var(--transition);
  box-shadow: var(--shadow-sm);
}

.btn-download:hover {
  background-color: var(--accent-hover);
  transform: translateY(-1px);
  box-shadow: var(--shadow-md);
}

.btn-download svg {
  width: 16px;
  height: 16px;
}

/* ===== Main sections ===== */
.main {
  min-width: 0;
}

/* ===== Resume in-page anchor nav ===== */
.resume-nav {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 38px;
  position: sticky;
  top: 88px;
  z-index: 50;
  padding: 9px 12px;
  background-color: color-mix(in srgb, var(--bg-body) 88%, transparent);
  backdrop-filter: blur(10px);
  border: 1px solid var(--border-light);
  border-radius: 100px;
}

.resume-nav a {
  font-size: 13.5px;
  font-weight: 500;
  color: var(--text-secondary);
  text-decoration: none;
  padding: 6px 16px;
  border-radius: 100px;
  transition: all var(--transition);
  white-space: nowrap;
}

.resume-nav a:hover {
  color: var(--accent);
  background-color: var(--accent-light);
}

.resume-nav a.active {
  color: #fff;
  background-color: var(--accent);
}

.main .section {
  scroll-margin-top: 150px;
}

.aside #education {
  scroll-margin-top: 150px;
}

.section {
  margin-bottom: 48px;
}

.section:last-child {
  margin-bottom: 0;
}

.section-title {
  font-family: var(--font-serif);
  font-size: 23px;
  font-weight: 600;
  line-height: 1.4;
  margin-bottom: 22px;
  padding-left: 16px;
  position: relative;
}

.section-title::before {
  content: '';
  position: absolute;
  left: 0;
  top: 4px;
  bottom: 4px;
  width: 4px;
  background-color: var(--accent);
  border-radius: 2px;
}

.lead-text {
  font-size: 15.5px;
  color: var(--text-secondary);
  line-height: 1.9;
}

.lead-text strong {
  color: var(--text-primary);
  font-weight: 600;
}

.callout {
  display: flex;
  gap: 14px;
  margin-top: 22px;
  padding: 18px 20px;
  background-color: var(--bg-card);
  border: 1px solid var(--border-light);
  border-left: 3px solid var(--accent);
  border-radius: var(--radius-sm);
}

.callout svg {
  width: 20px;
  height: 20px;
  color: var(--accent);
  flex-shrink: 0;
  margin-top: 3px;
}

.callout p {
  font-size: 14px;
  color: var(--text-secondary);
  margin: 0;
}

/* ===== Tech & capabilities ===== */
.tech-cat {
  margin-bottom: 30px;
}

.tech-cat:last-child {
  margin-bottom: 0;
}

.tech-cat-title {
  font-family: var(--font-sans);
  font-size: 16.5px;
  font-weight: 600;
  color: var(--text-primary);
  letter-spacing: 0.02em;
  margin: 0 0 16px;
  padding-left: 13px;
  position: relative;
}

.tech-cat-title::before {
  content: '';
  position: absolute;
  left: 0;
  top: 3px;
  bottom: 3px;
  width: 3px;
  background-color: var(--accent);
  border-radius: 2px;
}

.tech-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.tech-item {
  position: relative;
  padding-left: 16px;
}

.tech-item::before {
  content: '';
  position: absolute;
  left: 0;
  top: 9px;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background-color: var(--accent);
  opacity: 0.55;
}

.tech-name {
  font-size: 15px;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 5px;
}

.tech-desc {
  font-size: 14px;
  color: var(--text-secondary);
  line-height: 1.75;
  margin: 0;
}

/* ===== Experience timeline ===== */
.exp {
  list-style: none;
  position: relative;
  padding-left: 26px;
}

.exp::before {
  content: '';
  position: absolute;
  left: 7px;
  top: 6px;
  bottom: 6px;
  width: 2px;
  background: linear-gradient(var(--accent), color-mix(in srgb, var(--accent) 30%, transparent));
}

.exp-item {
  position: relative;
  margin-bottom: 32px;
}

.exp-item:last-child {
  margin-bottom: 0;
}

.exp-item::before {
  content: '';
  position: absolute;
  left: -23px;
  top: 7px;
  width: 11px;
  height: 11px;
  border-radius: 50%;
  background-color: var(--bg-body);
  border: 3px solid var(--accent);
}

.exp-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
}

.exp-role {
  font-family: var(--font-serif);
  font-size: 17px;
  font-weight: 600;
  color: var(--text-primary);
}

.exp-period {
  font-family: var(--font-mono);
  font-size: 13px;
  color: var(--accent-hover);
  white-space: nowrap;
}

.exp-org {
  font-size: 14px;
  color: var(--text-secondary);
  margin: 3px 0 12px;
  font-weight: 500;
}

.exp-desc {
  list-style: none;
  margin: 0;
  padding: 0;
}

.exp-desc li {
  position: relative;
  padding-left: 18px;
  margin-bottom: 9px;
  font-size: 14.5px;
  color: var(--text-secondary);
  line-height: 1.75;
}

.exp-desc li::before {
  content: '';
  position: absolute;
  left: 0;
  top: 11px;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background-color: var(--accent);
  opacity: 0.6;
}

/* ===== Project cards ===== */
.proj {
  background-color: var(--bg-card);
  border: 1px solid var(--border-light);
  border-radius: var(--radius-md);
  padding: 22px 24px;
  margin-bottom: 18px;
  transition: all var(--transition);
}

.proj:last-child {
  margin-bottom: 0;
}

.proj:hover {
  border-color: color-mix(in srgb, var(--accent) 35%, transparent);
  box-shadow: var(--shadow-sm);
  transform: translateY(-2px);
}

.proj-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 10px;
}

.proj-title {
  font-family: var(--font-serif);
  font-size: 17px;
  font-weight: 600;
  color: var(--text-primary);
}

.proj-year {
  font-family: var(--font-mono);
  font-size: 12.5px;
  color: var(--text-tertiary);
}

.proj-desc {
  font-size: 14.5px;
  color: var(--text-secondary);
  line-height: 1.75;
  margin-bottom: 14px;
}

.proj-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

/* ===== Tag ===== */
.tag-group {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.tag {
  font-size: 13px;
  color: var(--text-secondary);
  background-color: var(--bg-card);
  border: 1px solid var(--border);
  padding: 5px 13px;
  border-radius: 100px;
  transition: all var(--transition);
}

.tag:hover {
  border-color: var(--accent);
  color: var(--accent);
  background-color: var(--accent-light);
}

.tag--accent {
  background-color: var(--accent-light);
  border-color: transparent;
  color: var(--accent-hover);
  font-weight: 500;
}

/* ===== Sidebar ===== */
.aside {
  display: flex;
  flex-direction: column;
  gap: 20px;
  position: sticky;
  top: 92px;
}

.side-card {
  background-color: var(--bg-card);
  border: 1px solid var(--border-light);
  border-radius: var(--radius-md);
  padding: 22px;
}

.side-title {
  font-size: 12px;
  font-weight: 600;
  color: var(--text-tertiary);
  letter-spacing: 0.12em;
  text-transform: uppercase;
  margin-bottom: 16px;
}

/* ===== Personal info (sidebar) ===== */
.info-list {
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.info-list li {
  display: flex;
  align-items: flex-start;
  gap: 11px;
}

.info-list svg {
  width: 16px;
  height: 16px;
  color: var(--accent);
  flex-shrink: 0;
  margin-top: 2px;
}

.info-content {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.info-label {
  font-size: 12px;
  color: var(--text-tertiary);
  letter-spacing: 0.04em;
}

.info-content a {
  font-size: 14px;
  color: var(--text-primary);
  text-decoration: none;
  transition: color var(--transition);
}

.info-content a:hover {
  color: var(--accent);
}

.info-content .info-value {
  font-size: 14px;
  color: var(--text-primary);
}

.info-block {
  margin-top: 20px;
  padding-top: 18px;
  border-top: 1px solid var(--border-light);
}

.info-block-title {
  font-size: 12px;
  font-weight: 600;
  color: var(--text-tertiary);
  letter-spacing: 0.08em;
  margin-bottom: 10px;
}

.edu-school {
  font-size: 14.5px;
  font-weight: 600;
  color: var(--text-primary);
  line-height: 1.5;
}

.edu-year {
  color: var(--text-tertiary);
  font-weight: 400;
  font-family: var(--font-mono);
  font-size: 12.5px;
}

.edu-major {
  font-size: 13.5px;
  color: var(--text-secondary);
  margin-top: 3px;
}

/* ===== Responsive ===== */
@media (max-width: 920px) {
  .layout {
    grid-template-columns: 1fr;
    gap: 40px;
  }

  .aside {
    position: static;
    flex-direction: row;
    flex-wrap: wrap;
  }

  .side-card {
    flex: 1 1 240px;
  }
}

@media (max-width: 720px) {
  .hero {
    flex-direction: column;
    align-items: flex-start;
    padding: 28px 24px;
  }

  .hero-side {
    align-items: flex-start;
    width: 100%;
  }

  .page {
    padding: 28px 16px 56px;
  }

  .hero-name {
    font-size: 27px;
  }

  .avatar-xl {
    width: 72px;
    height: 72px;
    font-size: 32px;
    border-radius: 20px;
  }

  .aside {
    flex-direction: column;
  }
}

/* ===== Print ===== */
@media print {
  .btn-download,
  .resume-nav {
    display: none !important;
  }

  :global(body) {
    background: #fff;
    color: #000;
  }

  .page {
    padding: 0;
    max-width: 100%;
  }

  .layout {
    grid-template-columns: minmax(0, 1fr) 260px;
    gap: 32px;
    margin-top: 16px;
  }

  .hero {
    background: none;
    border: 1px solid #ccc;
    padding: 20px 24px;
  }

  .aside {
    position: static;
  }

  a {
    color: #000 !important;
    text-decoration: none;
  }
}
</style>
