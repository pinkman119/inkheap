<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import AppHeader from '@/components/AppHeader.vue'
import AppFooter from '@/components/AppFooter.vue'
import FootprintMap from '@/components/FootprintMap.vue'
import {
  profile,
  sections,
  selfEvaluation,
  rings,
  travels,
  visitedProvinces,
  footprintData,
  eventCalendar,
  eventCalendarYears,
} from '@/data/about'

/* ===== 年轮：与事件日历同一年份联动 ===== */
// 当前所选年份下的年轮条目（融合进事件日历）
const ringsOfYear = computed(() => rings.filter((r) => r.year === calYear.value))

/* ===== 事件日历（GitHub 风格热力块） ===== */
const calYear = ref(eventCalendarYears[0] ?? String(new Date().getFullYear()))

// 某天事件数量对应的等级（0~4，越大越绿）
function levelOf(count) {
  if (!count) return 0
  if (count === 1) return 1
  if (count === 2) return 2
  if (count === 3) return 3
  return 4
}

// 生成所选年份的 53 周 × 7 天网格（每周一列，周日在上）
const calWeeks = computed(() => {
  const year = Number(calYear.value)
  const first = new Date(year, 0, 1)
  const start = new Date(first)
  start.setDate(first.getDate() - first.getDay()) // 回退到所在周的周日
  const weeks = []
  const cursor = new Date(start)
  for (let w = 0; w < 53; w++) {
    const days = []
    for (let d = 0; d < 7; d++) {
      const date = new Date(cursor)
      const inYear = date.getFullYear() === year
      const key = `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`
      const events = inYear ? eventCalendar[key] || [] : []
      days.push({
        key,
        inYear,
        dateStr: `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`,
        events,
        level: levelOf(events.length),
      })
      cursor.setDate(cursor.getDate() + 1)
    }
    weeks.push(days)
  }
  return weeks
})

const openDay = ref(null) // 当前展开查看的事件日

function toggleDay(day) {
  if (!day.inYear) return
  if (day.events.length === 0) {
    openDay.value = null
    return
  }
  openDay.value = openDay.value && openDay.value.key === day.key ? null : day
}

/* ===== Scroll reveal（对应原型的 IntersectionObserver） ===== */
const sectionEls = ref([])
const revealed = ref(sections.map(() => false))

function setSectionRef(el, index) {
  if (el) sectionEls.value[index] = el
}

let io = null

onMounted(() => {
  if ('IntersectionObserver' in window) {
    io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            const index = sectionEls.value.indexOf(e.target)
            if (index > -1) revealed.value[index] = true
            io.unobserve(e.target)
          }
        })
      },
      { threshold: 0.12 },
    )
    sectionEls.value.forEach((el) => el && io.observe(el))
  } else {
    revealed.value = revealed.value.map(() => true)
  }
})

onBeforeUnmount(() => {
  if (io) {
    io.disconnect()
    io = null
  }
})
</script>

