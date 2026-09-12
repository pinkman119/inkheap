<script setup>
import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue'
import { useApi } from '@/composables/useApi'
import ConfirmDialog from '@/components/ConfirmDialog.vue'

const api = useApi()

// ===== 格式化工具 =====
const fmt = (n) => Number(n ?? 0).toLocaleString('en-US')

function fmtTime(iso) {
  const d = new Date(iso)
  const p = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`
}

function fmtDate(iso) {
  const d = new Date(iso)
  const p = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}

function fmtRelative(iso) {
  const diff = Date.now() - new Date(iso).getTime()
  const min = Math.floor(diff / 60000)
  if (min < 1) return '刚刚'
  if (min < 60) return `${min} 分钟前`
  const h = Math.floor(min / 60)
  if (h < 24) return `${h} 小时前`
  const d = Math.floor(h / 24)
  if (d === 1) return '昨天'
  if (d < 7) return `${d} 天前`
  const w = Math.floor(d / 7)
  if (w < 5) return `${w} 周前`
  const mo = Math.floor(d / 30)
  if (mo < 12) return `${mo} 个月前`
  return `${Math.floor(d / 365)} 年前`
}

function maskOpenid(id) {
  if (!id) return '—'
  if (id.length <= 8) return `${id.slice(0, 2)}****`
  return `${id.slice(0, 6)}****${id.slice(-2)}`
}

// ===== 页面指标 + 最近文章 =====
const stats = ref({
  messages: { total: 0, unread: 0 },
  reads: { total: 0 },
  visits: { total: 0 },
  users: { total: 0 },
})
const recentArticles = ref([])
const recentTotal = ref(0)
const catNameMap = ref({})

function catName(key) {
  return catNameMap.value[key] || key
}

const recentMaxReads = computed(() =>
  Math.max(1, ...recentArticles.value.map((a) => a.viewCount || 0)),
)

async function loadStats() {
  stats.value = await api.get('/admin/dashboard/stats')
}

async function loadRecent() {
  const [articlesRes, catsRes] = await Promise.all([
    api.get('/admin/articles?pageSize=10'),
    api.get('/categories'),
  ])
  recentArticles.value = articlesRes.items || []
  recentTotal.value = articlesRes.total || 0
  const map = {}
  for (const c of Array.isArray(catsRes) ? catsRes : catsRes.items || []) {
    map[c.key] = c.name
  }
  catNameMap.value = map
}

// ===== 抽屉 =====
const drawerOpen = ref(false)
const drawerType = ref('messages')
const drawerLoading = ref(false)
const drawerCloseBtn = ref(null)

const drawerTitles = {
  messages: '用户来信',
  reads: '文章阅读排行',
  visits: '访问量趋势',
  users: '注册用户',
}
const drawerSubs = {
  messages: '来自「联系我」页面的来信',
  reads: '按阅读量从高到低排列',
  visits: '不同时间周期的访问量变化',
  users: '基于微信登录注册的账号',
}

const messages = ref({ items: [], total: 0 })
const ranking = ref({ items: [], totalArticles: 0, totalReads: 0 })
const trend = ref({ series: [], sum: 0, peak: 0 })
const trendPeriod = ref('30')
const users = ref({ items: [], total: 0 })

const rankMax = computed(() =>
  Math.max(1, ...ranking.value.items.map((a) => a.viewCount || 0)),
)

async function openDrawer(type) {
  drawerType.value = type
  drawerOpen.value = true
  lockScroll(true)
  await nextTick()
  drawerCloseBtn.value?.focus()
  await loadDrawer(type)
}

function closeDrawer() {
  drawerOpen.value = false
  lockScroll(false)
}

async function loadDrawer(type) {
  drawerLoading.value = true
  try {
    if (type === 'messages') {
      await loadMessages()
    } else if (type === 'reads') {
      ranking.value = await api.get('/admin/dashboard/article-ranking')
    } else if (type === 'visits') {
      await loadTrend(trendPeriod.value)
    } else if (type === 'users') {
      users.value = await api.get('/admin/dashboard/users')
    }
  } finally {
    drawerLoading.value = false
  }
}

async function loadMessages() {
  const res = await api.get('/admin/contact?page=1&pageSize=100')
  messages.value = { items: res.items || [], total: res.total || 0 }
}

async function toggleMsgRead(m) {
  await api.put(`/admin/contact/${m.id}/read`, { read: !m.read })
  await Promise.all([loadMessages(), loadStats()])
}

const confirmOpen = ref(false)
const pendingMsg = ref(null)
const deleting = ref(false)

function removeMsg(m) {
  pendingMsg.value = m
  confirmOpen.value = true
}

function cancelRemove() {
  confirmOpen.value = false
  pendingMsg.value = null
}

async function confirmRemove() {
  const m = pendingMsg.value
  if (!m || deleting.value) return
  deleting.value = true
  try {
    await api.delete(`/admin/contact/${m.id}`)
    await Promise.all([loadMessages(), loadStats()])
  } finally {
    deleting.value = false
    confirmOpen.value = false
    pendingMsg.value = null
  }
}

// ===== 访问趋势图表（逻辑与原型 drawLineChart 一致） =====
const chartW = 600
const chartH = 260
const padL = 46
const padR = 16
const padT = 16
const padB = 30

const chartData = computed(() => trend.value.series || [])

const chartYMax = computed(() => {
  const maxV = Math.max(0, ...chartData.value.map((d) => d.value))
  return Math.ceil(maxV / 10) * 10 || 10
})

const chartPts = computed(() => {
  const data = chartData.value
  const n = data.length
  if (!n) return []
  const innerW = chartW - padL - padR
  const innerH = chartH - padT - padB
  return data.map((d, i) => ({
    x: padL + (n === 1 ? innerW / 2 : (innerW * i) / (n - 1)),
    y: padT + innerH - (d.value / chartYMax.value) * innerH,
  }))
})

const chartGrids = computed(() => {
  const ticks = 4
  const innerH = chartH - padT - padB
  return Array.from({ length: ticks + 1 }, (_, t) => {
    const v = (chartYMax.value / ticks) * t
    return { v: Math.round(v), y: padT + innerH - (v / chartYMax.value) * innerH }
  })
})

const chartLine = computed(() =>
  chartPts.value
    .map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`)
    .join(' '),
)

