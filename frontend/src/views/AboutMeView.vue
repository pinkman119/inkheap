<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import AppHeader from '@/components/AppHeader.vue'
import AppFooter from '@/components/AppFooter.vue'
import FootprintMap from '@/components/FootprintMap.vue'
import {
  loadAboutData,
  sections,
  PROVINCE_SHORT,
  letterToTravelers,
} from '@/data/about'

/* ===== 异步加载数据 ===== */
const loaded = ref(false)
const profile = ref({})
const selfEvaluation = ref({})
const rings = ref([])
const footprintData = ref([])
const visitedProvinces = ref([])
const eventCalendar = ref({})

/* ===== 事件日历涉及的年份（从 eventCalendar 的 key 与 rings 的 year 合并去重，倒序） ===== */
const eventCalendarYears = computed(() => {
  return [...new Set([
    ...Object.keys(eventCalendar.value).map((k) => k.slice(0, 4)),
    ...rings.value.map((r) => r.year),
  ])].sort((a, b) => b - a)
})

/* ===== 年轮：与事件日历同一年份联动 ===== */
// 当前所选年份下的年轮条目（融合进事件日历）
const ringsOfYear = computed(() => {
  // 按年份分组：同一年份的多条记录聚合成一个 ring 块（兼容原 rings 结构）
  const list = rings.value.filter((r) => r.year === calYear.value)
  if (!list.length) return []
  // 聚合成 { year, items: [{title, desc}] }
  const items = list.map((r) => ({ title: r.title, desc: r.desc }))
  return [{ year: calYear.value, items }]
})

/* ===== 事件日历（GitHub 风格热力块） ===== */
const calYear = ref('')

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
  if (!year) return []
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
      // 前端 grid 的 key 用「YYYY-M-D」（不带前导零），与历史实现保持一致；
      // 后端返回的 date 是「YYYY-MM-DD」，需在 groupEventsByDate 里做归一化。
      const m = date.getMonth() + 1
      const d2 = date.getDate()
      const key = `${date.getFullYear()}-${m}-${d2}`
      const events = inYear ? eventCalendar.value[key] || [] : []
      days.push({
        key,
        inYear,
        date: new Date(date),
        dateStr: `${date.getFullYear()}-${m}-${d2}`,
        events,
        level: levelOf(events.length),
      })
      cursor.setDate(cursor.getDate() + 1)
    }
    weeks.push(days)
  }
  return weeks
})

/* ===== 当日事件抽屉（点击热力块弹出，替代旧的网格下方展开区） ===== */
const openDay = ref(null) // 抽屉中查看的日期（Date 对象；空白天也可打开）

const WEEK_LABELS = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']

function keyOf(date) {
  return `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`
}

// 抽屉浏览边界：数据年份区间（最早年 1/1 ~ 最晚年 12/31）；无数据时退化为当前年
const dayRange = computed(() => {
  const years = eventCalendarYears.value
  const fallback = new Date().getFullYear()
  const min = years.length ? Number(years[years.length - 1]) : fallback
  const max = years.length ? Number(years[0]) : fallback
  return { min: new Date(min, 0, 1), max: new Date(max, 11, 31) }
})

const openDayKey = computed(() => (openDay.value ? keyOf(openDay.value) : null))
const drawerEvents = computed(() =>
  openDay.value ? eventCalendar.value[openDayKey.value] || [] : [],
)
const drawerDateStr = computed(() => {
  if (!openDay.value) return ''
  return `${openDay.value.getFullYear()}年${openDay.value.getMonth() + 1}月${openDay.value.getDate()}日`
})
const drawerWeek = computed(() => WEEK_LABELS[openDay.value?.getDay() ?? 0])
const canPrevDay = computed(() => !!openDay.value && openDay.value > dayRange.value.min)
const canNextDay = computed(() => !!openDay.value && openDay.value < dayRange.value.max)

// 点击热力块：年内任意一天（含无事件的空白天）都打开抽屉
function openDrawer(day) {
  if (!day.inYear) return
  openDay.value = day.date
}

function closeDrawer() {
  openDay.value = null
}

// 抽屉内切换上一天 / 下一天；跨年时热力块网格联动切换年份
function shiftDay(delta) {
  if (!openDay.value) return
  const next = new Date(openDay.value)
  next.setDate(next.getDate() + delta)
  if (next < dayRange.value.min || next > dayRange.value.max) return
  openDay.value = next
  const y = String(next.getFullYear())
  if (y !== calYear.value) calYear.value = y
}

