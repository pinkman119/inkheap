<script setup>
import { onMounted, ref } from 'vue'
import { useUserAuth } from '@/composables/useUserAuth'
import { useAuthModal } from '@/composables/useAuthModal'

/**
 * 评论区：知识库文章 / 小记详情页 / 邻居留言板共用。
 * - 一层盖楼：顶层评论可回复，回复不再展示回复入口（后端同层挂靠）
 * - 未登录发送时弹全局 AuthModal，草稿保留、登录成功后自动提交
 * - 无点赞、无用户自删（删除仅后台管理端）
 */
const props = defineProps({
  targetType: { type: String, required: true }, // 'article' | 'note' | 'friends'
  targetId: { type: String, required: true },
  // 区块标题（邻居留言板传「邻居留言」）
  title: { type: String, default: '评论' },
  // 空状态文案
  emptyText: { type: String, default: '还没有评论，来说两句吧～' },
})

const { isLoggedIn } = useUserAuth()
const { open: openAuthModal } = useAuthModal()

const PAGE_SIZE = 10

const items = ref([])
const total = ref(0)
const page = ref(1)
const loading = ref(false)
const loadError = ref('')

const draft = ref('')
const submitting = ref(false)
const submitError = ref('')

// 回复目标：null = 发顶层评论；否则为被回复的顶层评论对象
const replyTarget = ref(null)

const isDev =
  typeof window !== 'undefined' &&
  (window.location.port === '5173' || window.location.port === '4173')
const BASE = isDev ? 'http://localhost:3000/api' : '/api'

function formatTime(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  if (isNaN(d)) return ''
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

async function request(path, { method = 'GET', body } = {}) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    credentials: 'include',
    headers: body !== undefined ? { 'Content-Type': 'application/json' } : undefined,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    const err = new Error(data.message || '请求失败，请稍后再试')
    err.status = res.status
    throw err
  }
  return data
}

async function load(targetPage = 1) {
  loading.value = true
  loadError.value = ''
  try {
    const data = await request(
      `/public/comments?targetType=${encodeURIComponent(props.targetType)}` +
        `&targetId=${encodeURIComponent(props.targetId)}` +
        `&page=${targetPage}&pageSize=${PAGE_SIZE}`,
    )
    if (targetPage === 1) {
      items.value = data.items || []
    } else {
      items.value = [...items.value, ...(data.items || [])]
    }
    total.value = data.total || 0
    page.value = targetPage
  } catch (e) {
    loadError.value = e.message || '评论加载失败'
  } finally {
    loading.value = false
  }
}

function loadMore() {
  load(page.value + 1)
}

onMounted(() => load(1))

/* ---- 发表 ---- */

function setReply(comment) {
  replyTarget.value = comment
  submitError.value = ''
}

function cancelReply() {
  replyTarget.value = null
  submitError.value = ''
}

/** 登录成功后自动续发（AuthModal onSuccess 回调） */
async function onAuthSuccess() {
  if (draft.value.trim()) await submit()
}

async function submit() {
  const content = draft.value.trim()
  if (!content || submitting.value) {
    if (!content) submitError.value = '评论内容不能为空'
    return
  }

  // 未登录：拦截并弹登录弹窗（草稿保留）
  if (!isLoggedIn()) {
    submitError.value = ''
    openAuthModal({ onSuccess: onAuthSuccess })
    return
  }

  submitting.value = true
  submitError.value = ''
  try {
    const created = await request('/user/comments', {
      method: 'POST',
      body: {
        targetType: props.targetType,
        targetId: props.targetId,
        content,
        parentId: replyTarget.value?.id,
      },
    })

    if (replyTarget.value) {
      // 回复：本地追加到对应顶层的 replies
      replyTarget.value.replies = replyTarget.value.replies || []
      replyTarget.value.replies.push(created)
    } else {
      // 顶层：本地插到最前（列表按时间倒序）
      created.replies = []
      items.value.unshift(created)
    }
    total.value += 1
    draft.value = ''
    replyTarget.value = null
  } catch (e) {
    if (e.status === 401) {
      // 登录态失效：重新弹登录
      openAuthModal({ onSuccess: onAuthSuccess })
    } else {
      submitError.value = e.message || '评论失败，请稍后再试'
    }
  } finally {
    submitting.value = false
  }
}

function onKeydown(e) {
  if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
    e.preventDefault()
    submit()
  }
}
</script>

