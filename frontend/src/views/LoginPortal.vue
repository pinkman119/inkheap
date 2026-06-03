<template>
  <div class="auth-shell">
    <div class="auth-hero">
      <div class="auth-hero__badge">PersonaFlow Console</div>
      <h1>唤醒你的知识星图</h1>
      <p>
        使用工作台统一编排文章、日记与个人档案，以更果敢的节奏管理你的成长故事。
        登录后即可继续创作与发布。
      </p>
    </div>

    <div class="auth-panel">
      <div class="auth-panel__header">
        <h2>欢迎回来</h2>
        <p>输入凭证登录管理后台</p>
      </div>

      <form class="auth-form" @submit.prevent="handleSubmit">
        <label>
          <span>用户名</span>
          <input
            v-model.trim="username"
            type="text"
            autocomplete="username"
            placeholder="例如：admin"
            required
          />
        </label>

        <label>
          <span>密码</span>
          <div class="input-password">
            <input
              v-model="password"
              :type="showPassword ? 'text' : 'password'"
              autocomplete="current-password"
              placeholder="请输入密码"
              required
            />
            <button type="button" @click="togglePassword" aria-label="切换密码可见性">
              {{ showPassword ? '🙈' : '👁' }}
            </button>
          </div>
        </label>

        <button class="auth-submit" type="submit" :disabled="submitting">
          <span v-if="!submitting">登录工作台</span>
          <span v-else>正在验证...</span>
        </button>

        <p v-if="errorMessage" class="auth-error">{{ errorMessage }}</p>
      </form>

      <footer class="auth-panel__footer">
        <span>默认账号：admin / admin123</span>
        <RouterLink to="/" class="link">返回首页</RouterLink>
      </footer>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { login } from '@/services/authService';
import { useAuthStore } from '@/stores/auth';

const route = useRoute();
const router = useRouter();
const authStore = useAuthStore();

const username = ref('');
const password = ref('');
const submitting = ref(false);
const errorMessage = ref('');
const showPassword = ref(false);

const redirect = computed(() => (route.query.redirect as string) || '/');

if (!authStore.ready) {
  authStore.initialize();
}

const togglePassword = () => {
  showPassword.value = !showPassword.value;
};

const handleSubmit = async () => {
  if (submitting.value) return;
  submitting.value = true;
  errorMessage.value = '';
  try {
    const response = await login({ username: username.value, password: password.value });
    authStore.setSession({
      token: response.accessToken,
      tokenType: response.tokenType,
      username: response.username,
      roles: response.roles,
      expiresIn: response.expiresIn
    });
    await router.replace(redirect.value);
  } catch (error) {
    console.error('[login] failed', error);
    errorMessage.value = '登录失败，请检查用户名和密码';
  } finally {
    submitting.value = false;
  }
};
</script>

<style scoped>
.auth-shell {
  min-height: 100vh;
  display: grid;
  grid-template-columns: minmax(320px, 1fr) minmax(360px, 440px);
  background: radial-gradient(circle at top right, rgba(92, 100, 255, 0.12), transparent 62%),
    radial-gradient(circle at bottom left, rgba(255, 166, 123, 0.18), transparent 58%),
    #f6f7ff;
  padding: clamp(2rem, 4vw, 4rem) clamp(2rem, 6vw, 6rem);
  gap: clamp(2rem, 6vw, 5rem);
  align-items: center;
}

.auth-hero {
  color: #1f2144;
  max-width: 560px;
}

.auth-hero__badge {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.35rem 0.8rem;
  border-radius: 999px;
  background: rgba(76, 93, 240, 0.16);
  color: #4c5df0;
  font-size: 0.75rem;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.auth-hero h1 {
  font-family: 'Space Grotesk', sans-serif;
  font-size: clamp(2.4rem, 5vw, 3rem);
  margin: 1.5rem 0 1rem;
  letter-spacing: -0.02em;
}

.auth-hero p {
  font-size: 1rem;
  line-height: 1.7;
  margin: 0;
  color: rgba(31, 33, 68, 0.74);
}

.auth-panel {
  background: rgba(255, 255, 255, 0.88);
  border-radius: 1.75rem;
  padding: clamp(2rem, 4vw, 2.6rem);
  box-shadow: 0 28px 56px rgba(55, 66, 160, 0.18);
  backdrop-filter: blur(22px);
  display: flex;
  flex-direction: column;
  gap: 1.75rem;
}

.auth-panel__header h2 {
  margin: 0;
  font-size: 1.75rem;
}

.auth-panel__header p {
  margin: 0.35rem 0 0;
  color: rgba(44, 48, 80, 0.66);
}

.auth-form {
  display: flex;
  flex-direction: column;
  gap: 1.1rem;
}

.auth-form label {
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
  font-weight: 600;
  color: rgba(32, 34, 54, 0.8);
}

.auth-form input {
  border: 1px solid rgba(68, 74, 120, 0.16);
  border-radius: 0.9rem;
  padding: 0.75rem 0.9rem;
  font-size: 0.95rem;
  background: rgba(255, 255, 255, 0.9);
  transition: border-color 150ms ease, box-shadow 150ms ease;
}

.auth-form input:focus {
  border-color: rgba(76, 93, 240, 0.65);
  outline: none;
  box-shadow: 0 0 0 3px rgba(76, 93, 240, 0.12);
}

.input-password {
  position: relative;
  display: flex;
  align-items: center;
}

.input-password input {
  flex: 1;
  padding-right: 3rem;
}

.input-password button {
  position: absolute;
  right: 0.6rem;
  border: none;
  background: transparent;
  cursor: pointer;
  font-size: 1.1rem;
  line-height: 1;
  opacity: 0.7;
  transition: opacity 0.2s ease;
}

.input-password button:hover {
  opacity: 1;
}

.auth-submit {
  margin-top: 0.5rem;
  border: none;
  border-radius: 0.95rem;
  padding: 0.85rem 1rem;
  font-weight: 700;
  color: white;
  font-size: 1rem;
  cursor: pointer;
  background: linear-gradient(140deg, #4c5df0, #8363ff 52%, #ff9f6e);
  box-shadow: 0 18px 38px rgba(80, 89, 220, 0.25);
  transition: transform 180ms ease, box-shadow 180ms ease, filter 180ms ease;
}

.auth-submit:disabled {
  cursor: wait;
  filter: grayscale(0.2);
  box-shadow: none;
}

.auth-submit:not(:disabled):hover {
  transform: translateY(-1px);
  box-shadow: 0 22px 46px rgba(80, 89, 220, 0.35);
}

.auth-error {
  margin: 0;
  font-size: 0.9rem;
  color: #d64545;
  background: rgba(214, 69, 69, 0.12);
  padding: 0.6rem 0.9rem;
  border-radius: 0.75rem;
}

.auth-panel__footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  color: rgba(32, 34, 54, 0.6);
  font-size: 0.85rem;
}

.auth-panel__footer .link {
  color: #4c5df0;
  font-weight: 600;
  text-decoration: none;
}

@media (max-width: 860px) {
  .auth-shell {
    grid-template-columns: minmax(0, 1fr);
    justify-items: center;
    align-items: flex-start;
  }

  .auth-hero {
    display: none;
  }

  .auth-panel {
    width: min(420px, 100%);
  }
}
</style>