// 手动切换年份时，关闭停留在旧年份的抽屉
watch(calYear, (y) => {
  if (openDay.value && String(openDay.value.getFullYear()) !== y) {
    openDay.value = null
  }
})

function onKeydown(e) {
  if (e.key === 'Escape') closeDrawer()
}

/* ===== Scroll reveal（对应原型的 IntersectionObserver） ===== */
const sectionEls = ref([])
const revealed = ref(sections.map(() => false))

function setSectionRef(el, index) {
  if (el) sectionEls.value[index] = el
}

let io = null

function initReveal() {
  if (!('IntersectionObserver' in window)) {
    revealed.value = revealed.value.map(() => true)
    return
  }
  // 兜底：若 observer 尚未触发的 section 已经在视口内（如首屏前几个 section），
  // 直接置为已展示，避免「白屏」。
  for (let i = 0; i < sectionEls.value.length; i++) {
    const el = sectionEls.value[i]
    if (!el) continue
    const rect = el.getBoundingClientRect()
    if (rect.top < window.innerHeight * 0.9) {
      revealed.value[i] = true
    }
  }
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
  sectionEls.value.forEach((el) => el && !revealed.value[sectionEls.value.indexOf(el)] && io.observe(el))
}

// 监听 loaded：数据加载完成、section 挂载后初始化 reveal 观察器
watch(loaded, async (val) => {
  if (!val) return
  await nextTick()
  initReveal()
})

onMounted(async () => {
  window.addEventListener('keydown', onKeydown)
  // 拉取关于我页全部数据
  try {
    const data = await loadAboutData()
    Object.assign(profile.value, data.profile)
    Object.assign(selfEvaluation.value, data.selfEvaluation)
    rings.value = data.rings
    footprintData.value = data.footprintData
    visitedProvinces.value = data.visitedProvinces
    eventCalendar.value = data.eventCalendar
    calYear.value = eventCalendarYears.value[0] ?? String(new Date().getFullYear())
  } catch (e) {
    // 拉取失败时仍展示页面，年份回退到当前年
    calYear.value = String(new Date().getFullYear())
  } finally {
    loaded.value = true
  }
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKeydown)
  if (io) {
    io.disconnect()
    io = null
  }
})
</script>

<template>
  <AppHeader active-key="" />

  <main class="page">
    <!-- 骨架屏：数据加载完成前展示 -->
    <div v-if="!loaded" class="about-skeleton">
      <div class="sk-hero">
        <div class="sk-avatar"></div>
        <div class="sk-hero-text">
          <div class="sk-line sk-kicker"></div>
          <div class="sk-line sk-title"></div>
          <div class="sk-line sk-lede"></div>
        </div>
      </div>
      <div class="container">
        <div class="sk-section" v-for="n in 4" :key="n">
          <div class="sk-line sk-section-head"></div>
          <div class="sk-block"></div>
        </div>
      </div>
    </div>

    <!-- Hero -->
    <section v-if="loaded" class="page-hero">
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

    <div v-if="loaded" class="container">
      <!-- 你好，陌生人 -->
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
        <div class="letter-card">
          <span class="letter-tag" aria-hidden="true">{{ letterToTravelers.tag }}</span>
          <p class="letter-greeting">{{ letterToTravelers.greeting }}</p>
          <div class="letter-body">
            <p v-for="(p, i) in letterToTravelers.body" :key="i">{{ p }}</p>
          </div>
          <div class="letter-signoff">{{ letterToTravelers.signoff }}</div>
          <div class="letter-time">{{ letterToTravelers.time }}</div>
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
                  :class="[`lv${day.level}`, { 'cal-out': !day.inYear, 'cal-active': openDayKey === day.key }]"
                  :disabled="!day.inYear"
                  :title="day.inYear ? `${day.dateStr} · ${day.events.length} 件事` : ''"
                  @click="openDrawer(day)"
                />
              </div>
            </div>
          </div>

          <div class="cal-hint">点击任意方块，在抽屉里查看那一天的记录。</div>

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
        <FootprintMap
          :visited-provinces="visitedProvinces"
          :footprint-data="footprintData"
          :province-short="PROVINCE_SHORT"
        />
      </section>

      <!-- 写给自己 -->
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
        <div class="quote-card">
          <span class="quote-mark" aria-hidden="true">“</span>
          <blockquote>{{ selfEvaluation.quote }}</blockquote>
          <div class="by">{{ selfEvaluation.by }}</div>
        </div>
      </section>
    </div>
  </main>

  <!-- 当日事件抽屉：点击热力块弹出，右侧滑入 -->
  <transition name="drawer-fade">
    <div v-if="openDay" class="drawer-mask" @click="closeDrawer" />
  </transition>
  <transition name="drawer-slide">
    <aside v-if="openDay" class="day-drawer" role="dialog" aria-modal="true" aria-label="当日事件">
      <div class="drawer-head">
        <div class="drawer-date-wrap">
          <span class="drawer-date">{{ drawerDateStr }}</span>
          <span class="drawer-week">{{ drawerWeek }}</span>
          <span class="drawer-count">{{ drawerEvents.length ? `${drawerEvents.length} 件事` : '无记录' }}</span>
        </div>
        <div class="drawer-tools">
          <button class="drawer-nav-btn" :disabled="!canPrevDay" title="上一天" @click="shiftDay(-1)">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
          </button>
          <button class="drawer-nav-btn" :disabled="!canNextDay" title="下一天" @click="shiftDay(1)">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
          </button>
          <button class="drawer-close" title="关闭 (Esc)" @click="closeDrawer">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
      </div>
      <div class="drawer-body">
        <ul v-if="drawerEvents.length" class="drawer-list">
          <li v-for="(ev, i) in drawerEvents" :key="i" class="drawer-item">
            <span class="drawer-dot" :class="{ 'is-ring': ev.isRing }" />
            <div class="drawer-item-body">
              <div class="drawer-item-title">
                {{ ev.title }}
                <span v-if="ev.isRing" class="drawer-badge">✦ 成就</span>
              </div>
              <div class="drawer-item-desc">{{ ev.desc }}</div>
            </div>
          </li>
        </ul>
        <div v-else class="drawer-empty">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
          <p>这一天没有记录。</p>
        </div>
      </div>
    </aside>
  </transition>

  <AppFooter />
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

