<script setup>
/**
 * 邻居 · 前台页面（原型 prototypes/friends.html）
 * - 索引来自已通过审核的友链：GET /public/friend-links
 * - 「申请加入」提交后在后台生成一条待审核申请：POST /public/friend-applications
 * - 邻居留言：接入站内评论系统（targetType=friends 的固定留言板），
 *   发表需登录（未登录弹全局 AuthModal，与知识库/小记评论区同一套基础设施）
 * - 按工作 / 生活模式过滤（后台 mode = 0 的条目两种模式都出现）
 */
import { computed, onMounted, ref, watch } from 'vue'
import AppHeader from '@/components/AppHeader.vue'
import AppFooter from '@/components/AppFooter.vue'
import BrandMark from '@/components/BrandMark.vue'
import CommentSection from '@/components/CommentSection.vue'
import ThemeSelect from '@/components/ThemeSelect.vue'
import { useApi } from '@/composables/useApi'
import { useMode } from '@/composables/useMode'

const api = useApi()
const { isWork } = useMode()

/** 邻居留言板固定评论目标 ID（与后端 FRIENDS_BOARD_TARGET_ID 保持一致） */
const FRIENDS_BOARD_TARGET_ID = '00000000-0000-4000-8000-0000000000fd'

// ===== 数据 =====
const friends = ref([])
const loading = ref(true)
const openId = ref(null)
const filter = ref('全部')

/* 申请表单的类型下拉（ThemeSelect）选项 */
const TYPE_OPTIONS = ['技术', '设计', '阅读', '生活', '其他'].map((t) => ({ value: t, label: t }))

// ===== 站内提示 =====
const toast = ref({ show: false, message: '', type: 'success' })
function showToast(message, type = 'success') {
  toast.value = { show: true, message, type }
  setTimeout(() => { toast.value.show = false }, 3000)
}

const groups = computed(() => {
  const set = []
  friends.value.forEach((f) => {
    if (f.group && !set.includes(f.group)) set.push(f.group)
  })
  return ['全部', ...set]
})

/** 当前模式下的可见条目（后端已按模式过滤，此处仅按分组筛选） */
const visible = computed(() =>
  filter.value === '全部' ? friends.value : friends.value.filter((f) => f.group === filter.value),
)

async function loadFriends() {
  loading.value = true
  try {
    const mode = isWork.value ? 'work' : 'life'
    const res = await api.get(`/public/friend-links?mode=${mode}`)
    friends.value = Array.isArray(res) ? res : []
    if (filter.value !== '全部' && !groups.value.includes(filter.value)) filter.value = '全部'
  } catch (e) {
    console.error('[Friends] 加载邻居失败', e)
    friends.value = []
  } finally {
    loading.value = false
  }
}

// 模式切换后重新拉取（工作 / 生活的友链可能不同）
watch(isWork, loadFriends)
onMounted(() => {
  loadFriends()
})

// ===== 展开 / 收起 =====
function toggle(id) {
  openId.value = openId.value === id ? null : id
}

/** 参见：同组的近邻（不含自己） */
function neighborsOf(f) {
  return friends.value.filter(
    (x) => x.id !== f.id && x.group && x.group === f.group,
  )
}

function jumpTo(id) {
  if (filter.value !== '全部') {
    const target = friends.value.find((f) => f.id === id)
    if (target && target.group !== filter.value) filter.value = '全部'
  }
  openId.value = id
  const el = document.getElementById('friend-' + id)
  if (el) {
    el.scrollIntoView({ behavior: 'smooth', block: 'center' })
    el.classList.remove('is-flash')
    void el.offsetWidth
    el.classList.add('is-flash')
    setTimeout(() => el.classList.remove('is-flash'), 950)
  }
}

// ===== 工具 =====
function hostOf(url) {
  if (!url) return ''
  if (url.startsWith('/')) return '本站'
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return String(url).replace(/^https?:\/\//i, '').split('/')[0]
  }
}
function safeUrl(url) {
  return /^https?:\/\//i.test(String(url || '').trim()) ? String(url).trim() : '#'
}
function isInternal(url) {
  return String(url || '').startsWith('/')
}
const pad2 = (n) => String(n).padStart(2, '0')

