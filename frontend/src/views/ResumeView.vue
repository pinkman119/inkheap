<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import AppHeader from '@/components/AppHeader.vue'
import AppFooter from '@/components/AppFooter.vue'
import {
  basicInfo,
  contacts,
  experiences,
  heroChips,
  languages,
  profile,
  projects,
  skillCategories,
} from '@/data/resume'

/* ===== Reading progress ===== */
const progressRatio = ref(0)
const progressWidth = computed(() => progressRatio.value * 100 + '%')
const progressValue = computed(() => Math.round(progressRatio.value * 100))

function onScroll() {
  const h = document.documentElement
  const scrollable = h.scrollHeight - h.clientHeight
  progressRatio.value = scrollable > 0 ? h.scrollTop / scrollable : 0
}

/* ===== 下载 PDF（调用浏览器打印） ===== */
function onDownload() {
  window.print()
}

/* ===== 项目展开/收起 ===== */
const expandedProjects = ref(new Set())

function toggleProject(title) {
  const next = new Set(expandedProjects.value)
  if (next.has(title)) {
    next.delete(title)
  } else {
    next.add(title)
  }
  expandedProjects.value = next
}

/* ===== 技能分类展开/收起（默认全部展开） ===== */
const expandedSkills = ref(new Set(skillCategories.map((_, i) => i)))

function toggleSkill(index) {
  const next = new Set(expandedSkills.value)
  if (next.has(index)) {
    next.delete(index)
  } else {
    next.add(index)
  }
  expandedSkills.value = next
}

onMounted(() => {
  window.addEventListener('scroll', onScroll, { passive: true })
})

onBeforeUnmount(() => {
  window.removeEventListener('scroll', onScroll)
})
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

  <AppHeader active-key="resume" narrow />

  <div class="page">
    <!-- Hero -->
    <section class="hero">
      <div class="hero-main">
        <div class="avatar-xl" aria-hidden="true">{{ profile.avatarText }}</div>
        <div>
          <h1 class="hero-name">{{ profile.name }}</h1>
          <p class="hero-handle">{{ profile.handle }}</p>
          <p class="hero-tagline">{{ profile.tagline }}</p>
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
        <div class="hero-chips">
          <component
            :is="chip.href ? 'a' : 'span'"
            v-for="chip in heroChips"
            :key="chip.label"
            class="chip"
            :href="chip.href || undefined"
          >
            <svg
              v-if="chip.icon === 'mail'"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
              aria-hidden="true"
            >
              <path d="M4 4h16v16H4z" opacity="0" />
              <path d="M22 6l-10 7L2 6"></path>
              <rect x="2" y="4" width="20" height="16" rx="2"></rect>
            </svg>
            <svg
              v-else-if="chip.icon === 'location'"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
              aria-hidden="true"
            >
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
              <circle cx="12" cy="10" r="3"></circle>
            </svg>
            <svg
              v-else
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
              aria-hidden="true"
            >
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="2" y1="12" x2="22" y2="12"></line>
              <path
                d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"
              ></path>
            </svg>
            {{ chip.label }}
          </component>
        </div>
      </div>
    </section>

    <div class="layout">
      <!-- Main -->
      <main class="main">
        <!-- 关于我 -->
        <section class="section">
          <h2 class="section-title">关于我</h2>

          <!-- 基本信息 -->
          <div class="basic-info-grid">
            <div v-for="item in basicInfo" :key="item.label" class="basic-info-item">
              <div class="basic-info-label">{{ item.label }}</div>
              <div class="basic-info-value">{{ item.value }}</div>
            </div>
          </div>
        </section>

        <!-- 技术与能力 -->
        <section class="section">
          <h2 class="section-title">技术与能力</h2>
          <div class="skill-categories">
            <div
              v-for="(category, idx) in skillCategories"
              :key="category.title"
              class="skill-category"
              :class="{ 'skill-category--open': expandedSkills.has(idx) }"
            >
              <button
                class="skill-category-header"
                type="button"
                @click="toggleSkill(idx)"
                :aria-expanded="expandedSkills.has(idx)"
              >
                <span class="skill-category-title">{{ category.title }}</span>
                <svg
                  class="skill-chevron"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  aria-hidden="true"
                >
                  <polyline points="6 9 12 15 18 9"></polyline>
                </svg>
              </button>
              <div v-show="expandedSkills.has(idx)" class="skill-category-body">
                <div v-for="item in category.items" :key="item.label" class="skill-item">
                  <div class="skill-item-label">{{ item.label }}</div>
                  <p v-if="item.desc" class="skill-item-desc">{{ item.desc }}</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <!-- 工作经历 -->
        <section class="section">
          <h2 class="section-title">工作经历</h2>
          <ul class="exp">
            <li v-for="item in experiences" :key="item.role" class="exp-item">
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

        <!-- 项目经历 -->
        <section class="section">
          <h2 class="section-title">项目经历</h2>
          <div v-for="project in projects" :key="project.title" class="proj">
            <button
              class="proj-head proj-head--btn"
              type="button"
              @click="toggleProject(project.title)"
              :aria-expanded="expandedProjects.has(project.title)"
            >
              <div class="proj-title-line">
                <span class="proj-title">{{ project.title }}</span>
                <svg
                  class="proj-chevron"
                  :class="{ 'proj-chevron--open': expandedProjects.has(project.title) }"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  aria-hidden="true"
                >
                  <polyline points="6 9 12 15 18 9"></polyline>
                </svg>
              </div>
              <div class="proj-year">{{ project.year }}</div>
            </button>
            <p class="proj-desc">{{ project.desc }}</p>
            <div
              v-if="project.details && expandedProjects.has(project.title)"
              class="proj-details"
            >
              <ul class="proj-detail-list">
                <li v-for="detail in project.details" :key="detail">{{ detail }}</li>
              </ul>
            </div>
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
      </main>

      <!-- Sidebar -->
      <aside class="aside">
        <div class="side-card">
          <div class="side-title">联系方式</div>
          <ul class="contact-list">
            <li v-for="contact in contacts" :key="contact.label">
              <svg
                v-if="contact.icon === 'mail'"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
                aria-hidden="true"
              >
                <path d="M22 6l-10 7L2 6"></path>
                <rect x="2" y="4" width="20" height="16" rx="2"></rect>
              </svg>
              <svg
                v-else-if="contact.icon === 'phone'"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
                aria-hidden="true"
              >
                <path
                  d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z"
                ></path>
              </svg>
              <svg
                v-else-if="contact.icon === 'github'"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
                aria-hidden="true"
              >
                <path
                  d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"
                ></path>
              </svg>
              <svg
                v-else
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
                aria-hidden="true"
              >
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="2" y1="12" x2="22" y2="12"></line>
                <path
                  d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"
                ></path>
              </svg>
              <span class="c-label">{{ contact.label }}</span>
              <a :href="contact.href">{{ contact.text }}</a>
            </li>
          </ul>
        </div>

        <div class="side-card">
          <div class="side-title">核心标签</div>
          <div class="tag-group">
            <span
              v-for="cat in skillCategories"
              :key="cat.title"
              class="tag tag--accent"
            >{{ cat.title }}</span>
          </div>
        </div>

        <div class="side-card">
          <div class="side-title">语言能力</div>
          <div v-for="lang in languages" :key="lang.name" class="lang-row">
            <div>
              <div>{{ lang.name }}</div>
              <div class="bar"><span :style="{ width: lang.percent }" /></div>
            </div>
            <div class="l-level">{{ lang.level }}</div>
          </div>
        </div>
      </aside>
    </div>
  </div>

  <AppFooter padding-y="36px" margin-top="64px" />