/* Letter to travelers */
.letter-card {
  position: relative;
  padding: 40px 48px 44px;
  background-color: var(--bg-card);
  border: 1px solid color-mix(in srgb, var(--accent) 24%, transparent);
  border-radius: var(--radius-lg);
  overflow: hidden;
}

.letter-tag {
  position: absolute;
  top: 20px;
  right: 26px;
  font-family: var(--font-mono);
  font-size: 12px;
  font-weight: 500;
  letter-spacing: 0.14em;
  color: var(--accent);
  opacity: 0.45;
}

.letter-greeting {
  position: relative;
  z-index: 1;
  font-family: var(--font-serif);
  font-size: 19px;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0 0 18px;
}

.letter-body p {
  position: relative;
  z-index: 1;
  font-size: 15.5px;
  line-height: 1.95;
  color: var(--text-secondary);
  margin: 0 0 14px;
}

.letter-body p:last-child {
  margin-bottom: 0;
}

.letter-signoff {
  position: relative;
  z-index: 1;
  margin-top: 22px;
  text-align: right;
  font-family: var(--font-mono);
  font-size: 13.5px;
  letter-spacing: 0.04em;
  color: var(--accent);
}

.letter-time {
  position: relative;
  z-index: 1;
  margin-top: 6px;
  text-align: right;
  font-family: var(--font-mono);
  font-size: 12px;
  letter-spacing: 0.05em;
  color: var(--text-tertiary);
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

/* 当日事件抽屉 */
.drawer-mask {
  position: fixed;
  inset: 0;
  background: rgba(12, 18, 14, 0.42);
  backdrop-filter: blur(2px);
  z-index: 900;
}

.drawer-fade-enter-active,
.drawer-fade-leave-active {
  transition: opacity 0.25s ease;
}

.drawer-fade-enter-from,
.drawer-fade-leave-to {
  opacity: 0;
}

.day-drawer {
  position: fixed;
  top: 0;
  right: 0;
  bottom: 0;
  width: min(420px, 92vw);
  background-color: var(--bg-card);
  border-left: 1px solid var(--border);
  box-shadow: -12px 0 40px rgba(0, 0, 0, 0.18);
  z-index: 901;
  display: flex;
  flex-direction: column;
}

.drawer-slide-enter-active,
.drawer-slide-leave-active {
  transition: transform 0.28s cubic-bezier(0.22, 1, 0.36, 1);
}

.drawer-slide-enter-from,
.drawer-slide-leave-to {
  transform: translateX(100%);
}

.drawer-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 20px 22px 16px;
  border-bottom: 1px solid var(--border-light);
}

