<template>
  <div>
    <h2 class="title">加入我们</h2>
    <p class="subtitle">注册账号，开启你的创作之旅</p>

    <!-- 注册结果需要后续确认：邮箱验证 / 人工审核 -->
    <div v-if="notice" class="notice">
      <i :class="notice.type === 'verify' ? 'bi bi-envelope-check' : 'bi bi-hourglass-split'" class="notice-icon" />
      <p class="notice-text">{{ notice.message }}</p>
      <p v-if="notice.type === 'verify' && notice.email" class="notice-email">
        <template v-if="notice.mailError">
          验证邮件发送失败：{{ notice.mailError }}，可稍后点击下方按钮重发。
        </template>
        <template v-else>
          验证邮件已发送至 <strong>{{ notice.email }}</strong>，请点击邮件中的链接完成验证。
        </template>
      </p>
      <button
        v-if="notice.type === 'verify'"
        type="button"
        class="btn btn-block"
        :disabled="resending || countdown > 0"
        @click="resendVerifyMail"
      >
        {{ resending ? '发送中...' : countdown > 0 ? `${countdown}s 后可重发` : '重新发送验证邮件' }}
      </button>
      <router-link to="/auth/login" class="btn btn-primary btn-block btn-lg notice-action">去登录</router-link>
    </div>

    <form v-else class="auth-form" @submit.prevent="handleRegister">
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

      <AuthAgreement v-model="agreed" ref="agreeRef" required />

      <button class="btn btn-primary btn-block btn-lg register-btn" :disabled="loading" type="submit">
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
import { register, registerSendCode, sendVerifyMail } from '@/api/comm'
import { useUserStore } from '@/stores/user'
import { toast } from '@/utils/toast'
import AuthAgreement from '@/components/AuthAgreement.vue'

const router = useRouter()
const userStore = useUserStore()

const form = ref({
  social: '',
  code: '',
  password: '',
  password2: ''
})

const loading = ref(false)
const sending = ref(false)
const countdown = ref(0)
let timer = null

const agreed = ref(false)
const agreeRef = ref(null)

// 注册结果需要后续确认时的提示（后台开启「Email 验证」或「人工审核」才会出现）
const notice = ref(null)
const resending = ref(false)

async function resendVerifyMail() {
  const email = notice.value?.email || form.value.social
  if (!email) return
  resending.value = true
  try {
    const res = await sendVerifyMail(email)
    toast.success(res?.msg || '验证邮件已发送，请注意查收')
    countdown.value = 60
    timer = setInterval(() => {
      countdown.value -= 1
      if (countdown.value <= 0) clearInterval(timer)
    }, 1000)
  } catch {
    /* 拦截器已提示 */
  } finally {
    resending.value = false
  }
}

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
  if (agreeRef.value && !agreeRef.value.validate()) {
    toast.warning('请先阅读并同意用户协议和隐私政策')
    return
  }
  loading.value = true
  try {
    const res = await register(form.value.social, form.value.code, form.value.password)
    if (res.code === 200) {
      const data = res.data || {}

      // 后台开启「Email 验证」：账号已创建但需要邮件确认，不发登录态
      if (data.need_verify) {
        notice.value = {
          type: 'verify',
          email: data.email || form.value.social,
          message: res.msg || '注册成功，请前往邮箱完成验证后登录！',
          mailError: data.mail_error || ''
        }
        return
      }

      // 后台开启「人工审核」：账号进入待审核，管理员通过后才能登录
      if (data.need_audit) {
        notice.value = {
          type: 'audit',
          message: res.msg || '注册成功，请等待管理员审核通过后再登录！'
        }
        return
      }

      const validTime = Number(data.valid_time) > 0 ? Number(data.valid_time) : 15 * 24 * 60 * 60
      if (data.token) {
        userStore.persistToken(data.token, validTime)
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

/* 注册后的确认提示（邮箱验证 / 人工审核） */
.notice {
  text-align: center;
}
.notice-icon {
  display: block;
  margin: 0 auto 12px;
  font-size: 42px;
  color: var(--primary);
}
.notice-text {
  margin-bottom: 10px;
  font-size: 14px;
  line-height: 1.7;
  color: var(--text-soft);
}
.notice-email {
  margin-bottom: 18px;
  font-size: 13px;
  line-height: 1.7;
  color: var(--text-muted);
}
.notice-action {
  margin-top: 10px;
}

</style>