</template>

<style scoped>
/* ===== Reading progress ===== */
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

.hero-chips {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  justify-content: flex-end;
  max-width: 260px;
}

.chip {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 12.5px;
  color: var(--text-secondary);
  background-color: var(--bg-card);
  border: 1px solid var(--border);
  padding: 5px 11px;
  border-radius: 100px;
  text-decoration: none;
  transition: all var(--transition);
}

.chip:hover {
  border-color: var(--accent);
  color: var(--accent);
}

.chip svg {
  width: 13px;
  height: 13px;
  color: var(--accent);
}

/* ===== Main sections ===== */
.main {
  min-width: 0;
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

/* ===== Basic info grid ===== */
.basic-info-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 1px;
  margin-top: 24px;
  background-color: var(--border-light);
  border: 1px solid var(--border-light);
  border-radius: var(--radius-md);
  overflow: hidden;
}

.basic-info-item {
  display: flex;
  align-items: flex-start;
  background-color: var(--bg-card);
  padding: 16px 20px;
  gap: 16px;
}

.basic-info-label {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-tertiary);
  white-space: nowrap;
  min-width: 80px;
  letter-spacing: 0.04em;
}

.basic-info-value {
  font-size: 14.5px;
  color: var(--text-primary);
  line-height: 1.7;
}

/* ===== Skill categories ===== */
.skill-categories {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.skill-category {
  background-color: var(--bg-card);
  border: 1px solid var(--border-light);
  border-radius: var(--radius-md);
  overflow: hidden;
  transition: all var(--transition);
}

.skill-category:hover {
  border-color: color-mix(in srgb, var(--accent) 25%, transparent);
}

.skill-category--open {
  border-color: color-mix(in srgb, var(--accent) 35%, transparent);
  box-shadow: var(--shadow-sm);
}

.skill-category-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  padding: 18px 22px;
  background: none;
  border: none;
  cursor: pointer;
  font-family: inherit;
  text-align: left;
  transition: background-color var(--transition);
}