.drawer-date-wrap {
  display: flex;
  align-items: baseline;
  gap: 10px;
  flex-wrap: wrap;
  min-width: 0;
}

.drawer-date {
  font-family: var(--font-mono);
  font-size: 17px;
  font-weight: 700;
  color: var(--text-primary);
  letter-spacing: 0.02em;
}

.drawer-week {
  font-size: 12.5px;
  color: var(--text-tertiary);
}

.drawer-count {
  font-size: 12px;
  color: var(--accent);
  background-color: var(--accent-light);
  border-radius: 100px;
  padding: 2px 10px;
  font-family: var(--font-mono);
}

.drawer-tools {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}

.drawer-nav-btn,
.drawer-close {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  border: 1px solid var(--border);
  background: transparent;
  color: var(--text-secondary);
  cursor: pointer;
  transition:
    color var(--transition),
    border-color var(--transition),
    background-color var(--transition);
}

.drawer-nav-btn svg,
.drawer-close svg {
  width: 15px;
  height: 15px;
}

.drawer-nav-btn:hover:not(:disabled),
.drawer-close:hover {
  color: var(--accent);
  border-color: color-mix(in srgb, var(--accent) 45%, transparent);
  background-color: var(--accent-light);
}

.drawer-nav-btn:disabled {
  opacity: 0.35;
  cursor: not-allowed;
}

.drawer-body {
  flex: 1;
  overflow-y: auto;
  padding: 20px 22px 26px;
}

.drawer-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.drawer-item {
  display: flex;
  gap: 12px;
  align-items: flex-start;
}

.drawer-dot {
  width: 9px;
  height: 9px;
  border-radius: 50%;
  background-color: var(--accent);
  margin-top: 7px;
  flex-shrink: 0;
}

.drawer-dot.is-ring {
  background-color: #e6a23c;
  box-shadow: 0 0 0 4px rgba(230, 162, 60, 0.18);
}

.drawer-item-body {
  min-width: 0;
}

.drawer-item-title {
  font-size: 15px;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 3px;
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.drawer-badge {
  font-size: 11px;
  font-weight: 600;
  color: #e6a23c;
  background-color: #fdf6e9;
  border: 1px solid rgba(230, 162, 60, 0.35);
  border-radius: 100px;
  padding: 1px 9px;
  white-space: nowrap;
}

[data-theme='dark'] .drawer-badge {
  background-color: #2e2718;
}

.drawer-item-desc {
  font-size: 13.5px;
  color: var(--text-secondary);
  line-height: 1.7;
}

.drawer-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 56px 0;
  color: var(--text-tertiary);
}

.drawer-empty svg {
  width: 34px;
  height: 34px;
  opacity: 0.5;
}

.drawer-empty p {
  margin: 0;
  font-size: 13.5px;
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

  .cal-grid {
    min-width: 728px;
  }

  .letter-card {
    padding: 28px 22px 32px;
  }

  .letter-card .letter-tag {
    right: 18px;
    top: 16px;
  }

  .letter-greeting {
    font-size: 17px;
  }

  .letter-body p {
    font-size: 14.5px;
    line-height: 1.85;
  }

  .quote-card {
    padding: 28px 24px;
  }

  .quote-card blockquote {
    font-size: 19px;
  }
}

/* ===== 骨架屏 ===== */
.about-skeleton {
  animation: sk-pulse 1.4s ease-in-out infinite;
}

@keyframes sk-pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.55; }
}

.sk-hero {
  max-width: 1080px;
  margin: 0 auto;
  padding: 72px 24px 56px;
  display: flex;
  align-items: center;
  gap: 40px;
  border-bottom: 1px solid var(--border-light);
}

.sk-avatar {
  width: 132px;
  height: 132px;
  border-radius: 50%;
  background: var(--bg-soft);
  flex-shrink: 0;
}

.sk-hero-text {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.sk-line {
  height: 14px;
  border-radius: 6px;
  background: var(--bg-soft);
}

.sk-kicker { width: 90px; height: 22px; }
.sk-title { width: 220px; height: 32px; }
.sk-lede { width: 360px; height: 16px; }

.sk-section {
  padding: 56px 0;
  border-bottom: 1px solid var(--border-light);
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.sk-section-head { width: 280px; height: 26px; }
.sk-block { width: 100%; height: 120px; border-radius: var(--radius-lg); background: var(--bg-soft); }
</style>