const chartArea = computed(() => {
  const pts = chartPts.value
  if (!pts.length) return ''
  const last = pts[pts.length - 1]
  return `${chartLine.value} L${last.x.toFixed(1)},${chartH - padB} L${pts[0].x.toFixed(1)},${chartH - padB} Z`
})

const chartXLabels = computed(() => {
  const data = chartData.value
  const n = data.length
  if (!n) return []
  const step = Math.max(1, Math.floor(n / 6))
  const labels = []
  data.forEach((d, i) => {
    if (i % step === 0 || i === n - 1) {
      labels.push({ label: d.label, x: chartPts.value[i].x })
    }
  })
  return labels
})

async function loadTrend(period) {
  trendPeriod.value = period
  drawerLoading.value = true
  try {
    trend.value = await api.get(`/admin/dashboard/visits-trend?period=${period}`)
  } finally {
    drawerLoading.value = false
  }
}

// ===== 滚动锁定 / 键盘关闭 =====
function lockScroll(lock) {
  document.body.classList.toggle('drawer-open', lock)
  // admin 布局的滚动容器是 .admin-content，需一并锁定
  const content = document.querySelector('.admin-content')
  if (content) content.style.overflow = lock ? 'hidden' : ''
}

function onKeydown(e) {
  if (e.key === 'Escape' && drawerOpen.value) closeDrawer()
}

onMounted(async () => {
  document.addEventListener('keydown', onKeydown)
  try {
    await Promise.all([loadStats(), loadRecent()])
  } catch (e) {
    console.error('Dashboard load error:', e)
  }
})

onUnmounted(() => {
  document.removeEventListener('keydown', onKeydown)
  lockScroll(false)
})
</script>