.skill-category-header:hover {
  background-color: color-mix(in srgb, var(--accent) 5%, transparent);
}

.skill-category-title {
  font-family: var(--font-serif);
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary);
}

.skill-chevron {
  width: 18px;
  height: 18px;
  color: var(--text-tertiary);
  flex-shrink: 0;
  transition: transform var(--transition);
}

.skill-category--open .skill-chevron {
  transform: rotate(180deg);
  color: var(--accent);
}

.skill-category-body {
  padding: 0 22px 20px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.skill-item {
  padding: 14px 18px;
  background-color: var(--bg-body);
  border-radius: var(--radius-sm);
  border-left: 3px solid var(--accent);
}

.skill-item-label {
  font-size: 14.5px;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 6px;
}

.skill-item-desc {
  font-size: 14px;
  color: var(--text-secondary);
  line-height: 1.8;
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
  border-color: color-mix(in srgb, var(--accent) 25%, transparent);
  box-shadow: var(--shadow-sm);
}

.proj-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 10px;
}

.proj-head--btn {
  width: 100%;
  background: none;
  border: none;
  padding: 0;
  cursor: pointer;
  font-family: inherit;
  text-align: left;
}

.proj-head--btn:hover .proj-title {
  color: var(--accent);
}

.proj-title-line {
  display: flex;
  align-items: center;
  gap: 8px;
}

.proj-title {
  font-family: var(--font-serif);
  font-size: 17px;
  font-weight: 600;
  color: var(--text-primary);
  transition: color var(--transition);
}

.proj-chevron {
  width: 16px;
  height: 16px;
  color: var(--text-tertiary);
  flex-shrink: 0;
  transition: transform var(--transition);
}

.proj-chevron--open {
  transform: rotate(180deg);
  color: var(--accent);
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

.proj-details {
  margin-bottom: 14px;
  padding: 14px 18px;
  background-color: var(--bg-body);
  border-radius: var(--radius-sm);
  border-left: 3px solid var(--accent);
}

.proj-detail-list {
  list-style: none;
  margin: 0;
  padding: 0;
}

.proj-detail-list li {
  position: relative;
  padding-left: 16px;
  margin-bottom: 8px;
  font-size: 14px;
  color: var(--text-secondary);
  line-height: 1.7;
}

.proj-detail-list li:last-child {
  margin-bottom: 0;
}

.proj-detail-list li::before {
  content: '';
  position: absolute;
  left: 0;
  top: 10px;
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background-color: var(--accent);
  opacity: 0.5;
}

.proj-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
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
  padding: 22px 22px;
}

.side-title {
  font-size: 12px;
  font-weight: 600;
  color: var(--text-tertiary);
  letter-spacing: 0.12em;
  text-transform: uppercase;
  margin-bottom: 16px;
}

.contact-list {
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 13px;
}

.contact-list li {
  display: flex;
  align-items: center;
  gap: 11px;
  font-size: 14px;
}

.contact-list svg {
  width: 16px;
  height: 16px;
  color: var(--accent);
  flex-shrink: 0;
}

.contact-list a {
  color: var(--text-primary);
  text-decoration: none;
  transition: color var(--transition);
}

.contact-list a:hover {
  color: var(--accent);
}

.contact-list .c-label {
  color: var(--text-tertiary);
  font-size: 12.5px;
  min-width: 42px;
}

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

.lang-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 14px;
  padding: 8px 0;
  border-bottom: 1px solid var(--border-light);
}

.lang-row:last-child {
  border-bottom: none;
  padding-bottom: 0;
}

.lang-row:first-child {
  padding-top: 0;
}

.lang-row .l-level {
  font-size: 12.5px;
  color: var(--text-tertiary);
}

.bar {
  height: 6px;
  border-radius: 3px;
  background-color: var(--bg-sidebar);
  margin-top: 6px;
  overflow: hidden;
}

.bar > span {
  display: block;
  height: 100%;
  background: linear-gradient(90deg, #2d8264, #5fc59a);
  border-radius: 3px;
}

/* ===== 响应式 ===== */
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

  .hero-chips {
    justify-content: flex-start;
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

  .basic-info-item {
    flex-direction: column;
    gap: 6px;
  }
}

/* ===== Print ===== */
@media print {
  .progress,
  .btn-download {
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

  .skill-category-body {
    display: block !important;
  }

  .proj-details {
    display: block !important;
  }

  .skill-chevron,
  .proj-chevron {
    display: none;
  }

  a {
    color: #000 !important;
    text-decoration: none;
  }
}
</style>
