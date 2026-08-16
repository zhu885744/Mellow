<template>
  <div>
    <h2 class="title">加入我们 ✨</h2>
    <p class="subtitle">注册账号，开启你的创作之旅</p>

    <form class="auth-form" @submit.prevent="handleRegister">
      <div class="form-item">
        <label class="form-label">邮箱 / 手机号 *</label>
        <input
          v-model="form.social"
          class="input"
          required
          placeholder="用于接收验证码"
        />
      </div>

      <div class="form-item">
        <label class="form-label">验证码 *</label>
        <div class="code-row">
          <input v-model="form.code" class="input" required maxlength="6" />
          <button
            type="button"
            class="btn"
            :disabled="sending || countdown > 0"
            @click="sendCode"
          >
            {{ countdown > 0 ? `${countdown}s 后重试` : '发送验证码' }}
          </button>
        </div>
      </div>

      <div class="form-item">
        <label class="form-label">账号（可选）</label>
        <input v-model="form.account" class="input" />
      </div>

      <div class="form-item">
        <label class="form-label">昵称（可选）</label>
        <input v-model="form.nickname" class="input" />
      </div>

      <div class="form-item">
        <label class="form-label">密码 *</label>
        <input
          v-model="form.password"
          class="input"
          type="password"
          required
          minlength="6"
          autocomplete="new-password"
        />
      </div>

      <div class="form-item">
        <label class="form-label">确认密码 *</label>
        <input
          v-model="form.password2"
          class="input"
          type="password"
          required
        />
        <p v-if="form.password2 && form.password !== form.password2" class="form-error">
          两次密码不一致
        </p>
      </div>

      <button class="btn btn-primary btn-block btn-lg" :disabled="loading" type="submit">
        {{ loading ? '注册中...' : '注 册' }}
      </button>
    </form>

    <div class="auth-bottom">
      已有账号？<router-link to="/auth/login">立即登录</router-link>
    </div>
  </div>
</template>

<script setup>
import { ref, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { register, registerSendCode } from '@/api/comm'
import { useUserStore } from '@/stores/user'
import { toast } from '@/utils/toast'
import { setCookie } from '@/utils/cookie'

const TOKEN_NAME = 'INIS_LOGIN_TOKEN'

const router = useRouter()
const userStore = useUserStore()

const form = ref({
  social: '',
  code: '',
  account: '',
  nickname: '',
  password: '',
  password2: ''
})

const loading = ref(false)
const sending = ref(false)
const countdown = ref(0)
let timer = null

async function sendCode() {
  if (!form.value.social) {
    toast.warning('请输入邮箱或手机号')
    return
  }
  sending.value = true
  try {
    await registerSendCode(form.value.social)
    toast.success('验证码已发送，请注意查收')
    countdown.value = 60
    timer = setInterval(() => {
      countdown.value -= 1
      if (countdown.value <= 0) clearInterval(timer)
    }, 1000)
  } catch {} finally {
    sending.value = false
  }
}

async function handleRegister() {
  if (!form.value.password || form.value.password.length < 6) {
    toast.warning('密码至少 6 位')
    return
  }
  if (form.value.password !== form.value.password2) {
    toast.warning('两次密码不一致')
    return
  }
  loading.value = true
  try {
    const res = await register(form.value.social, form.value.code, form.value.password, form.value.account, form.value.nickname)
    if (res.code === 200) {
      const data = res.data || {}
      const validTime = Number(data.valid_time) > 0 ? Number(data.valid_time) : 15 * 24 * 60 * 60
      if (data.token) {
        setCookie(TOKEN_NAME, data.token, validTime)
      }
      userStore.setUser(data.user, validTime)
      toast.success('注册成功，已自动登录')
      router.replace('/')
    }
  } catch {} finally {
    loading.value = false
  }
}

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
.code-row {
  display: flex;
  gap: 8px;
}
.code-row .input {
  flex: 1;
}
.auth-bottom {
  text-align: center;
  margin-top: 16px;
  font-size: 13px;
  color: var(--text-muted);
}
</style>