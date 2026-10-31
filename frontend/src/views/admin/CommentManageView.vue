<script setup>
import { computed, onMounted, ref } from 'vue'
import { useApi } from '@/composables/useApi'
import ConfirmDialog from '@/components/ConfirmDialog.vue'

/**
 * 后台评论管理：知识库 / 小记评论的列表、筛选、跳转与删除。
 * 删除顶层评论会连带删除其下全部回复（后端事务保证）。
 */
const api = useApi()

const items = ref([])
const total = ref(0)
const page = ref(1)
const pageSize = ref(20)
const filter = ref('all') // all | article | note | friends
const loading = ref(false)
const toast = ref('')

const totalPages = computed(() => Math.max(1, Math.ceil(total.value / pageSize.value)))

function showToast(text) {
  toast.value = text
  setTimeout(() => (toast.value = ''), 2000)
}

async function load() {
  loading.value = true
  try {
    const params = new URLSearchParams({
      page: String(page.value),
      pageSize: String(pageSize.value),
    })
    if (filter.value !== 'all') params.set('targetType', filter.value)
    const res = await api.get(`/admin/comments?${params.toString()}`)
    items.value = res.items || []
    total.value = res.total || 0
  } catch (e) {
    console.error('加载评论失败', e)
    showToast('加载评论失败')
  } finally {
    loading.value = false
  }
}

function onFilterChange(f) {
  filter.value = f
  page.value = 1
  load()
}

function prevPage() {
  if (page.value > 1) {
    page.value--
    load()
  }
}

function nextPage() {
  if (page.value < totalPages.value) {
    page.value++
    load()
  }
}

/** 来源标题点击跳转：新窗口打开对应前台页 */
function sourceUrl(c) {
  if (!c.sourceSlug) return ''
  const base = window.location.origin + window.location.pathname
  if (c.targetType === 'article') return `${base}#/articles/${c.sourceSlug}`
  if (c.targetType === 'friends') return `${base}#/friends`
  return `${base}#/xiaoji/${c.sourceSlug}`
}

const confirmOpen = ref(false)
const pendingComment = ref(null)
const deleting = ref(false)

function removeComment(c) {
  pendingComment.value = c
  confirmOpen.value = true
}

function cancelRemove() {
  confirmOpen.value = false
  pendingComment.value = null
}

async function confirmRemove() {
  const c = pendingComment.value
  if (!c || deleting.value) return
  deleting.value = true
  try {
    await api.delete(`/admin/comments/${c.id}`)
    showToast(c.isReply ? '已删除该回复' : '已删除（含全部回复）')
    await load()
  } catch (e) {
    console.error('删除评论失败', e)
    showToast('删除失败')
  } finally {
    deleting.value = false
    confirmOpen.value = false
    pendingComment.value = null
  }
}

function fmtTime(t) {
  const d = new Date(t)
  const pad = (n) => String(n).padStart(2, '0')
  return (
    `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ` +
    `${pad(d.getHours())}:${pad(d.getMinutes())}`
  )
}

onMounted(load)
</script>