<template>
  <section class="comment-section">
    <div class="comment-header">
      <h2>{{ title }}</h2>
      <span v-if="total" class="comment-count">{{ total }}</span>
    </div>

    <!-- 发表框 -->
    <div class="comment-editor">
      <div v-if="replyTarget" class="reply-banner">
        <span>回复 @{{ replyTarget.author.nickname }}：</span>
        <button type="button" @click="cancelReply">取消</button>
      </div>
      <div class="editor-row">
        <textarea
          v-model="draft"
          class="editor-textarea"
          :placeholder="isLoggedIn() ? '说点什么…（Ctrl + Enter 发送）' : '登录后发表评论…'"
          maxlength="2000"
          rows="3"
          @keydown="onKeydown"
        ></textarea>
        <button class="submit-btn" type="button" :disabled="submitting" @click="submit">
          {{ submitting ? '发送中…' : '发 送' }}
        </button>
      </div>
      <p v-if="submitError" class="submit-error">{{ submitError }}</p>
    </div>

    <!-- 列表 -->
    <div v-if="loading && !items.length" class="comment-empty">评论加载中…</div>
    <div v-else-if="loadError" class="comment-empty">{{ loadError }}</div>
    <div v-else-if="!items.length" class="comment-empty">{{ emptyText }}</div>

    <template v-else>
      <div v-for="c in items" :key="c.id" class="comment-item">
        <div class="comment-avatar" aria-hidden="true">
          <img v-if="c.author.avatarUrl" :src="c.author.avatarUrl" alt="" loading="lazy" />
          <template v-else>{{ (c.author.nickname || '?').slice(0, 1) }}</template>
        </div>
        <div class="comment-body">
          <div class="comment-meta">
            <!-- 有主站的评论人昵称可跳转 -->
            <a
              v-if="c.author.homepageUrl"
              class="comment-nickname link"
              :href="c.author.homepageUrl"
              target="_blank"
              rel="noopener nofollow"
            >{{ c.author.nickname }}</a>
            <span v-else class="comment-nickname">{{ c.author.nickname }}</span>
            <span class="comment-time">{{ formatTime(c.createdAt) }}</span>
          </div>
          <p class="comment-content">{{ c.content }}</p>

          <!-- 回复入口：仅顶层评论提供（一层盖楼） -->
          <button
            v-if="isLoggedIn()"
            class="reply-btn"
            type="button"
            @click="setReply(c)"
          >回复</button>

          <!-- 二层回复（不再提供回复入口） -->
          <div v-if="c.replies && c.replies.length" class="reply-list">
            <div v-for="r in c.replies" :key="r.id" class="reply-item">
              <div class="reply-avatar" aria-hidden="true">
                <img v-if="r.author.avatarUrl" :src="r.author.avatarUrl" alt="" loading="lazy" />
                <template v-else>{{ (r.author.nickname || '?').slice(0, 1) }}</template>
              </div>
              <div class="reply-main">
              <div class="comment-meta">
                <a
                  v-if="r.author.homepageUrl"
                  class="comment-nickname link"
                  :href="r.author.homepageUrl"
                  target="_blank"
                  rel="noopener nofollow"
                >{{ r.author.nickname }}</a>
                <span v-else class="comment-nickname">{{ r.author.nickname }}</span>
                <span v-if="r.replyToNickname" class="reply-to">回复 @{{ r.replyToNickname }}</span>
                <span class="comment-time">{{ formatTime(r.createdAt) }}</span>
              </div>
              <p class="comment-content">{{ r.content }}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div v-if="items.length < total" class="comment-more">
        <button type="button" :disabled="loading" @click="loadMore">
          {{ loading ? '加载中…' : `加载更多（${items.length}/${total}）` }}
        </button>
      </div>
    </template>
  </section>
</template>

<style scoped>
.comment-section {
  max-width: 820px;
  margin: 0 auto;
  padding: 40px 0 24px;
}

.comment-header {
  display: flex;
  align-items: baseline;
  gap: 10px;
  margin-bottom: 22px;
}

