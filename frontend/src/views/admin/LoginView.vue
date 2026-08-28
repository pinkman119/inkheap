<script setup>
import { ref } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAdminAuth } from '@/composables/useAdminAuth'
import { useApi } from '@/composables/useApi'
import { useTheme } from '@/composables/useTheme'
import BrandMark from '@/components/BrandMark.vue'

const router = useRouter()
const route = useRoute()
const { setAuth } = useAdminAuth()
const api = useApi()
const { isDark, toggleTheme } = useTheme()

const username = ref('')
const password = ref('')
const error = ref('')
const loading = ref(false)
const showPwd = ref(false)
const remember = ref(true)

async function handleLogin() {
  error.value = ''
  if (!username.value || !password.value) {
    error.value = '请输入用户名和密码'
    return
  }
  loading.value = true
  try {
    const data = await api.post('/admin/auth/login', {
      username: username.value,
      password: password.value,
    })
    setAuth(data.accessToken, data.user)
    const redirect = route.query.redirect || '/admin/dashboard'
    router.push(redirect)
  } catch (e) {
    error.value = e.message || '登录失败'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="login-page">
    <!-- 左侧品牌视觉区 -->
    <aside class="login-brand">
      <div class="brand-aurora"></div>
      <div class="brand-orbit orbit-a"></div>
      <div class="brand-orbit orbit-b"></div>
      <span class="orbit-dot dot-a"></span>
      <span class="orbit-dot dot-b"></span>

      <div class="brand-inner">
        <!-- Logo -->
        <div class="brand-logo">
          <BrandMark class="logo-mark" />
          <div>
            <p class="logo-title">墨堆 Admin</p>
            <p class="logo-sub">InkHeap Console</p>
          </div>
        </div>

        <!-- Slogan -->
        <div class="brand-slogan">
          <h1>会呼吸的Blog，直接与数字的我对话<br />让内容自由生长</h1>
          <p>墨堆管理后台 · 一站式撰写文章、整理小记、洞察灵感轨迹。基于墨绿设计语言打造。</p>

          <div class="brand-feats">
            <div class="feat">
              <span class="feat-ico">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14,2 14,8 20,8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" />
                </svg>
              </span>
              <div>
                <p class="feat-t">内容创作</p>
                <p class="feat-d">Markdown 流畅撰写</p>
              </div>
            </div>
            <div class="feat">
              <span class="feat-ico">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                </svg>
              </span>
              <div>
                <p class="feat-t">小记灵感</p>
                <p class="feat-d">生活杂谈随手记</p>
              </div>
            </div>
            <div class="feat">
              <span class="feat-ico">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" />
                </svg>
              </span>
              <div>
                <p class="feat-t">数据洞察</p>
                <p class="feat-d">实时运营指标</p>
              </div>
            </div>
            <div class="feat">
              <span class="feat-ico">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
                </svg>
              </span>
              <div>
                <p class="feat-t">护眼暗色</p>
                <p class="feat-d">夜观星河模式</p>
              </div>
            </div>
          </div>
        </div>

        <p class="brand-foot">© 2026 InkHeap · 管理后台 v1.0</p>
      </div>
    </aside>

    <!-- 右侧表单区 -->
    <main class="login-main">
      <button class="theme-toggle" @click="toggleTheme" :title="isDark ? '切换浅色' : '切换深色'" aria-label="切换主题">
        <svg v-if="isDark" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="5" /><line x1="12" y1="1" x2="12" y2="3" /><line x1="12" y1="21" x2="12" y2="23" /><line x1="4.22" y1="4.22" x2="5.64" y2="5.64" /><line x1="18.36" y1="18.36" x2="19.78" y2="19.78" /><line x1="1" y1="12" x2="3" y2="12" /><line x1="21" y1="12" x2="23" y2="12" /><line x1="4.22" y1="19.78" x2="5.64" y2="18.36" /><line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
        </svg>
        <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
        </svg>
      </button>

      <div class="login-card">
        <div class="card-head">
          <span class="card-dot"></span>
          <h2>欢迎回来 👋</h2>
          <p>登录以管理墨堆内容</p>
        </div>

        <div v-if="error" class="login-error">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          <span>{{ error }}</span>
        </div>

        <form class="login-form" @submit.prevent="handleLogin" novalidate>
          <div class="field">
            <label for="username">用户名</label>
            <div class="field-wrap">
              <svg class="field-ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
              </svg>
              <input id="username" v-model="username" type="text" placeholder="admin" autocomplete="username" />
            </div>
          </div>

          <div class="field">
            <div class="field-row">
              <label for="password">密码</label>
            </div>
            <div class="field-wrap">
              <svg class="field-ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
              <input id="password" v-model="password" :type="showPwd ? 'text' : 'password'" placeholder="••••••" autocomplete="current-password" />
              <button type="button" class="pwd-toggle" @click="showPwd = !showPwd" :aria-label="showPwd ? '隐藏密码' : '显示密码'">
                <svg v-if="showPwd" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" /><line x1="1" y1="1" x2="23" y2="23" />
                </svg>
                <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" />
                </svg>
              </button>
            </div>
          </div>

          <div class="field-options">
            <label class="remember">
              <input type="checkbox" v-model="remember" />
              <span>记住我</span>
            </label>
            <span class="role-tag">管理员登录</span>
          </div>

          <button type="submit" class="btn-login" :disabled="loading">
            <span v-if="loading" class="spinner"></span>
            <span>{{ loading ? '登录中…' : '登录管理后台' }}</span>
            <svg v-if="!loading" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <line x1="5" y1="12" x2="19" y2="12" /><polyline points="12,5 19,12 12,19" />
            </svg>
          </button>
        </form>

        <div class="card-foot">
          登录即表示您同意 <a href="#" @click.prevent>服务条款</a> 与 <a href="#" @click.prevent>隐私政策</a>
        </div>
      </div>
    </main>
  </div>
</template>

<style scoped>
.login-page {
  display: grid;
  grid-template-columns: 1fr 1fr;
  min-height: 100vh;
  font-family: var(--font-sans);
  background: var(--bg-body);
  color: var(--text-primary);
}

@media (max-width: 960px) {
  .login-page { grid-template-columns: 1fr; }
  .login-brand { display: none; }
}

/* ============ 左侧品牌视觉区 ============ */
.login-brand {
  position: relative;
  overflow: hidden;
  background:
    radial-gradient(circle at 20% 18%, rgba(95, 197, 154, 0.18) 0%, transparent 40%),
    radial-gradient(circle at 82% 72%, rgba(45, 130, 100, 0.22) 0%, transparent 45%),
    linear-gradient(135deg, #0e1311 0%, #16201b 50%, #0c1310 100%);
}

.brand-aurora {
  position: absolute;
  inset: -50%;
  background: conic-gradient(from 0deg at 50% 50%,
    transparent 0deg, rgba(95, 197, 154, 0.16) 60deg,
    transparent 120deg, rgba(45, 130, 100, 0.16) 200deg, transparent 280deg);
  filter: blur(60px);
  opacity: 0.8;
  animation: spin 24s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }

.brand-orbit {
  position: absolute;
  border-radius: 9999px;
  border: 1px dashed rgba(255, 255, 255, 0.10);
}
.orbit-a { width: 520px; height: 520px; left: -120px; top: 50%; transform: translateY(-50%); }
.orbit-b { width: 760px; height: 760px; left: -240px; top: 50%; transform: translateY(-50%); }

.orbit-dot {
  position: absolute;
  width: 8px;
  height: 8px;
  border-radius: 9999px;
}
.dot-a { left: 360px; top: 50%; background: #5fc59a; box-shadow: 0 0 12px rgba(95, 197, 154, 0.8); }
.dot-b { left: 500px; top: 38%; background: #2d8264; box-shadow: 0 0 12px rgba(45, 130, 100, 0.8); }

.brand-inner {
  position: relative;
  height: 100%;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  padding: 48px;
  color: #fff;
}

.brand-logo { display: flex; align-items: center; gap: 12px; }
.logo-mark {
  --mark-size: 44px;
}
.logo-title { font-size: 18px; font-weight: 700; letter-spacing: -0.01em; }
.logo-sub { font-size: 12px; color: rgba(255, 255, 255, 0.55); letter-spacing: 0.04em; }

.brand-slogan { max-width: 440px; }
.brand-slogan h1 {
  font-size: 34px;
  font-weight: 800;
  line-height: 1.25;
  letter-spacing: -0.02em;
  margin: 0;
}
.brand-slogan p {
  margin: 16px 0 0;
  font-size: 14px;
  line-height: 1.7;
  color: rgba(255, 255, 255, 0.7);
}

.brand-feats {
  margin-top: 36px;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
}
.feat { display: flex; align-items: flex-start; gap: 12px; }
.feat-ico {
  width: 36px;
  height: 36px;
  flex-shrink: 0;
  border-radius: 10px;
  display: grid;
  place-items: center;
  background: rgba(255, 255, 255, 0.08);
  backdrop-filter: blur(6px);
}
.feat-ico svg { width: 18px; height: 18px; color: #5fc59a; }
.feat-t { font-size: 14px; font-weight: 600; color: #fff; }
.feat-d { font-size: 12px; color: rgba(255, 255, 255, 0.55); margin-top: 2px; }

.brand-foot { font-size: 12px; color: rgba(255, 255, 255, 0.4); }

/* ============ 右侧表单区 ============ */
.login-main {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  background: var(--bg-body);
}

.theme-toggle {
  position: absolute;
  top: 24px;
  right: 24px;
  width: 40px;
  height: 40px;
  display: grid;
  place-items: center;
  border: 1px solid var(--border);
  background: var(--bg-card);
  color: var(--text-secondary);
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition: all var(--transition);
}
.theme-toggle:hover { background: var(--bg-soft); color: var(--text-primary); }
.theme-toggle svg { width: 20px; height: 20px; }

.login-card {
  width: 100%;
  max-width: 400px;
  padding: 40px;
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-md);
}

.card-head { margin-bottom: 28px; }
.card-dot {
  display: inline-block;
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: var(--accent);
  margin-bottom: 12px;
}
.card-head h2 { font-size: 24px; font-weight: 700; color: var(--text-primary); margin: 0; }
.card-head p { font-size: 14px; color: var(--text-tertiary); margin: 8px 0 0; }

.login-error {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 14px;
  margin-bottom: 16px;
  font-size: 13px;
  color: #e03131;
  background: #fff5f5;
  border: 1px solid #ffc9c9;
  border-radius: var(--radius-sm);
}
.login-error svg { width: 16px; height: 16px; flex-shrink: 0; }

.login-form { display: flex; flex-direction: column; gap: 18px; }

.field { display: flex; flex-direction: column; gap: 8px; }
.field label { font-size: 13px; font-weight: 600; color: var(--text-secondary); }
.field-row { display: flex; align-items: center; justify-content: space-between; }

.field-wrap { position: relative; display: flex; align-items: center; }
.field-ico {
  position: absolute;
  left: 14px;
  width: 18px;
  height: 18px;
  color: var(--text-tertiary);
  pointer-events: none;
}
.field-wrap input {
  width: 100%;
  height: 46px;
  padding: 0 44px 0 44px;
  font-size: 14px;
  color: var(--text-primary);
  background: var(--bg-body);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  outline: none;
  transition: border-color var(--transition), box-shadow var(--transition);
}
.field-wrap input::placeholder { color: var(--text-tertiary); opacity: 0.7; }
.field-wrap input:focus {
  border-color: var(--accent);
  box-shadow: 0 0 0 3px var(--accent-light);
}

.pwd-toggle {
  position: absolute;
  right: 10px;
  width: 32px;
  height: 32px;
  display: grid;
  place-items: center;
  border: none;
  background: transparent;
  color: var(--text-tertiary);
  cursor: pointer;
  border-radius: var(--radius-sm);
  transition: color var(--transition);
}
.pwd-toggle:hover { color: var(--text-primary); }
.pwd-toggle svg { width: 18px; height: 18px; }

.field-options {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.remember { display: flex; align-items: center; gap: 8px; cursor: pointer; user-select: none; }
.remember input { width: 16px; height: 16px; accent-color: var(--accent); cursor: pointer; }
.remember span { font-size: 14px; color: var(--text-secondary); }
.role-tag { font-size: 12px; color: var(--text-tertiary); }

.btn-login {
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  font-size: 15px;
  font-weight: 600;
  color: #fff;
  background: var(--accent);
  border: none;
  border-radius: var(--radius-sm);
  cursor: pointer;
  margin-top: 4px;
  transition: background var(--transition), transform 0.12s ease, box-shadow var(--transition);
}
.btn-login:hover:not(:disabled) {
  background: var(--accent-hover);
  transform: translateY(-1px);
  box-shadow: 0 10px 24px rgba(45, 130, 100, 0.28);
}
.btn-login:active:not(:disabled) { transform: translateY(0); }
.btn-login:disabled { opacity: 0.7; cursor: not-allowed; }
.btn-login svg { width: 16px; height: 16px; }

.spinner {
  width: 16px;
  height: 16px;
  border-radius: 9999px;
  border: 2px solid rgba(255, 255, 255, 0.4);
  border-top-color: #fff;
  animation: spin 0.6s linear infinite;
}

.card-foot {
  margin-top: 28px;
  padding-top: 20px;
  border-top: 1px solid var(--border);
  font-size: 12px;
  text-align: center;
  color: var(--text-tertiary);
}
.card-foot a { color: var(--accent); text-decoration: none; }
.card-foot a:hover { text-decoration: underline; }
</style>
