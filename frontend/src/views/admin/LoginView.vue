<script setup>
import { ref } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAdminAuth } from '@/composables/useAdminAuth'
import { useApi } from '@/composables/useApi'

const router = useRouter()
const route = useRoute()
const { setAuth } = useAdminAuth()
const api = useApi()

const username = ref('')
const password = ref('')
const error = ref('')
const loading = ref(false)

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
    <div class="login-card">
      <div class="login-header">
        <span class="login-dot"></span>
        <h1>墨堆 Admin</h1>
      </div>
      <p class="login-sub">登录以管理内容</p>

      <div v-if="error" class="login-error">{{ error }}</div>

      <form class="login-form" @submit.prevent="handleLogin">
        <div class="field">
          <label>用户名</label>
          <input v-model="username" type="text" placeholder="admin" autocomplete="username" />
        </div>
        <div class="field">
          <label>密码</label>
          <input v-model="password" type="password" placeholder="••••••" autocomplete="current-password" />
        </div>
        <button type="submit" class="btn-login" :disabled="loading">
          {{ loading ? '登录中...' : '登录' }}
        </button>
      </form>
    </div>
  </div>
</template>

<style scoped>
.login-page {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  background: var(--bg-body);
  font-family: var(--font-sans);
}

.login-card {
  width: 380px;
  padding: 40px;
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-md);
}

.login-header {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  margin-bottom: 4px;
}

.login-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: var(--accent);
}

.login-header h1 {
  font-size: 22px;
  font-weight: 700;
  color: var(--text-primary);
  margin: 0;
}

.login-sub {
  text-align: center;
  font-size: 14px;
  color: var(--text-tertiary);
  margin: 0 0 24px;
}

.login-error {
  padding: 10px 14px;
  margin-bottom: 16px;
  font-size: 13px;
  color: #e03131;
  background: #fff5f5;
  border: 1px solid #ffc9c9;
  border-radius: var(--radius-sm);
}

.login-form {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.field label {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-secondary);
}

.field input {
  height: 40px;
  padding: 0 12px;
  font-size: 14px;
  color: var(--text-primary);
  background: var(--bg-body);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  outline: none;
  transition: border-color var(--transition);
}

.field input:focus {
  border-color: var(--accent);
  box-shadow: 0 0 0 3px var(--accent-light);
}

.btn-login {
  height: 44px;
  font-size: 15px;
  font-weight: 600;
  color: #fff;
  background: var(--accent);
  border: none;
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition: background var(--transition);
  margin-top: 4px;
}

.btn-login:hover:not(:disabled) { background: var(--accent-hover); }
.btn-login:disabled { opacity: 0.6; cursor: not-allowed; }
</style>
