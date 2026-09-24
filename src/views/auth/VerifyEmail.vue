<template>
  <div>
    <h2 class="title">邮箱验证</h2>
    <p class="subtitle">验证注册邮箱后即可正常登录</p>

    <!-- 验证中 -->
    <div v-if="state === 'verifying'" class="result">
      <div class="loading"><span class="spinner" /> 正在验证，请稍候...</div>
    </div>

    <!-- 验证成功 -->
    <div v-else-if="state === 'success'" class="result">
      <i class="bi bi-patch-check-fill result-icon is-ok" />
      <p class="result-text">{{ message || '邮箱验证成功，请使用注册账号登录！' }}</p>
      <router-link to="/auth/login" class="btn btn-primary btn-block btn-lg">去登录</router-link>
    </div>

    <!-- 验证失败 -->
    <div v-else class="result">
      <i class="bi bi-exclamation-circle result-icon is-error" />
      <p class="result-text">{{ message || '验证链接无效或已过期' }}</p>

      <form class="auth-form" @submit.prevent="resend">
        <div class="form-item">
          <label class="form-label">注册邮箱</label>
          <input v-model="form.email" class="input" type="email" placeholder="用于接收验证邮件的邮箱" required />
        </div>
        <button class="btn btn-primary btn-block btn-lg" type="submit" :disabled="sending || countdown > 0">
          {{ sending ? '发送中...' : countdown > 0 ? `${countdown}s 后可重发` : '重新发送验证邮件' }}
        </button>
      </form>

      <div class="auth-bottom">
        已验证完成？<router-link to="/auth/login">立即登录</router-link>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { useRoute } from 'vue-router'
import { verifyEmail, sendVerifyMail } from '@/api/comm'
import { toast } from '@/utils/toast'

const route = useRoute()

const state = ref('verifying')
const message = ref('')
const sending = ref(false)
const countdown = ref(0)
let timer = null

const form = ref({
  // 支持 /auth/verify?token=xxx&email=xxx 直达；没有 token 时也允许手动补发
  email: String(route.query.email || '')
})

function startCountdown() {
  countdown.value = 60
  timer = setInterval(() => {
    countdown.value -= 1
    if (countdown.value <= 0) clearInterval(timer)
  }, 1000)
}

async function verify(token) {
  try {
    const res = await verifyEmail(token)
    state.value = 'success'
    message.value = res?.msg || ''
  } catch (error) {
    state.value = 'error'
    // 业务错误（如链接过期）由后端返回 msg，网络错误走通用提示
    message.value = error?.msg || '验证失败，请重新发送验证邮件后再试'
  }
}

async function resend() {
  if (!form.value.email) {
    toast.warning('请输入注册邮箱')
    return
  }
  sending.value = true
  try {
    const res = await sendVerifyMail(form.value.email)
    toast.success(res?.msg || '验证邮件已发送，请注意查收')
    startCountdown()
  } catch {
    /* 拦截器已提示 */
  } finally {
    sending.value = false
  }
}

onMounted(() => {
  const token = String(route.query.token || '')
  if (!token) {
    state.value = 'error'
    message.value = '缺少验证参数，可在下方重新发送验证邮件'
    return
  }
  verify(token)
})

onUnmounted(() => clearInterval(timer))
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
.result {
  text-align: center;
}
.result-icon {
  font-size: 42px;
  display: block;
  margin: 0 auto 12px;
}
.result-icon.is-ok {
  color: var(--success);
}
.result-icon.is-error {
  color: var(--warning);
}
.result-text {
  margin-bottom: 20px;
  font-size: 14px;
  color: var(--text-soft);
  line-height: 1.7;
}
.auth-bottom {
  text-align: center;
  margin-top: 16px;
  font-size: 13px;
  color: var(--text-muted);
}
</style>