<template>
  <div class="comment-manage">
    <transition name="toast-pop">
      <div v-if="toast" class="toast" role="status" aria-live="polite">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
        <span>{{ toast }}</span>
      </div>
    </transition>

    <!-- ===== Hero ===== -->
    <section class="page-hero">
      <div class="hero-glow" aria-hidden="true"></div>
      <div class="page-hero-inner">
        <div class="hero-copy">
          <span class="kicker">Comments · 评论</span>
          <h1>评论管理</h1>
        </div>
        <p class="lede">查看并管理知识库文章、小记与邻居留言板下的评论。</p>
        <p class="hero-note">共 {{ total }} 条评论 · 点击来源标题可跳转对应前台页面</p>
      </div>
    </section>

    <!-- ===== 筛选 ===== -->
    <div class="toolbar">
      <div class="filters">
        <button
          v-for="opt in [
            { v: 'all', label: '全部' },
            { v: 'article', label: '知识库' },
            { v: 'note', label: '小记' },
            { v: 'friends', label: '邻居留言' },
          ]"
          :key="opt.v"
          class="filter-btn"
          :class="{ active: filter === opt.v }"
          @click="onFilterChange(opt.v)"
        >
          {{ opt.label }}
        </button>
      </div>
    </div>

    <!-- ===== 列表 ===== -->
    <div class="comment-list">
      <div v-if="loading" class="empty-hint">
        <span class="spinner" aria-hidden="true"></span>
        <span>加载中…</span>
      </div>
      <div v-else-if="!items.length" class="empty-hint">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
        <span>暂无评论</span>
      </div>
      <template v-else>
        <div v-for="c in items" :key="c.id" class="comment-card">
          <div class="card-head">
            <span class="type-badge" :class="c.targetType">
              {{ c.targetType === 'article' ? '知识库' : c.targetType === 'note' ? '小记' : '邻居留言' }}
            </span>
            <a
              v-if="c.sourceSlug"
              class="source-link"
              :href="sourceUrl(c)"
              target="_blank"
              rel="noopener"
              :title="`跳转到《${c.sourceTitle}》`"
            >《{{ c.sourceTitle }}》 ↗</a>
            <span v-else class="source-deleted" title="对应内容已删除">已删除</span>
            <span class="level-badge">{{ c.isReply ? '回复' : '顶层' }}</span>
            <span class="card-time">{{ fmtTime(c.createdAt) }}</span>
            <button class="delete-btn" type="button" @click="removeComment(c)">删除</button>
          </div>
          <div class="card-body">{{ c.content }}</div>
          <div class="card-foot">
            <span class="commenter">
              {{ c.nickname }}
              <span v-if="c.email" class="commenter-email">{{ c.email }}</span>
            </span>
          </div>
        </div>
      </template>
    </div>

    <!-- ===== 分页 ===== -->
    <div v-if="total > pageSize" class="pager">
      <button class="page-btn" :disabled="page <= 1" @click="prevPage">上一页</button>
      <span class="page-info">{{ page }} / {{ totalPages }}（共 {{ total }} 条）</span>
      <button class="page-btn" :disabled="page >= totalPages" @click="nextPage">下一页</button>
    </div>

    <!-- ===== 删除确认弹窗 ===== -->
    <ConfirmDialog
      :open="confirmOpen"
      title="删除评论"
      confirm-label="删除"
      :loading="deleting"
      :warn="pendingComment && !pendingComment.isReply ? '该评论为顶层评论，删除将连带删除其下全部回复，且不可恢复。' : '此操作不可恢复。'"
      @confirm="confirmRemove"
      @cancel="cancelRemove"
    />
  </div>
</template>

<style scoped>
.comment-manage {
  display: flex;
  flex-direction: column;
  gap: 22px;
}

/* ===== Toast ===== */
.toast {
  position: fixed;
  top: 18px;
  right: 22px;
  z-index: 500;
  display: flex;
  align-items: center;
  gap: 8px;
  background: #16342a;
  color: #7fd8b5;
  border: 1px solid rgba(127, 216, 181, 0.35);
  padding: 10px 16px;
  border-radius: 10px;
  font-size: 13.5px;
  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.35);
}

.toast svg {
  width: 15px;
  height: 15px;
}

.toast-pop-enter-active,
.toast-pop-leave-active {
  transition: all 0.25s ease;
}

.toast-pop-enter-from,
.toast-pop-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}