// ===== 申请加入 =====
const modalOpen = ref(false)
const submitting = ref(false)
const submitDone = ref(false)
const errors = ref({})
const form = ref({ name: '', email: '', url: '', avatar: '', type: '', message: '' })

const RULES = {
  name: (v) => v.trim().length > 0,
  email: (v) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim()),
  url: (v) => /^https?:\/\/[^\s]+\.[^\s]+$/.test(v.trim()),
  type: (v) => v !== '',
}

function openModal() {
  modalOpen.value = true
  submitDone.value = false
  errors.value = {}
  document.body.style.overflow = 'hidden'
  setTimeout(() => document.getElementById('f-name')?.focus(), 60)
}

function closeModal() {
  modalOpen.value = false
  document.body.style.overflow = ''
  form.value = { name: '', email: '', url: '', avatar: '', type: '', message: '' }
  errors.value = {}
  submitDone.value = false
}

function validate() {
  const errs = {}
  Object.keys(RULES).forEach((k) => {
    if (!RULES[k](form.value[k] || '')) errs[k] = true
  })
  errors.value = errs
  return !Object.keys(errs).length
}

function clearError(key) {
  if (errors.value[key] && RULES[key](form.value[key] || '')) {
    const next = { ...errors.value }
    delete next[key]
    errors.value = next
  }
}