<template>
  <AppHeader active-key="about" />

  <main class="page">
    <!-- Hero -->
    <section class="page-hero">
      <div class="hero-glow" />
      <div class="page-hero-inner">
        <div class="avatar">
          <img :src="profile.avatar" :alt="profile.avatarAlt" />
        </div>
        <div class="page-hero-text">
          <span class="kicker">{{ profile.kicker }}</span>
          <h1>{{ profile.name }}</h1>
          <p class="lede">{{ profile.lede }}</p>
        </div>
      </div>
    </section>

    <div class="container">
      <!-- 写给自己 -->
      <section
        :ref="(el) => setSectionRef(el, 0)"
        class="section reveal"
        :class="{ in: revealed[0] }"
      >
        <div class="section-head">
          <span class="section-index">{{ sections[0].index }}</span>
          <h2 class="section-title">{{ sections[0].title }}</h2>
          <span class="section-sub">{{ sections[0].sub }}</span>
        </div>
        <div class="quote-card">
          <span class="quote-mark" aria-hidden="true">“</span>
          <blockquote>{{ selfEvaluation.quote }}</blockquote>
          <div class="by">{{ selfEvaluation.by }}</div>
        </div>
      </section>

      <!-- 事件日历（融合年轮） -->
      <section
        :ref="(el) => setSectionRef(el, 1)"
        class="section reveal"
        :class="{ in: revealed[1] }"
      >
        <div class="section-head">
          <span class="section-index">{{ sections[1].index }}</span>
          <h2 class="section-title">{{ sections[1].title }}</h2>
          <span class="section-sub">{{ sections[1].sub }}</span>
        </div>

        <div class="calendar-card">
          <!-- 年份切换 -->
          <div class="cal-bar">
            <div class="cal-years">
              <button
                v-for="y in eventCalendarYears"
                :key="y"
                class="cal-year-btn"
                :class="{ active: y === calYear }"
                @click="calYear = y"
              >
                {{ y }}
              </button>
            </div>
            <div class="cal-legend">
              <span class="cal-legend-text">少</span>
              <span v-for="n in 5" :key="n" class="cal-cell cal-lv" :class="`lv${n - 1}`" />
              <span class="cal-legend-text">多</span>
            </div>
          </div>

          <!-- 热力块网格 -->
          <div class="cal-grid-wrap">
            <div class="cal-grid">
              <div v-for="(week, wi) in calWeeks" :key="wi" class="cal-week">
                <button
                  v-for="(day, di) in week"
                  :key="di"
                  class="cal-cell"
                  :class="[`lv${day.level}`, { 'cal-out': !day.inYear, 'cal-active': openDay && openDay.key === day.key }]"
                  :disabled="!day.inYear"
                  :title="day.inYear ? `${day.dateStr} · ${day.events.length} 件事` : ''"
                  @click="toggleDay(day)"
                />
              </div>
            </div>
          </div>

          <!-- 当天事件详情 -->
          <div v-if="openDay" class="cal-detail">
            <div class="cal-detail-date">{{ openDay.dateStr }}</div>
            <ul class="cal-detail-list">
              <li v-for="(ev, i) in openDay.events" :key="i" class="cal-detail-item">
                <span class="cal-detail-dot" />
                <div>
                  <div class="cal-detail-title">{{ ev.title }}</div>
                  <div class="cal-detail-desc">{{ ev.desc }}</div>
                </div>
              </li>
            </ul>
          </div>
          <div v-else class="cal-hint">点击有颜色的方块，查看那一天的成就事件。</div>

          <!-- 年轮：同一年份下的人生经历 -->
          <div class="rings-in-cal">
            <div class="rings-in-cal-head">
              <span class="ring-year-label">{{ calYear }}</span>
              <span class="rings-in-cal-sub">这一年的年轮</span>
            </div>
            <div v-if="ringsOfYear.length" class="rings">
              <div v-for="ring in ringsOfYear" :key="ring.year" class="ring-block">
                <div class="ring-items">
                  <div v-for="(it, i) in ring.items" :key="i" class="ring-item">
                    <span class="ring-dot" />
                    <div class="ring-body">
                      <div class="ring-title">{{ it.title }}</div>
                      <div class="ring-desc">{{ it.desc }}</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div v-else class="cal-hint">这一年还没有写进年轮的经历。</div>
          </div>
        </div>
      </section>

      <!-- 我的足迹 -->
      <section
        :ref="(el) => setSectionRef(el, 2)"
        class="section reveal"
        :class="{ in: revealed[2] }"
      >
        <div class="section-head">
          <span class="section-index">{{ sections[2].index }}</span>
          <h2 class="section-title">{{ sections[2].title }}</h2>
          <span class="section-sub">{{ sections[2].sub }}</span>
        </div>
        <FootprintMap :visited-provinces="visitedProvinces" :footprint-data="footprintData" />
      </section>

      <!-- 旅行介绍 -->
      <section
        :ref="(el) => setSectionRef(el, 3)"
        class="section reveal"
        :class="{ in: revealed[3] }"
      >
        <div class="section-head">
          <span class="section-index">{{ sections[3].index }}</span>
          <h2 class="section-title">{{ sections[3].title }}</h2>
          <span class="section-sub">{{ sections[3].sub }}</span>
        </div>
        <div class="travel-grid">
          <article v-for="travel in travels" :key="travel.place" class="travel-card">
            <div class="travel-cover">
              <span class="glyph">{{ travel.glyph }}</span>
            </div>
            <div class="travel-body">
              <div class="travel-place">{{ travel.place }}</div>
              <div class="travel-meta">{{ travel.meta }}</div>
              <div class="travel-note">{{ travel.note }}</div>
            </div>
          </article>
        </div>
      </section>
    </div>
  </main>

  <AppFooter padding-y="28px" />