.comment-header h2 {
  font-family: var(--font-serif, serif);
  font-size: 22px;
  font-weight: 600;
  color: var(--text-primary, #333);
  margin: 0;
}

.comment-count {
  font-family: var(--font-mono, monospace);
  font-size: 13px;
  color: var(--text-tertiary, #999);
}

/* ===== 发表框 ===== */
.comment-editor {
  margin-bottom: 34px;
}

.reply-banner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 13px;
  color: var(--accent, #2d8264);
  background: color-mix(in srgb, var(--accent, #2d8264) 8%, transparent);
  border-radius: 8px 8px 0 0;
  padding: 7px 12px;
}

.reply-banner button {
  border: none;
  background: transparent;
  color: var(--text-secondary, #888);
  font-size: 12.5px;
  cursor: pointer;
}

.reply-banner button:hover {
  color: #e5484d;
}

.editor-row {
  display: flex;
  gap: 10px;
  align-items: flex-end;
}

.comment-editor .reply-banner + .editor-row :deep(textarea) {
  border-radius: 0 0 8px 8px;
}

.editor-textarea {
  flex: 1;
  resize: vertical;
  min-height: 74px;
  padding: 10px 13px;
  border: 1px solid var(--border-light, #ddd);
  border-radius: 8px;
  background: var(--bg-card, #fff);
  font-size: 14px;
  font-family: inherit;
  color: var(--text-primary, #333);
  line-height: 1.7;
  transition: border-color 0.2s;
  box-sizing: border-box;
}

.editor-textarea:focus {
  outline: none;
  border-color: var(--accent, #2d8264);
}

.submit-btn {
  flex-shrink: 0;
  height: 38px;
  padding: 0 22px;
  border: none;
  border-radius: 9px;
  background: var(--accent, #2d8264);
  color: #fff;
  font-size: 14px;
  letter-spacing: 3px;
  cursor: pointer;
  transition: all 0.2s;
}

.submit-btn:hover:not(:disabled) {
  filter: brightness(1.08);
}

.submit-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.submit-error {
  margin: 8px 0 0;
  font-size: 13px;
  color: #e5484d;
}

/* ===== 列表 ===== */
.comment-empty {
  padding: 36px 0;
  text-align: center;
  font-size: 14px;
  color: var(--text-tertiary, #999);
}

.comment-item {
  display: flex;
  gap: 12px;
  padding: 18px 0;
  border-top: 1px solid var(--border-light, #eee);
}

.comment-item:first-of-type {
  border-top: none;
}

.comment-avatar {
  width: 36px;
  height: 36px;
  flex-shrink: 0;
  border-radius: 50%;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--accent, #2d8264);
  color: #fff;
  font-size: 15px;
  font-weight: 600;
}

.comment-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.comment-body {
  flex: 1;
  min-width: 0;
}

.comment-meta {
  display: flex;
  align-items: baseline;
  gap: 10px;
  flex-wrap: wrap;
}

.comment-nickname {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary, #333);
}

.comment-nickname.link {
  text-decoration: none;
}

.comment-nickname.link:hover {
  color: var(--accent, #2d8264);
}

.reply-to {
  font-size: 12.5px;
  color: var(--accent, #2d8264);
}

.comment-time {
  font-family: var(--font-mono, monospace);
  font-size: 12px;
  color: var(--text-tertiary, #aaa);
}

.comment-content {
  margin: 6px 0 4px;
  font-size: 14.5px;
  line-height: 1.75;
  color: var(--text-primary, #444);
  white-space: pre-wrap;
  word-break: break-word;
}

.reply-btn {
  border: none;
  background: transparent;
  padding: 2px 0;
  font-size: 12.5px;
  color: var(--text-secondary, #888);
  cursor: pointer;
}

.reply-btn:hover {
  color: var(--accent, #2d8264);
}

/* ===== 二层回复 ===== */
.reply-list {
  margin-top: 10px;
  padding: 4px 0 4px 14px;
  border-left: 2px solid var(--border-light, #eee);
}

.reply-item {
  display: flex;
  gap: 10px;
  padding: 8px 0;
}

.reply-avatar {
  width: 26px;
  height: 26px;
  flex-shrink: 0;
  border-radius: 50%;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--accent, #2d8264);
  color: #fff;
  font-size: 12px;
  font-weight: 600;
}

.reply-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.reply-main {
  flex: 1;
  min-width: 0;
}

.reply-item + .reply-item {
  border-top: 1px dashed var(--border-light, #eee);
}

/* ===== 加载更多 ===== */
.comment-more {
  padding-top: 18px;
  text-align: center;
}

.comment-more button {
  border: 1px solid var(--border-light, #ddd);
  background: var(--bg-card, #fff);
  color: var(--text-secondary, #666);
  border-radius: 100px;
  padding: 8px 26px;
  font-size: 13px;
  cursor: pointer;
  transition: all 0.2s;
}

.comment-more button:hover:not(:disabled) {
  border-color: var(--accent, #2d8264);
  color: var(--accent, #2d8264);
}

.comment-more button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
</style>