async function submitApply() {
  if (!validate()) return
  submitting.value = true
  try {
    await api.post('/public/friend-applications', {
      name: form.value.name.trim(),
      email: form.value.email.trim(),
      url: form.value.url.trim(),
      avatar: form.value.avatar.trim(),
      type: form.value.type,
      message: form.value.message.trim(),
    })
    submitDone.value = true
  } catch (e) {
    showToast(e?.message || '提交失败，请稍后再试', 'error')
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <AppHeader active-key="friends" />

  <main class="page">
    <!-- ===== 标题 ===== -->
    <section class="hero">
      <p class="hero__eyebrow">Neighbors · Friends</p>
      <h1 class="hero__title">邻居</h1>
      <p class="hero__sub">这本册子里出现过的名字。点开任意一条，看它写了什么、往哪儿去。</p>
      <div class="hero__rule" aria-hidden="true"></div>
    </section>

    <!-- ===== 索引 ===== -->
    <section class="index-wrap">
      <div class="idx-filter" role="group" aria-label="按类别筛选邻居">
        <button
          v-for="g in groups"
          :key="g"
          type="button"
          class="idx-filter__btn"
          :class="{ 'is-on': filter === g }"
          :aria-pressed="filter === g"
          @click="filter = g"
        >
          {{ g }}
        </button>
      </div>

      <div class="idx">
        <div class="idx__head">
          <h2 class="idx__title">邻居索引</h2>
          <div class="idx__actions">
            <span class="idx__count">{{ pad2(visible.length) }} 条</span>
            <button class="btn-apply" type="button" @click="openModal">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              申请加入
            </button>
          </div>
        </div>

        <ol class="idx__list">
          <li v-if="loading" class="idx-empty">加载中…</li>
          <li v-else-if="!visible.length" class="idx-empty">
            这个分组下还没有邻居，点右上角「申请加入」成为第一个。
          </li>
          <li
            v-for="(f, i) in visible"
            v-else
            :id="'friend-' + f.id"
            :key="f.id"
            class="idx-item"
            :class="{
              'idx-item--self': f.isSelf,
              'idx-item--dormant': f.status === 'dormant',
              'is-open': openId === f.id,
            }"
          >
            <button
              type="button"
              class="idx-row"
              :aria-expanded="openId === f.id"
              @click="toggle(f.id)"
            >
              <span class="idx-num">{{ pad2(friends.indexOf(f)) }}</span>
              <span class="idx-avatar">
                <img v-if="f.avatar" :src="f.avatar" :alt="''" loading="lazy" />
                <BrandMark v-else-if="f.isSelf" class="self-mark" />
                <span v-else class="idx-avatar__text">{{ (f.name || '?').trim().charAt(0) }}</span>
              </span>
              <span class="idx-name">{{ f.name }}</span>
              <span class="idx-leader" aria-hidden="true"></span>
              <span class="idx-tag">{{ f.tag || f.group || '—' }}</span>
              <svg class="idx-caret" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="6 9 12 15 18 9"/></svg>
            </button>

            <div class="idx-panel">
              <div class="idx-panel__inner">
                <p v-if="f.status === 'dormant'" class="idx-warn">
                  该站点最近无法访问，条目保留，等它回来。
                </p>
                <p class="idx-desc">{{ f.desc || '这位邻居还没有写介绍。' }}</p>
                <div class="idx-foot">
                  <a
                    class="idx-link"
                    :href="isInternal(f.url) ? f.url : safeUrl(f.url)"
                    :target="isInternal(f.url) ? '_self' : '_blank'"
                    :rel="isInternal(f.url) ? undefined : 'noopener noreferrer'"
                  >
                    <span class="dom">{{ hostOf(f.url) }}</span>
                    <span class="go">{{ f.isSelf ? '回到首页 →' : '前往 →' }}</span>
                  </a>
                  <span v-if="neighborsOf(f).length" class="idx-see">
                    参见
                    <button
                      v-for="n in neighborsOf(f)"
                      :key="n.id"
                      type="button"
                      class="see-chip"
                      @click.stop="jumpTo(n.id)"
                    >{{ n.name }}</button>
                  </span>
                </div>
              </div>
            </div>
          </li>
        </ol>
      </div>

      <p class="idx-hint">「参见」指向同一圈子里的近邻 · 灰色虚线头像表示站点暂时无法访问</p>
    </section>

    <!-- ===== 邻居留言（评论系统，登录后可留言/回复） ===== -->
    <section class="msgs">
      <p class="msgs__note">
        登录后可以在留言板留言、互相回复（回复会通过邮件通知对方）。
        申请加入的朋友通过审核后，站点会正式编进上面的索引。
      </p>

      <CommentSection
        target-type="friends"
        :target-id="FRIENDS_BOARD_TARGET_ID"
        title="邻居留言"
        empty-text="还没有留言，来说两句吧～"
      />
    </section>
  </main>

  <AppFooter />

  <!-- ===== 申请加入 · 弹窗 ===== -->
  <div
    class="modal"
    :class="{ 'is-open': modalOpen }"
    role="dialog"
    aria-modal="true"
    aria-labelledby="applyTitle"
    :aria-hidden="!modalOpen"
  >
    <div class="modal__backdrop" @mousedown="closeModal" @click="closeModal"></div>
    <div class="modal__panel">
      <div class="modal__head">
        <div>
          <h3 class="modal__title" id="applyTitle">申请加入邻居</h3>
          <p class="modal__sub">填一下，我会在几天内回复。通过后会给你编一个号。</p>
        </div>
        <button class="modal__close" type="button" aria-label="关闭" @click="closeModal">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      </div>

      <div class="modal__body" v-show="!submitDone">
        <form novalidate @submit.prevent="submitApply">
          <div class="field" :class="{ 'has-error': errors.name }">
            <label class="field__label" for="f-name">昵称<span class="req">*</span></label>
            <input id="f-name" v-model="form.name" class="field__input" type="text" maxlength="40" placeholder="站点名或你的常用称呼" autocomplete="nickname" @input="clearError('name')" />
            <p class="field__err">请填写昵称</p>
          </div>

          <div class="field" :class="{ 'has-error': errors.email }">
            <label class="field__label" for="f-email">邮箱<span class="req">*</span></label>
            <input id="f-email" v-model="form.email" class="field__input" type="email" maxlength="80" placeholder="用于接收回复，不会公开" autocomplete="email" @input="clearError('email')" />
            <p class="field__err">请填写有效的邮箱，例如 you@example.com</p>
          </div>

          <div class="field" :class="{ 'has-error': errors.url }">
            <label class="field__label" for="f-url">网址<span class="req">*</span></label>
            <input id="f-url" v-model="form.url" class="field__input" type="url" maxlength="200" placeholder="https://your-site.com" autocomplete="url" @input="clearError('url')" />
            <p class="field__err">请填写以 http:// 或 https:// 开头的网址</p>
          </div>

          <div class="field">
            <label class="field__label" for="f-avatar">头像地址<span class="opt">选填</span></label>
            <input id="f-avatar" v-model="form.avatar" class="field__input" type="url" maxlength="500" placeholder="https://your-site.com/avatar.png（留空则用昵称首字）" />
          </div>

          <div class="field" :class="{ 'has-error': errors.type }">
            <label class="field__label" for="f-type">类型<span class="req">*</span></label>
            <ThemeSelect
              v-model="form.type"
              aria-label="站点类型"
              :options="[{ value: '', label: '请选择' }, ...TYPE_OPTIONS]"
              @update:model-value="clearError('type')"
            />
            <p class="field__err">请选择一个类型</p>
          </div>

          <div class="field">
            <label class="field__label" for="f-message">留言<span class="opt">选填</span></label>
            <textarea id="f-message" v-model="form.message" class="field__textarea" maxlength="300" placeholder="简单介绍一下你的站点，或者想说点什么"></textarea>
          </div>

          <div class="modal__foot">
            <button class="btn-ghost" type="button" @click="closeModal">取消</button>
            <button class="btn-primary" type="submit" :disabled="submitting">
              {{ submitting ? '提交中…' : '提交申请' }}
            </button>
          </div>
        </form>
      </div>

      <div class="modal__done" v-show="submitDone">
        <div class="modal__done-mark">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="20 6 9 17 4 12"/></svg>
        </div>
        <h4 class="modal__done-title">收到了</h4>
        <p class="modal__done-text">我会尽快看，通过后把你的站点编进邻居索引。</p>
        <button class="btn-primary" type="button" @click="closeModal">好的</button>
      </div>
    </div>
  </div>

  <!-- Toast -->
  <transition name="toast">
    <div v-if="toast.show" class="friends-toast" :class="toast.type" role="status" aria-live="polite">
      <svg v-if="toast.type === 'success'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
        <polyline points="22 4 12 14.01 9 11.01" />
      </svg>
      <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="12" cy="12" r="10" />
        <line x1="15" y1="9" x2="9" y2="15" />
        <line x1="9" y1="9" x2="15" y2="15" />
      </svg>
      <span>{{ toast.message }}</span>
    </div>
  </transition>
</template>

<style scoped>
.page {
  max-width: 980px;
  margin: 0 auto;
  padding: 0 24px;
}

/* ===== Hero ===== */
.hero { padding: 46px 0 8px; text-align: center; }
.hero__eyebrow {
  font-family: var(--font-mono); font-size: 11.5px; letter-spacing: 0.22em;
  color: var(--accent); text-transform: uppercase; margin-bottom: 10px;
}
.hero__title {
  font-family: var(--font-serif); font-size: 40px; font-weight: 700;
  letter-spacing: 0.06em; margin-bottom: 14px;
}
.hero__sub { font-size: 15px; color: var(--text-secondary); max-width: 560px; margin: 0 auto; }
.hero__rule { width: 48px; height: 3px; border-radius: 2px; background: var(--accent); margin: 20px auto 0; }

/* ===== 筛选 + 索引 ===== */
.index-wrap { margin: 36px auto 0; max-width: 760px; }
.idx-filter { display: flex; flex-wrap: wrap; justify-content: center; gap: 8px; margin-bottom: 20px; }
.idx-filter__btn {
  font-family: var(--font-sans); font-size: 13px; cursor: pointer;
  padding: 5px 15px; border-radius: 999px;
  border: 1px solid var(--border); background: transparent; color: var(--text-secondary);
  transition: all var(--transition);
}
.idx-filter__btn:hover { border-color: var(--accent); color: var(--accent); }
.idx-filter__btn.is-on { background: var(--accent); border-color: var(--accent); color: #fff; }
[data-theme='dark'] .idx-filter__btn.is-on { color: #0f0f0f; }

.idx {
  background: var(--bg-card);
  border: 1px solid var(--border-light);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-md);
  overflow: hidden;
}
.idx__head {
  display: flex; align-items: baseline; justify-content: space-between;
  gap: 12px; padding: 16px 26px 12px;
  border-bottom: 1px solid var(--border-light);
}
.idx__title { font-family: var(--font-serif); font-size: 17px; font-weight: 700; letter-spacing: 0.04em; }
.idx__actions { display: flex; align-items: center; gap: 14px; flex-shrink: 0; }
.idx__count { font-family: var(--font-mono); font-size: 12px; color: var(--text-tertiary); }

.btn-apply {
  display: inline-flex; align-items: center; gap: 6px; cursor: pointer;
  font-family: var(--font-sans); font-size: 13px; font-weight: 500;
  padding: 7px 15px; border-radius: 999px;
  border: 1px solid var(--accent); background: var(--accent); color: #fff;
  transition: all var(--transition);
}
.btn-apply:hover {
  background: var(--accent-hover); border-color: var(--accent-hover);
  transform: translateY(-1px); box-shadow: 0 6px 16px rgba(45, 130, 100, 0.28);
}
[data-theme='dark'] .btn-apply { color: #0f0f0f; }

.idx__list { list-style: none; }
.idx-empty {
  padding: 40px 26px; text-align: center;
  color: var(--text-tertiary); font-size: 14px;
}

.idx-item { border-bottom: 1px solid var(--border-light); }
.idx-item:last-child { border-bottom: none; }

.idx-row {
  width: 100%; cursor: pointer;
  background: transparent; border: none;
  display: flex; align-items: center; gap: 14px;
  padding: 14px 26px; text-align: left;
  font-family: var(--font-sans); color: inherit;
  position: relative;
  transition: background-color var(--transition);
}
.idx-row::before {
  content: ''; position: absolute; left: 0; top: 0; bottom: 0; width: 3px;
  background: var(--accent); transform: scaleY(0); transform-origin: center;
  transition: transform var(--transition);
}
.idx-row:hover { background: var(--bg-soft); }
.idx-row:hover::before, .idx-item.is-open .idx-row::before { transform: scaleY(1); }

.idx-num {
  font-family: var(--font-mono); font-size: 12.5px; color: var(--text-tertiary);
  flex-shrink: 0; width: 26px; letter-spacing: 0.04em;
}
.idx-avatar {
  width: 44px; height: 44px; border-radius: 50%; overflow: hidden; flex-shrink: 0;
  border: 2px solid var(--accent); background: var(--bg-soft);
  display: flex; align-items: center; justify-content: center;
  transition: transform var(--transition), box-shadow var(--transition);
}
.idx-avatar img { width: 100%; height: 100%; object-fit: cover; display: block; }
.idx-avatar__text {
  font-family: var(--font-serif); font-size: 17px; font-weight: 700; color: var(--accent);
}
.idx-avatar .self-mark { --mark-size: 26px; }
.idx-row:hover .idx-avatar { transform: scale(1.06); box-shadow: 0 4px 12px rgba(45, 130, 100, 0.25); }

.idx-name {
  font-family: var(--font-serif); font-size: 17px; font-weight: 600;
  color: var(--text-primary); flex: 0 1 auto; white-space: nowrap;
  overflow: hidden; text-overflow: ellipsis;
  transition: color var(--transition);
}
.idx-row:hover .idx-name, .idx-item.is-open .idx-name { color: var(--accent); }

.idx-leader { flex: 1 1 auto; min-width: 24px; height: 0; border-bottom: 1.5px dotted var(--border); margin: 0 4px; }
.idx-tag { flex-shrink: 0; font-size: 12px; letter-spacing: 0.04em; color: var(--text-secondary); }
.idx-caret { flex-shrink: 0; color: var(--text-tertiary); transition: transform var(--transition), color var(--transition); }
.idx-item.is-open .idx-caret { transform: rotate(180deg); color: var(--accent); }

.idx-item--self .idx-avatar { background: var(--accent); border-color: var(--accent-hover); }
.idx-item--self .idx-name { color: var(--accent); }
.idx-item--dormant .idx-avatar { border-style: dashed; border-color: var(--text-tertiary); }
.idx-item--dormant .idx-avatar img { filter: grayscale(1); opacity: 0.55; }
.idx-item--dormant .idx-name { color: var(--text-tertiary); }

.idx-panel {
  max-height: 0; overflow: hidden; opacity: 0; visibility: hidden;
  transition: max-height 0.32s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.24s ease, visibility 0.32s;
}
.idx-item.is-open .idx-panel { max-height: 900px; opacity: 1; visibility: visible; }
.idx-panel__inner {
  padding: 2px 26px 20px 86px;
  border-left: 3px solid var(--accent);
  margin-left: 26px;
}
.idx-desc { font-size: 14px; line-height: 1.85; color: var(--text-secondary); margin-bottom: 12px; }
.idx-warn {
  font-size: 13px; color: var(--text-tertiary); background: var(--bg-soft);
  border-left: 3px solid var(--text-tertiary);
  padding: 7px 12px; border-radius: 0 8px 8px 0; margin-bottom: 12px;
}
.idx-foot { display: flex; align-items: center; flex-wrap: wrap; gap: 10px 18px; }
.idx-link {
  display: inline-flex; align-items: center; gap: 8px;
  font-size: 13.5px; color: var(--accent); text-decoration: none; font-weight: 500;
}
.idx-link .dom { font-family: var(--font-mono); font-size: 12.5px; }
.idx-link:hover { color: var(--accent-hover); }
.idx-link:hover .go { transform: translateX(3px); }
.idx-link .go { transition: transform var(--transition); }

.idx-see { display: inline-flex; align-items: center; flex-wrap: wrap; gap: 7px; font-size: 13px; color: var(--text-tertiary); }
.see-chip {
  cursor: pointer; font-family: var(--font-sans); font-size: 12.5px;
  padding: 3px 11px; border-radius: 999px;
  border: 1px solid var(--border); background: transparent; color: var(--text-secondary);
  transition: all var(--transition);
}
.see-chip:hover { border-color: var(--accent); color: var(--accent); background: var(--accent-light); }

.idx-hint { margin-top: 12px; text-align: center; font-size: 12.5px; color: var(--text-tertiary); }

@keyframes idx-flash {
  from { background-color: var(--accent-light); }
  to { background-color: transparent; }
}
.idx-item.is-flash > .idx-row { animation: idx-flash 0.9s ease-out; }

/* ===== 留言板（评论系统） ===== */
.msgs { margin: 30px auto 0; max-width: 820px; }
.msgs__note {
  font-size: 13px; color: var(--text-tertiary); text-align: center;
  max-width: 560px; margin: 0 auto 4px;
}

/* ===== 弹窗 ===== */
.modal {
  position: fixed; inset: 0; z-index: 200;
  display: flex; align-items: center; justify-content: center;
  padding: 24px;
  opacity: 0; visibility: hidden;
  transition: opacity 0.22s ease, visibility 0.22s ease;
}
.modal.is-open { opacity: 1; visibility: visible; }
.modal__backdrop { position: absolute; inset: 0; background: rgba(0, 0, 0, 0.45); backdrop-filter: blur(3px); }
.modal__panel {
  position: relative; z-index: 1;
  width: 100%; max-width: 460px; max-height: calc(100vh - 48px);
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: 18px;
  box-shadow: var(--shadow-lg);
  display: flex; flex-direction: column;
  transform: translateY(10px) scale(0.985);
  transition: transform 0.26s cubic-bezier(0.22, 1, 0.36, 1);
}
.modal.is-open .modal__panel { transform: translateY(0) scale(1); }
.modal__head { display: flex; align-items: flex-start; justify-content: space-between; gap: 14px; padding: 20px 22px 12px; }
.modal__title { font-family: var(--font-serif); font-size: 19px; font-weight: 700; letter-spacing: 0.04em; }
.modal__sub { font-size: 13px; color: var(--text-secondary); margin-top: 4px; }
.modal__close {
  background: transparent; border: none; cursor: pointer;
  width: 32px; height: 32px; border-radius: 50%; flex-shrink: 0;
  display: flex; align-items: center; justify-content: center; color: var(--text-tertiary);
  transition: all var(--transition);
}
.modal__close:hover { background: var(--bg-soft); color: var(--text-primary); }
.modal__body { padding: 4px 22px 20px; overflow-y: auto; }

.field { margin-bottom: 15px; }
.field__label { display: block; font-size: 13px; font-weight: 500; color: var(--text-primary); margin-bottom: 6px; }
.field__label .req { color: #b4453c; margin-left: 2px; }
.field__label .opt { color: var(--text-tertiary); font-weight: 400; margin-left: 4px; font-size: 12px; }
.field__input, .field__select, .field__textarea {
  width: 100%; font-family: var(--font-sans); font-size: 14px;
  color: var(--text-primary);
  background: var(--bg-body);
  border: 1px solid var(--border);
  border-radius: 10px;
  padding: 10px 13px;
  transition: border-color var(--transition), box-shadow var(--transition), background-color var(--transition);
}
.field__textarea { resize: vertical; min-height: 88px; line-height: 1.7; }
/* ThemeSelect 类型下拉 */
.field :deep(.tsel) { width: 100%; display: flex; }
.field :deep(.tsel__trigger) {
  width: 100%; padding: 10px 13px; font-size: 14px;
  color: var(--text-primary); background: var(--bg-body);
  border: 1px solid var(--border); border-radius: 10px;
}
.field :deep(.tsel.open .tsel__trigger) {
  border-color: var(--accent); background: var(--bg-card);
  box-shadow: 0 0 0 3px var(--accent-light);
}
.field.has-error :deep(.tsel__trigger) { border-color: #b4453c; }
.field__input:focus, .field__textarea:focus {
  outline: none; border-color: var(--accent); background: var(--bg-card);
  box-shadow: 0 0 0 3px var(--accent-light);
}
.field__err { display: none; font-size: 12px; color: #b4453c; margin-top: 5px; }
.field.has-error .field__err { display: block; }

.modal__foot { display: flex; align-items: center; justify-content: flex-end; gap: 10px; margin-top: 20px; padding-top: 16px; border-top: 1px solid var(--border-light); }
.btn-ghost, .btn-primary {
  cursor: pointer; font-family: var(--font-sans); font-size: 14px; font-weight: 500;
  padding: 9px 20px; border-radius: 999px; transition: all var(--transition);
}
.btn-ghost { background: transparent; border: 1px solid var(--border); color: var(--text-secondary); }
.btn-ghost:hover { border-color: var(--text-tertiary); color: var(--text-primary); }
.btn-primary { background: var(--accent); border: 1px solid var(--accent); color: #fff; }
.btn-primary:hover { background: var(--accent-hover); border-color: var(--accent-hover); box-shadow: 0 6px 16px rgba(45, 130, 100, 0.28); }
.btn-primary:disabled { opacity: 0.6; cursor: not-allowed; }
[data-theme='dark'] .btn-primary { color: #0f0f0f; }

.modal__done { padding: 8px 22px 24px; text-align: center; }
.modal__done-mark {
  width: 52px; height: 52px; margin: 6px auto 14px; border-radius: 50%;
  background: var(--accent-light); color: var(--accent);
  display: flex; align-items: center; justify-content: center;
}
.modal__done-title { font-family: var(--font-serif); font-size: 17px; font-weight: 700; margin-bottom: 6px; }
.modal__done-text { font-size: 13.5px; color: var(--text-secondary); margin-bottom: 18px; }

/* ===== 响应式 ===== */
@media (max-width: 900px) { .hero__title { font-size: 32px; } }
@media (max-width: 720px) {
  .page { padding: 0 18px; }
  .hero { padding-top: 36px; }
  .idx-row { padding: 13px 16px; gap: 11px; }
  .idx-leader { display: none; }
  .idx-name { font-size: 16px; white-space: normal; }
  .idx-tag { margin-left: auto; }
  .idx-panel__inner { padding: 2px 16px 18px 16px; margin-left: 16px; }
  .modal { padding: 0; align-items: flex-end; }
  .modal__panel { max-width: none; max-height: 92vh; border-radius: 18px 18px 0 0; }
}
@media (max-width: 480px) {
  .idx-num { display: none; }
  .idx-avatar { width: 38px; height: 38px; }
  .idx-panel__inner { margin-left: 0; padding-left: 14px; }
}
@media (prefers-reduced-motion: reduce) {
  .idx-panel, .idx-avatar, .idx-caret, .btn-apply, .modal, .modal__panel { transition: none; }
  .idx-item.is-flash > .idx-row { animation: none; }
}

/* ===== Toast ===== */
.friends-toast {
  position: fixed; left: 50%; bottom: 32px; transform: translateX(-50%);
  background-color: var(--accent); color: #fff;
  padding: 12px 24px; border-radius: 100px;
  font-size: 14px; box-shadow: var(--shadow-lg);
  z-index: 3000; display: inline-flex; align-items: center; gap: 8px;
  max-width: min(480px, 90vw);
}
.friends-toast svg { width: 17px; height: 17px; flex-shrink: 0; }
.friends-toast.error { background-color: #e0533d; }
.toast-enter-active, .toast-leave-active { transition: all 0.35s cubic-bezier(0.22, 1, 0.36, 1); }
.toast-enter-from, .toast-leave-to { opacity: 0; transform: translateX(-50%) translateY(20px); }
</style>