</template>

<style scoped>
/* ===== Page layout ===== */
.page {
  flex: 1;
}

.container {
  max-width: 1080px;
  margin: 0 auto;
  padding: 0 24px;
}

/* Page hero */
.page-hero {
  position: relative;
  overflow: hidden;
  padding: 72px 24px 56px;
  border-bottom: 1px solid var(--border-light);
}

.hero-glow {
  position: absolute;
  top: -80px;
  right: -60px;
  width: 440px;
  height: 440px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(45, 130, 100, 0.14), transparent 65%);
  filter: blur(48px);
  pointer-events: none;
}

[data-theme='dark'] .hero-glow {
  background: radial-gradient(circle, rgba(95, 197, 154, 0.13), transparent 65%);
}

.page-hero-inner {
  position: relative;
  z-index: 1;
  max-width: 1080px;
  margin: 0 auto;
  display: flex;
  align-items: center;
  gap: 40px;
}

.page-hero .avatar {
  width: 132px;
  height: 132px;
  border-radius: 50%;
  flex-shrink: 0;
  overflow: hidden;
  border: 3px solid var(--accent);
  box-shadow:
    var(--shadow-md),
    0 0 0 8px var(--accent-light);
  background-color: var(--bg-card);
  transition:
    transform var(--transition),
    box-shadow var(--transition);
}

.page-hero .avatar:hover {
  transform: translateY(-3px) scale(1.02);
  box-shadow:
    var(--shadow-lg),
    0 0 0 10px var(--accent-light);
}

.page-hero .avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.kicker {
  display: inline-block;
  font-family: var(--font-mono);
  font-size: 12.5px;
  font-weight: 500;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--accent);
  padding: 4px 12px;
  border: 1px solid color-mix(in srgb, var(--accent) 35%, transparent);
  border-radius: 100px;
  background-color: var(--accent-light);
  margin-bottom: 16px;
}

.page-hero h1 {
  font-family: var(--font-serif);
  font-size: 40px;
  font-weight: 700;
  color: var(--text-primary);
  letter-spacing: 0.02em;
  margin-bottom: 12px;
}

.page-hero .lede {
  font-size: 16px;
  color: var(--text-secondary);
  max-width: 560px;
}

/* Section */
.section {
  padding: 56px 0;
  border-bottom: 1px solid var(--border-light);
}

.section:last-of-type {
  border-bottom: none;
}

.section-head {
  display: flex;
  align-items: baseline;
  gap: 16px;
  margin-bottom: 32px;
}

.section-index {
  font-family: var(--font-mono);
  font-size: 14px;
  color: var(--accent);
  font-weight: 500;
}

.section-title {
  font-family: var(--font-serif);
  font-size: 26px;
  font-weight: 700;
  color: var(--text-primary);
  letter-spacing: 0.01em;
  position: relative;
  padding-left: 16px;
}

.section-title::before {
  content: '';
  position: absolute;
  left: 0;
  top: 50%;
  transform: translateY(-50%);
  width: 5px;
  height: 22px;
  border-radius: 100px;
  background-color: var(--accent);
}

.section-sub {
  font-size: 14px;
  color: var(--text-tertiary);
  margin-left: auto;
}

/* 年轮（融合进事件日历） */
.rings-in-cal {
  margin-top: 24px;
  border-top: 1px solid var(--border-light);
  padding-top: 22px;
}

.rings-in-cal-head {
  display: flex;
  align-items: baseline;
  gap: 12px;
  margin-bottom: 18px;
}

.ring-year-label {
  font-family: var(--font-mono);
  font-size: 22px;
  font-weight: 700;
  color: var(--accent);
  letter-spacing: 0.04em;
}

.rings-in-cal-sub {
  font-size: 13px;
  color: var(--text-tertiary);
}

.rings {
  display: flex;
  flex-direction: column;
  gap: 22px;
}