<template>
  <main class="page">
    <section class="page-hero">
      <div class="hero-glow"></div>
      <div class="page-hero-inner">
        <span class="kicker">Dashboard · 后台</span>
        <h1>仪表盘</h1>
        <p class="lede">站点运营概览。点击下方任意指标卡片，可在右侧抽屉中查看明细。</p>
        <p class="hero-note">数据实时来自后端接口：用户来信 / 阅读量 / 访问量 / 用户量。</p>
      </div>
    </section>

    <div class="container">
      <div class="stat-grid">
        <button class="stat-card" data-type="messages" aria-haspopup="dialog" @click="openDrawer('messages')">
          <span class="stat-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path><polyline points="22,6 12,13 2,6"></polyline></svg>
          </span>
          <span class="stat-num">{{ stats.messages.total }}</span>
          <span class="stat-label">用户来信</span>
          <span class="stat-hint">点击查看来信内容
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
          </span>
        </button>

        <button class="stat-card" data-type="reads" aria-haspopup="dialog" @click="openDrawer('reads')">
          <span class="stat-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"></path><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"></path></svg>
          </span>
          <span class="stat-num">{{ fmt(stats.reads.total) }}</span>
          <span class="stat-label">总阅读量</span>
          <span class="stat-hint">点击查看文章排行
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
          </span>
        </button>

        <button class="stat-card" data-type="visits" aria-haspopup="dialog" @click="openDrawer('visits')">
          <span class="stat-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline><polyline points="17 6 23 6 23 12"></polyline></svg>
          </span>
          <span class="stat-num">{{ fmt(stats.visits.total) }}</span>
          <span class="stat-label">总访问量</span>
          <span class="stat-hint">点击查看访问趋势
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
          </span>
        </button>

        <button class="stat-card" data-type="users" aria-haspopup="dialog" @click="openDrawer('users')">
          <span class="stat-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
          </span>
          <span class="stat-num">{{ fmt(stats.users.total) }}</span>
          <span class="stat-label">总用户量</span>
          <span class="stat-hint">点击查看注册用户
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
          </span>
        </button>
      </div>

      <section class="recent-wrap">
        <div class="recent-head">
          <span class="kicker">Recent · 最近</span>
          <h2 class="recent-title">最近文章</h2>
          <span class="recent-count">共 {{ fmt(recentTotal) }} 篇</span>
        </div>
        <div class="recent-list">
          <div v-for="a in recentArticles" :key="a.id" class="recent-row">
            <div class="recent-main">
              <div class="recent-title-text">{{ a.title }}</div>
              <div class="recent-meta">
                <span class="recent-date">{{ fmtDate(a.createdAt) }}</span>·<span class="recent-cat">{{ catName(a.categoryKey) }}</span>
              </div>
            </div>
            <div class="recent-reads">
              <div class="recent-reads-num">{{ fmt(a.viewCount) }}</div>
              <div class="recent-reads-label">阅读</div>
              <div class="recent-bar"><span :style="{ width: Math.round((a.viewCount / recentMaxReads) * 100) + '%' }"></span></div>
            </div>
          </div>
          <div v-if="!recentArticles.length" class="empty-state">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14,2 14,8 20,8"></polyline></svg>
            <p>暂无文章</p>
          </div>
        </div>
      </section>
    </div>

    <!-- Drawer -->
    <div class="drawer-overlay" :class="{ open: drawerOpen }" @click="closeDrawer"></div>
    <aside
      class="drawer"
      :class="{ open: drawerOpen }"
      role="dialog"
      aria-modal="true"
      aria-labelledby="drawerTitle"
      :aria-hidden="!drawerOpen"
    >
      <div class="drawer-head">
        <div>
          <div class="drawer-title" id="drawerTitle">{{ drawerTitles[drawerType] }}</div>
          <div class="drawer-sub">{{ drawerSubs[drawerType] }}</div>
        </div>
        <button ref="drawerCloseBtn" class="drawer-close" aria-label="关闭" @click="closeDrawer">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
        </button>
      </div>
      <div class="drawer-body">
        <div v-if="drawerLoading" class="empty-state"><p>加载中…</p></div>

        <!-- 用户来信 -->
        <template v-else-if="drawerType === 'messages'">
          <div v-if="!messages.items.length" class="empty-state">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path><polyline points="22,6 12,13 2,6"></polyline></svg>
            <p>还没有收到来信</p>
            <p>去 <a href="#/contact" target="_blank" rel="noopener">联系我</a> 页面写一封试试？</p>
          </div>
          <div v-else class="msg-list">
            <div
              v-for="m in messages.items"
              :key="m.id"
              class="msg-card"
              :class="{ unread: !m.read }"
            >
              <div class="msg-top">
                <span class="msg-name">{{ m.name }}</span>
                <span class="msg-badge" :class="m.read ? 'msg-badge--read' : 'msg-badge--unread'">{{ m.read ? '已读' : '未读' }}</span>
                <span class="msg-time">{{ fmtTime(m.createdAt) }}</span>
              </div>
              <div class="msg-contact">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>
                <span>{{ m.contact || m.email || m.phone || '未留联系方式' }}</span>
              </div>
              <div class="msg-body">{{ m.message }}</div>
              <div class="msg-actions">
                <button class="msg-act" @click="toggleMsgRead(m)">{{ m.read ? '标为未读' : '标为已读' }}</button>
                <button class="msg-act msg-act--danger" @click="removeMsg(m)">删除</button>
              </div>
            </div>
          </div>
        </template>

        <!-- 文章阅读排行 -->
        <template v-else-if="drawerType === 'reads'">
          <div class="rank-list">
            <div v-for="(a, i) in ranking.items" :key="a.id" class="rank-row">
              <div class="rank-no" :class="{ top: i < 3 }">{{ i + 1 }}</div>
              <div class="rank-main">
                <div class="rank-title">{{ a.title }}</div>
                <div class="rank-bar"><span :style="{ width: Math.round((a.viewCount / rankMax) * 100) + '%' }"></span></div>
              </div>
              <div class="rank-val">{{ fmt(a.viewCount) }}</div>
            </div>
          </div>
          <p class="drawer-caption">共 {{ fmt(ranking.totalArticles) }} 篇文章，累计阅读 {{ fmt(ranking.totalReads) }} 次。</p>
        </template>

        <!-- 访问量趋势 -->
        <template v-else-if="drawerType === 'visits'">
          <div class="chart-summary">
            <div class="cs-block"><span class="cs-num">{{ fmt(trend.sum) }}</span><span class="cs-label">区间总访问</span></div>
            <div class="cs-block"><span class="cs-num">{{ fmt(trend.peak) }}</span><span class="cs-label">单点峰值</span></div>
          </div>
          <div class="chart-filter">
            <button
              v-for="p in ['7', '30', '90', 'all']"
              :key="p"
              class="filter-btn"
              :class="{ active: trendPeriod === p }"
              @click="loadTrend(p)"
            >{{ { 7: '近 7 天', 30: '近 30 天', 90: '近 90 天', all: '全部' }[p] }}</button>
          </div>
          <div class="chart-wrap">
            <svg :viewBox="`0 0 ${chartW} ${chartH}`" role="img" aria-label="访问量折线图">
              <defs>
                <linearGradient id="visitArea" x1="0" y1="0" x2="0" y2="1">
                  <stop class="chart-grad-top" offset="0%"/>
                  <stop class="chart-grad-bot" offset="100%"/>
                </linearGradient>
              </defs>
              <template v-for="g in chartGrids" :key="g.v">
                <line class="chart-grid" :x1="padL" :y1="g.y" :x2="chartW - padR" :y2="g.y"/>
                <text class="chart-axis-text" :x="padL - 8" :y="g.y + 4" text-anchor="end">{{ g.v }}</text>
              </template>
              <path fill="url(#visitArea)" :d="chartArea"/>
              <path class="chart-line" :d="chartLine"/>
              <circle v-for="(p, i) in chartPts" :key="'d' + i" class="chart-dot" :cx="p.x.toFixed(1)" :cy="p.y.toFixed(1)" r="2.6"/>
              <text
                v-for="(l, i) in chartXLabels"
                :key="'x' + i"
                class="chart-axis-text"
                :x="l.x.toFixed(1)"
                :y="chartH - 10"
                text-anchor="middle"
              >{{ l.label }}</text>
            </svg>
          </div>
        </template>

        <!-- 注册用户 -->
        <template v-else-if="drawerType === 'users'">
          <div class="user-list">
            <div v-for="u in users.items" :key="u.id" class="user-row">
              <div class="user-avatar">{{ (u.nickname || '微').charAt(0) }}</div>
              <div class="user-main">
                <div class="user-name">{{ u.nickname }}</div>
                <div class="user-meta">微信 {{ maskOpenid(u.openid) }} · 注册 {{ fmtDate(u.createdAt) }}</div>
              </div>
              <div class="user-val">活跃 {{ fmtRelative(u.lastActiveAt) }}<br><b>{{ fmt(u.messageCount) }}</b> 条消息</div>
            </div>
          </div>
          <p class="drawer-caption">共 {{ fmt(users.total) }} 位微信访客（按注册时间倒序）。</p>
        </template>
      </div>
    </aside>
  </main>

  <!-- ===== 删除确认弹窗 ===== -->
  <ConfirmDialog
    :open="confirmOpen"
    title="删除来信"
    confirm-label="删除"
    :loading="deleting"
    warn="此操作不可恢复。"
    @cancel="cancelRemove"
    @confirm="confirmRemove"
  >
    确定要删除这封来信吗？
  </ConfirmDialog>
