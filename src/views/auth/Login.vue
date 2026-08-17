<template>
  <div>
    <h2 class="title">欢迎回来！</h2>
    <p class="subtitle">登录以访问更多功能</p>

    <form class="auth-form" @submit.prevent="handleLogin">
      <div class="form-item">
        <label class="form-label">账号 / 邮箱 / 手机号</label>
        <input
          v-model="account"
          class="input"
          type="text"
          autocomplete="username"
          required
          placeholder="请输入账号"
        />
      </div>

      <div class="form-item">
        <label class="form-label">密码</label>
        <input
          v-model="password"
          class="input"
          type="password"
          autocomplete="current-password"
          required
          placeholder="请输入密码"
        />
      </div>

      <div class="form-actions">
        <router-link to="/auth/forgot" class="link">忘记密码？</router-link>
      </div>

      <button class="btn btn-primary btn-block btn-lg" :disabled="loading" type="submit">
        {{ loading ? '登录中...' : '登 录' }}
      </button>

      <AuthAgreement />
    </form>

    <div class="auth-bottom">
      还没有账号？<router-link to="/auth/register">立即注册</router-link>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { login } from '@/api/comm'
import { useUserStore } from '@/stores/user'
import { toast } from '@/utils/toast'
import AuthAgreement from '@/components/AuthAgreement.vue'

const account = ref('')
const password = ref('')
const loading = ref(false)

const userStore = useUserStore()
const router = useRouter()
const route = useRoute()

async function handleLogin() {
  if (!account.value || !password.value) {
    toast.warning('请输入账号和密码')
    return
  }
  loading.value = true
  try {
    const res = await login(account.value, password.value)
    if (res.code === 200 || res.code === 201) {
      const data = res.data || {}
      const validTime = Number(data.valid_time) > 0 ? Number(data.valid_time) : 15 * 24 * 60 * 60
      // 关键：持久化 token（cookie + localStorage），后续请求拦截器注入 Authorization 才能通过鉴权
      if (data.token) {
        userStore.persistToken(data.token, validTime)
      }
      userStore.setUser(data.user, validTime)
      // 用 check-token 的权威结构刷新用户信息（确保 result.auth 等字段完整）
      userStore.checkLoginState()
      toast.success('登录成功')
      const redirect = route.query.redirect || '/'
      router.replace(redirect)
    }
  } catch (e) {
    // toast 已显示
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.title {
  text-align: center;
  font-family: var(--font-serif);
  font-size: 22px;
  margin-bottom: 8px;
}
.subtitle {
  text-align: center;
  font-size: 13px;
  color: var(--text-muted);
  margin-bottom: 24px;
}
.auth-form {
  margin-bottom: 16px;
}
.form-actions {
  display: flex;
  justify-content: flex-end;
  margin: -8px 0 16px;
}
.link {
  font-size: 12px;
  color: var(--text-muted);
}
.link:hover {
  color: var(--primary);
}
.auth-bottom {
  text-align: center;
  margin-top: 24px;
  font-size: 13px;
  color: var(--text-muted);
}
</style>