.ring-block {
  display: flex;
  gap: 24px;
  align-items: flex-start;
}

.ring-year {
  font-family: var(--font-mono);
  font-size: 22px;
  font-weight: 700;
  color: var(--accent);
  letter-spacing: 0.04em;
  flex-shrink: 0;
  width: 84px;
  position: relative;
  padding-left: 18px;
}

.ring-year::before {
  content: '';
  position: absolute;
  left: 0;
  top: 4px;
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background-color: var(--accent);
  box-shadow: 0 0 0 5px var(--accent-light);
}

.ring-items {
  flex: 1;
  border-left: 2px solid var(--border-light);
  padding-left: 22px;
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.ring-item {
  position: relative;
}

.ring-dot {
  position: absolute;
  left: -29px;
  top: 6px;
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background-color: var(--bg-card);
  border: 3px solid var(--accent);
}

.ring-title {
  font-size: 16.5px;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 3px;
}

.ring-desc {
  font-size: 14px;
  color: var(--text-secondary);
  line-height: 1.6;
}

/* Travel grid */
.travel-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 20px;
}

.travel-card {
  position: relative;
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  background-color: var(--bg-card);
  overflow: hidden;
  transition:
    transform var(--transition),
    box-shadow var(--transition),
    border-color var(--transition);
}

.travel-card:hover {
  transform: translateY(-4px);
  box-shadow: var(--shadow-md);
  border-color: color-mix(in srgb, var(--accent) 40%, transparent);
}