</template>

<style scoped>
/* ===== Page hero ===== */
.page { flex: 1; }
.container { max-width: 1120px; margin: 0 auto; padding: 0 24px; }

.page-hero {
  position: relative; overflow: hidden;
  padding: 56px 24px 8px;
  border-bottom: 1px solid var(--border-light);
}
.hero-glow {
  position: absolute; top: -80px; right: -60px;
  width: 440px; height: 440px; border-radius: 50%;
  background: radial-gradient(circle, rgba(45, 130, 100, 0.14), transparent 65%);
  filter: blur(48px); pointer-events: none;
}
[data-theme='dark'] .hero-glow { background: radial-gradient(circle, rgba(95, 197, 154, 0.13), transparent 65%); }
.page-hero-inner { position: relative; z-index: 1; max-width: 1120px; margin: 0 auto; }
.kicker {
  display: inline-block; font-family: var(--font-mono); font-size: 12.5px; font-weight: 500;
  letter-spacing: 0.14em; text-transform: uppercase; color: var(--accent);
  padding: 4px 12px; border: 1px solid color-mix(in srgb, var(--accent) 35%, transparent);
  border-radius: 100px; background-color: var(--accent-light); margin-bottom: 16px;
}
.page-hero h1 {
  font-family: var(--font-serif); font-size: 40px; font-weight: 700;
  color: var(--text-primary); letter-spacing: 0.02em; margin-bottom: 10px;
}
.page-hero .lede { font-size: 15.5px; color: var(--text-secondary); max-width: 680px; }
.hero-note { font-size: 12.5px; color: var(--text-tertiary); margin-top: 8px; font-family: var(--font-mono); }