/* ===== Hero ===== */
.page-hero {
  position: relative;
  border: 1px solid var(--border-light, rgba(0, 0, 0, 0.08));
  border-radius: 18px;
  padding: 30px 30px 26px;
  background: var(--bg-card, #fff);
  overflow: hidden;
}

.hero-glow {
  position: absolute;
  top: -60px;
  right: -40px;
  width: 240px;
  height: 240px;
  border-radius: 50%;
  background: radial-gradient(circle, color-mix(in srgb, var(--accent, #2d8264) 18%, transparent), transparent 70%);
  pointer-events: none;
}

.page-hero-inner {
  position: relative;
  z-index: 1;
}

.hero-copy .kicker {
  font-family: var(--font-mono, monospace);
  font-size: 12px;
  letter-spacing: 0.12em;
  color: var(--accent, #2d8264);
}

.page-hero h1 {
  font-family: var(--font-serif, serif);
  font-size: 26px;
  margin: 8px 0 12px;
  color: var(--text-primary, #222);
}

.lede {
  font-size: 14px;
  color: var(--text-secondary, #666);
  margin: 0 0 6px;
}

.hero-note {
  font-size: 12.5px;
  color: var(--text-tertiary, #999);
  margin: 0;
}

/* ===== 筛选 ===== */
.toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  flex-wrap: wrap;
}

.filters {
  display: inline-flex;
  gap: 6px;
  background: var(--bg-card, #fff);
  border: 1px solid var(--border-light, rgba(0, 0, 0, 0.08));
  border-radius: 100px;
  padding: 4px;
}

.filter-btn {
  border: none;
  background: transparent;
  border-radius: 100px;
  padding: 7px 18px;
  font-size: 13px;
  color: var(--text-secondary, #666);
  cursor: pointer;
  transition: all 0.2s;
}

.filter-btn:hover {
  color: var(--text-primary, #222);
}

.filter-btn.active {
  background: var(--accent, #2d8264);
  color: #fff;
}

/* ===== 列表 ===== */
.comment-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.empty-hint {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  padding: 60px 0;
  color: var(--text-tertiary, #999);
  font-size: 14px;
}

.empty-hint svg {
  width: 36px;
  height: 36px;
  opacity: 0.5;
}

.spinner {
  width: 22px;
  height: 22px;
  border-radius: 50%;
  border: 2px solid var(--border-light, #ddd);
  border-top-color: var(--accent, #2d8264);
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.comment-card {
  background: var(--bg-card, #fff);
  border: 1px solid var(--border-light, rgba(0, 0, 0, 0.08));
  border-radius: 14px;
  padding: 16px 18px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  transition: box-shadow 0.2s;
}

.comment-card:hover {
  box-shadow: var(--shadow-sm, 0 4px 16px rgba(0, 0, 0, 0.06));
}

.card-head {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
  font-size: 12.5px;
}

.type-badge {
  font-family: var(--font-mono, monospace);
  font-size: 11.5px;
  padding: 2px 10px;
  border-radius: 100px;
  border: 1px solid color-mix(in srgb, var(--accent, #2d8264) 35%, transparent);
  color: var(--accent, #2d8264);
  background: color-mix(in srgb, var(--accent, #2d8264) 8%, transparent);
}

.level-badge {
  font-size: 11.5px;
  padding: 2px 10px;
  border-radius: 100px;
  border: 1px solid var(--border-light, #ddd);
  color: var(--text-tertiary, #999);
}

.source-link {
  color: var(--text-primary, #333);
  font-weight: 600;
  text-decoration: none;
}

.source-link:hover {
  color: var(--accent, #2d8264);
}

.source-deleted {
  color: var(--text-tertiary, #aaa);
  font-style: italic;
}

.card-time {
  margin-left: auto;
  font-family: var(--font-mono, monospace);
  color: var(--text-tertiary, #aaa);
  font-size: 12px;
}

.delete-btn {
  border: 1px solid rgba(229, 72, 77, 0.4);
  background: transparent;
  color: #e5484d;
  border-radius: 7px;
  padding: 3px 12px;
  font-size: 12.5px;
  cursor: pointer;
  transition: all 0.2s;
}

.delete-btn:hover {
  background: #e5484d;
  color: #fff;
}

.card-body {
  font-size: 14px;
  line-height: 1.75;
  color: var(--text-primary, #333);
  white-space: pre-wrap;
  word-break: break-word;
}

.card-foot {
  font-size: 12.5px;
  color: var(--text-secondary, #777);
  border-top: 1px dashed var(--border-light, #eee);
  padding-top: 9px;
}

.commenter-email {
  color: var(--text-tertiary, #aaa);
  font-family: var(--font-mono, monospace);
  font-size: 12px;
  margin-left: 6px;
}

/* ===== 分页 ===== */
.pager {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 14px;
  padding: 6px 0 14px;
}

.page-btn {
  border: 1px solid var(--border-light, #ddd);
  background: var(--bg-card, #fff);
  color: var(--text-secondary, #666);
  border-radius: 9px;
  padding: 7px 16px;
  font-size: 13px;
  cursor: pointer;
  transition: all 0.2s;
}

.page-btn:hover:not(:disabled) {
  border-color: var(--accent, #2d8264);
  color: var(--accent, #2d8264);
}

.page-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.page-info {
  font-size: 13px;
  color: var(--text-tertiary, #999);
  font-family: var(--font-mono, monospace);
}
</style>