.travel-cover {
  height: 120px;
  display: flex;
  align-items: flex-end;
  padding: 14px 16px;
  color: #ffffff;
  background:
    radial-gradient(circle at 80% 20%, rgba(255,255,255,0.18), transparent 45%),
    linear-gradient(135deg, #2d8264, #143f30);
}

[data-theme='dark'] .travel-cover {
  background:
    radial-gradient(circle at 80% 20%, rgba(255,255,255,0.14), transparent 45%),
    linear-gradient(135deg, #2f6b54, #0e2a20);
}

.travel-cover .glyph {
  font-family: var(--font-mono);
  font-size: 13px;
  letter-spacing: 0.1em;
  opacity: 0.9;
}

.travel-body {
  padding: 16px 18px 20px;
}

.travel-place {
  font-size: 17px;
  font-weight: 600;
  color: var(--text-primary);
}

.travel-meta {
  font-family: var(--font-mono);
  font-size: 12.5px;
  color: var(--accent);
  margin: 4px 0 8px;
}

.travel-note {
  font-size: 14px;
  color: var(--text-secondary);
}

/* Quote (self evaluation) */
.quote-card {
  position: relative;
  padding: 40px 44px;
  background: linear-gradient(135deg, var(--bg-green-soft), var(--bg-soft));
  border: 1px solid color-mix(in srgb, var(--accent) 22%, transparent);
  border-radius: var(--radius-lg);
}

.quote-mark {
  position: absolute;
  top: 16px;
  left: 24px;
  font-family: var(--font-serif);
  font-size: 64px;
  line-height: 1;
  color: var(--accent);
  opacity: 0.22;
}

.quote-card blockquote {
  position: relative;
  z-index: 1;
  font-family: var(--font-serif);
  font-size: 22px;
  font-weight: 600;
  line-height: 1.7;
  color: var(--text-primary);
  margin-bottom: 18px;
}

[data-theme='dark'] .quote-card blockquote {
  color: var(--text-primary);
}

.quote-card .by {
  font-size: 14px;
  color: var(--text-tertiary);
  font-family: var(--font-mono);
}

/* 事件日历 */
.calendar-card {
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  background-color: var(--bg-card);
  padding: 24px 26px;
}

.cal-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 14px;
  margin-bottom: 20px;
}

.cal-years {
  display: flex;
  gap: 8px;
}

.cal-year-btn {
  font-family: var(--font-mono);
  font-size: 13px;
  padding: 6px 14px;
  border-radius: 100px;
  border: 1px solid var(--border);
  background-color: transparent;
  color: var(--text-tertiary);
  cursor: pointer;
  transition:
    color var(--transition),
    border-color var(--transition),
    background-color var(--transition);
}

.cal-year-btn:hover {
  color: var(--accent);
  border-color: color-mix(in srgb, var(--accent) 40%, transparent);
}

.cal-year-btn.active {
  color: #fff;
  background-color: var(--accent);
  border-color: var(--accent);
}

.cal-legend {
  display: flex;
  align-items: center;
  gap: 5px;
}

.cal-legend-text {
  font-size: 12px;
  color: var(--text-tertiary);
  margin: 0 4px;
}

.cal-grid-wrap {
  overflow-x: auto;
  padding-bottom: 6px;
}

.cal-grid {
  display: flex;
  gap: 4px;
}

.cal-week {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.cal-cell {
  width: 14px;
  height: 14px;
  border-radius: 3px;
  border: none;
  padding: 0;
  cursor: pointer;
  background-color: var(--cal-lv0);
  transition:
    transform .12s ease,
    box-shadow .12s ease;
}

.cal-cell:not(.cal-out):hover {
  transform: scale(1.25);
  box-shadow: 0 0 0 1px color-mix(in srgb, var(--accent) 60%, transparent);
}

.cal-out {
  background-color: transparent;
  cursor: default;
}

.cal-active {
  box-shadow: 0 0 0 2px var(--accent);
}

/* 绿色主题（浅色 / 深色共用，靠变量微调） */
.calendar-card {
  --cal-lv0: #ebedf0;
  --cal-lv1: #9be9a8;
  --cal-lv2: #40c463;
  --cal-lv3: #2a9d4f;
  --cal-lv4: #166b34;
}

[data-theme='dark'] .calendar-card {
  --cal-lv0: #1c2230;
  --cal-lv1: #2f6b4f;
  --cal-lv2: #40c463;
  --cal-lv3: #2a9d4f;
  --cal-lv4: #7ee2a8;
}

.cal-cell.lv0 { background-color: var(--cal-lv0); }
.cal-cell.lv1 { background-color: var(--cal-lv1); }
.cal-cell.lv2 { background-color: var(--cal-lv2); }
.cal-cell.lv3 { background-color: var(--cal-lv3); }
.cal-cell.lv4 { background-color: var(--cal-lv4); }

.cal-hint {
  margin-top: 16px;
  font-size: 13px;
  color: var(--text-tertiary);
}

/* 当天事件详情 */
.cal-detail {
  margin-top: 18px;
  border-top: 1px solid var(--border-light);
  padding-top: 18px;
}

.cal-detail-date {
  font-family: var(--font-mono);
  font-size: 14px;
  font-weight: 600;
  color: var(--accent);
  margin-bottom: 12px;
}

.cal-detail-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.cal-detail-item {
  display: flex;
  gap: 12px;
  align-items: flex-start;
}

.cal-detail-dot {
  width: 9px;
  height: 9px;
  border-radius: 50%;
  background-color: var(--accent);
  margin-top: 6px;
  flex-shrink: 0;
}

.cal-detail-title {
  font-size: 15px;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 3px;
}

.cal-detail-desc {
  font-size: 13.5px;
  color: var(--text-secondary);
  line-height: 1.6;
}

/* Reveal on scroll */
.reveal {
  opacity: 0;
  transform: translateY(16px);
  transition:
    opacity .6s ease,
    transform .6s ease;
}

.reveal.in {
  opacity: 1;
  transform: none;
}

@media (prefers-reduced-motion: reduce) {
  .reveal {
    opacity: 1;
    transform: none;
    transition: none;
  }
}

/* Responsive */
@media (max-width: 1024px) {
  .travel-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 768px) {
  .page-hero {
    padding: 44px 16px 40px;
  }

  .page-hero-inner {
    flex-direction: column;
    text-align: center;
    gap: 24px;
  }

  .page-hero h1 {
    font-size: 32px;
  }

  .section-title {
    font-size: 22px;
  }

  .section-head {
    flex-wrap: wrap;
    gap: 8px;
  }

  .section-sub {
    width: 100%;
    margin-left: 0;
  }

  .travel-grid {
    grid-template-columns: 1fr;
  }

  .cal-grid {
    min-width: 728px;
  }

  .quote-card {
    padding: 28px 24px;
  }

  .quote-card blockquote {
    font-size: 19px;
  }
}
</style>