/* ===== Stat grid ===== */
.stat-grid {
  display: grid; grid-template-columns: repeat(4, 1fr); gap: 20px;
  padding: 32px 0 12px;
}
.stat-card {
  background: var(--bg-card); border: 1px solid var(--border);
  border-radius: var(--radius-md); padding: 22px; cursor: pointer;
  transition: transform var(--transition), box-shadow var(--transition), border-color var(--transition);
  display: flex; flex-direction: column; gap: 14px; position: relative; overflow: hidden;
  text-align: left; font-family: inherit;
}
.stat-card:hover { transform: translateY(-3px); box-shadow: var(--shadow-md); border-color: color-mix(in srgb, var(--accent) 40%, transparent); }
.stat-card:focus-visible { outline: 2px solid var(--accent); outline-offset: 3px; }
.stat-icon {
  width: 42px; height: 42px; border-radius: 12px;
  background: var(--accent-light); color: var(--accent);
  display: flex; align-items: center; justify-content: center;
}
.stat-icon svg { width: 22px; height: 22px; }
.stat-num { font-family: var(--font-mono); font-size: 30px; font-weight: 500; color: var(--text-primary); line-height: 1; }
.stat-label { font-size: 14px; color: var(--text-secondary); }
.stat-hint { font-size: 12.5px; color: var(--text-tertiary); display: inline-flex; align-items: center; gap: 5px; }
.stat-hint svg { width: 13px; height: 13px; }

/* ===== Drawer ===== */
.drawer-overlay {
  position: fixed; inset: 0; background: rgba(0, 0, 0, 0.45);
  opacity: 0; visibility: hidden; transition: opacity 0.3s ease, visibility 0.3s ease; z-index: 300;
}
.drawer-overlay.open { opacity: 1; visibility: visible; }
.drawer {
  position: fixed; top: 0; right: 0; height: 100%;
  width: 500px; max-width: 94vw; background: var(--bg-card);
  box-shadow: var(--shadow-lg); transform: translateX(100%);
  transition: transform 0.38s cubic-bezier(0.22, 1, 0.36, 1); z-index: 301;
  display: flex; flex-direction: column;
}
.drawer.open { transform: translateX(0); }
.drawer-head {
  display: flex; align-items: center; justify-content: space-between;
  padding: 20px 24px; border-bottom: 1px solid var(--border-light); flex-shrink: 0;
}
.drawer-title { font-family: var(--font-serif); font-size: 20px; font-weight: 600; color: var(--text-primary); }
.drawer-sub { font-size: 12.5px; color: var(--text-tertiary); font-family: var(--font-mono); margin-top: 2px; }
.drawer-close {
  width: 36px; height: 36px; border-radius: 50%; border: 1px solid var(--border);
  background: transparent; color: var(--text-secondary); cursor: pointer;
  display: flex; align-items: center; justify-content: center; transition: all var(--transition);
}
.drawer-close:hover { border-color: var(--accent); color: var(--accent); background: var(--accent-light); }
.drawer-body { padding: 22px 24px; overflow-y: auto; flex: 1; }

/* ===== Message list ===== */
.msg-list { display: flex; flex-direction: column; gap: 14px; }
.msg-card {
  background-color: var(--bg-card); border: 1px solid var(--border);
  border-radius: var(--radius-md); padding: 18px 20px;
  transition: border-color var(--transition), box-shadow var(--transition);
}
.msg-card:hover { box-shadow: var(--shadow-md); }
.msg-card.unread { border-left: 3px solid var(--accent); }
.msg-top { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; margin-bottom: 6px; }
.msg-name { font-family: var(--font-serif); font-size: 17px; font-weight: 600; color: var(--text-primary); }
.msg-badge { font-family: var(--font-mono); font-size: 11px; font-weight: 500; letter-spacing: 0.06em; padding: 2px 9px; border-radius: 100px; }
.msg-badge--unread { background-color: var(--accent); color: #fff; }
[data-theme='dark'] .msg-badge--unread { color: #0f0f0f; }
.msg-badge--read { background-color: var(--border); color: var(--text-tertiary); }
.msg-time { font-family: var(--font-mono); font-size: 12px; color: var(--text-tertiary); margin-left: auto; }
.msg-contact { font-size: 13px; color: var(--text-secondary); margin-bottom: 10px; display: inline-flex; align-items: center; gap: 6px; }
.msg-contact svg { width: 14px; height: 14px; color: var(--accent); }
.msg-body {
  font-family: var(--font-serif); font-size: 15.5px; line-height: 1.9; color: var(--text-primary);
  white-space: pre-wrap; word-break: break-word;
  padding: 11px 15px; background-color: var(--bg-soft);
  border-radius: var(--radius-sm); border: 1px solid var(--border-light);
}
.msg-actions { display: flex; gap: 8px; margin-top: 12px; flex-wrap: wrap; }
.msg-act {
  font-family: var(--font-sans); font-size: 13px; font-weight: 500;
  padding: 6px 14px; border-radius: 100px; cursor: pointer;
  border: 1px solid var(--border); background: transparent; color: var(--text-secondary);
  transition: all var(--transition);
}
.msg-act:hover { border-color: var(--accent); color: var(--accent); background-color: var(--accent-light); }
.msg-act--danger:hover { border-color: #e0533d; color: #e0533d; background-color: #fbeee9; }
[data-theme='dark'] .msg-act--danger:hover { background-color: #3a1f1a; }

/* ===== Reads ranking ===== */
.rank-list { display: flex; flex-direction: column; gap: 16px; }
.rank-row { display: flex; align-items: center; gap: 14px; }
.rank-no { font-family: var(--font-mono); font-size: 15px; font-weight: 600; color: var(--text-tertiary); width: 24px; text-align: center; flex-shrink: 0; }
.rank-no.top { color: var(--accent); }
.rank-main { flex: 1; min-width: 0; }
.rank-title { font-size: 15px; color: var(--text-primary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.rank-bar { height: 6px; border-radius: 100px; background: var(--bg-soft); margin-top: 7px; overflow: hidden; }
.rank-bar > span { display: block; height: 100%; background: linear-gradient(90deg, var(--accent), #3fae86); border-radius: 100px; }
.rank-val { font-family: var(--font-mono); font-size: 14px; color: var(--accent); font-weight: 500; white-space: nowrap; flex-shrink: 0; }

/* ===== Users list ===== */
.user-list { display: flex; flex-direction: column; }
.user-row { display: flex; align-items: center; gap: 14px; padding: 14px 0; border-bottom: 1px solid var(--border-light); }
.user-row:last-child { border-bottom: none; }
.user-avatar {
  width: 40px; height: 40px; border-radius: 50%; background: var(--accent); color: #fff;
  display: flex; align-items: center; justify-content: center; font-family: var(--font-serif);
  font-weight: 600; font-size: 17px; flex-shrink: 0;
}
[data-theme='dark'] .user-avatar { color: #0f0f0f; }
.user-main { flex: 1; min-width: 0; }
.user-name { font-size: 15px; color: var(--text-primary); font-weight: 500; }
.user-meta { font-size: 12.5px; color: var(--text-tertiary); font-family: var(--font-mono); margin-top: 2px; }
.user-val { font-family: var(--font-mono); font-size: 12.5px; color: var(--text-secondary); text-align: right; white-space: nowrap; flex-shrink: 0; }
.user-val b { color: var(--accent); font-weight: 500; }

/* ===== Chart ===== */
.chart-summary { display: flex; gap: 28px; margin-bottom: 16px; }
.cs-block { display: flex; flex-direction: column; }
.cs-num { font-family: var(--font-mono); font-size: 24px; color: var(--accent); line-height: 1.1; }
.cs-label { font-size: 12.5px; color: var(--text-tertiary); }
.chart-filter { display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 14px; }
.filter-btn {
  font-family: var(--font-sans); font-size: 13px; font-weight: 500;
  padding: 6px 15px; border-radius: 100px; cursor: pointer;
  border: 1px solid var(--border); background-color: var(--bg-card);
  color: var(--text-secondary); transition: all var(--transition);
}
.filter-btn:hover { border-color: var(--accent); color: var(--accent); }
.filter-btn.active { background-color: var(--accent); border-color: var(--accent); color: #fff; }
[data-theme='dark'] .filter-btn.active { color: #0f0f0f; }
.chart-wrap {
  background: var(--bg-soft); border: 1px solid var(--border-light);
  border-radius: var(--radius-sm); padding: 16px;
}
.chart-wrap svg { width: 100%; height: auto; display: block; }
.chart-grid { stroke: var(--border); stroke-width: 1; stroke-dasharray: 3 4; }
.chart-axis-text { fill: var(--text-tertiary); font-family: var(--font-mono); font-size: 10px; }
.chart-line { fill: none; stroke: var(--accent); stroke-width: 2; stroke-linejoin: round; stroke-linecap: round; }
.chart-dot { fill: var(--accent); }
.chart-grad-top { stop-color: var(--accent); stop-opacity: 0.28; }
.chart-grad-bot { stop-color: var(--accent); stop-opacity: 0; }

/* ===== Recent articles ===== */
.recent-wrap { padding: 8px 0 12px; }
.recent-head {
  display: flex; align-items: baseline; gap: 14px; flex-wrap: wrap;
  padding: 26px 0 4px; margin-top: 14px; margin-bottom: 16px;
  border-top: 1px solid var(--border-light);
}
.recent-title {
  font-family: var(--font-serif); font-size: 24px; font-weight: 700;
  color: var(--text-primary); letter-spacing: 0.02em; line-height: 1;
}
.recent-count { font-family: var(--font-mono); font-size: 12.5px; color: var(--text-tertiary); }
.recent-list { display: flex; flex-direction: column; }
.recent-row {
  display: flex; align-items: center; gap: 18px; padding: 16px 18px;
  background: var(--bg-card); border: 1px solid var(--border);
  border-radius: var(--radius-md);
  transition: transform var(--transition), box-shadow var(--transition), border-color var(--transition);
}
.recent-row + .recent-row { margin-top: 12px; }
.recent-row:hover {
  transform: translateY(-2px); box-shadow: var(--shadow-md);
  border-color: color-mix(in srgb, var(--accent) 40%, transparent);
}
.recent-main { flex: 1; min-width: 0; }
.recent-title-text {
  font-family: var(--font-serif); font-size: 16.5px; font-weight: 600;
  color: var(--text-primary); line-height: 1.45;
}
.recent-meta {
  display: flex; align-items: center; gap: 10px; margin-top: 6px;
  font-family: var(--font-mono); font-size: 12.5px; color: var(--text-tertiary);
}
.recent-cat {
  font-family: var(--font-sans); font-size: 11.5px; font-weight: 500; color: var(--accent);
  padding: 1px 9px; border-radius: 100px; background-color: var(--accent-light);
  border: 1px solid color-mix(in srgb, var(--accent) 22%, transparent);
}
.recent-reads { text-align: right; flex-shrink: 0; min-width: 116px; }
.recent-reads-num { font-family: var(--font-mono); font-size: 16px; color: var(--accent); font-weight: 500; line-height: 1.1; }
.recent-reads-label { font-size: 11px; color: var(--text-tertiary); margin-top: 1px; }
.recent-bar { height: 4px; border-radius: 100px; background: var(--bg-soft); margin-top: 7px; overflow: hidden; }
.recent-bar > span { display: block; height: 100%; background: linear-gradient(90deg, var(--accent), #3fae86); border-radius: 100px; }

.empty-state { text-align: center; padding: 60px 20px; color: var(--text-tertiary); }
.empty-state svg { width: 50px; height: 50px; color: var(--accent); opacity: 0.5; margin-bottom: 14px; }
.empty-state p { font-size: 14.5px; }
.empty-state a { color: var(--accent); text-decoration: none; font-weight: 500; }
.empty-state a:hover { text-decoration: underline; }
.drawer-caption { font-size: 12.5px; color: var(--text-tertiary); margin-top: 16px; line-height: 1.7; }

/* ===== Responsive ===== */
@media (max-width: 900px) {
  .stat-grid { grid-template-columns: repeat(2, 1fr); }
}
@media (max-width: 768px) {
  .page-hero { padding: 40px 16px 6px; }
  .page-hero h1 { font-size: 32px; }
  .container { padding: 0 16px; }
  .stat-grid { gap: 14px; padding: 24px 0 8px; }
}
@media (max-width: 520px) {
  .stat-grid { grid-template-columns: 1fr; }
  .drawer { width: 100%; }
  .recent-row { gap: 12px; padding: 14px; }
  .recent-reads { min-width: 92px; }
  .recent-title-text { font-size: 15px; }
}
</style>
