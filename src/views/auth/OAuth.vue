<template>
  <!--
    第三方登录回调页（/auth/oauth）
    第三方带 code/state 跳回来，这里校验 state 后把 code 交给后端换登录态：
      - 已绑定 → 直接登录（收尾同密码登录：持久化 token + 用户信息）
      - 未绑定 + 后台允许自动注册 → 后端建号并登录
      - 未绑定 + 不允许自动注册 → 记下票据，引导先登录（登录成功后自动绑定）
      - 已登录状态下发起 → 直接绑定到当前账号
  -->
  <div class="oauth-callback">
    <!-- 处理中 -->
    <template v-if="status === 'loading'">
      <div class="oauth-loading">
        <span class="spinner" />
        <p class="oauth-text">正在登录，请稍候…</p>
      </div>
    </template>

    <!-- 注册成功但需要人工审核（后端不发 token） -->
    <template v-else-if="status === 'audit'">
      <div class="oauth-icon is-info"><i class="bi bi-hourglass-split" /></div>
      <h3 class="oauth-title">注册成功</h3>
      <p class="oauth-text">账号正在审核中，管理员审核通过后即可使用{{ platformName }}登录。</p>
      <div class="oauth-actions">
        <router-link class="btn btn-primary btn-block" to="/auth/login">去登录</router-link>
        <router-link class="btn btn-block" to="/">返回首页</router-link>
      </div>
    </template>

    <!-- 失败 -->
    <template v-else>
      <div class="oauth-icon is-error"><i class="bi bi-exclamation-triangle" /></div>
      <h3 class="oauth-title">登录失败</h3>
      <p class="oauth-text">{{ message }}</p>
      <div class="oauth-actions">
        <router-link class="btn btn-primary btn-block" to="/auth/login">返回登录</router-link>
        <router-link class="btn btn-block" to="/">返回首页</router-link>
      </div>
    </template>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { oauthSignIn } from '@/api/oauth'
import { useUserStore } from '@/stores/user'
import { toast } from '@/utils/toast'
import { finishPendingBind, saveBindTicket, takeCallbackContext } from '@/utils/oauth'

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()

// loading / audit / error
const status = ref('loading')
const message = ref('')
const platformCode = ref('')

const nameMap = { qq: 'QQ', github: 'GitHub', gitee: 'Gitee' }
const platformName = computed(() => nameMap[platformCode.value] || '第三方账号')

function fail(text) {
  status.value = 'error'
  message.value = text
}

// 登录 / 注册成功后的统一收尾（与密码登录一致）
function afterSignIn(data, context) {
  const validTime = Number(data.valid_time) > 0 ? Number(data.valid_time) : 15 * 24 * 60 * 60
  if (data.token) {
    userStore.persistToken(data.token, validTime)
  }
  userStore.setUser(data.user, validTime)
  // 用 check-token 的权威结构刷新用户信息（确保 result.auth 等字段完整）
  userStore.checkLoginState()
  toast.success(data.register ? '注册成功，已自动登录' : '登录成功')
  router.replace(context.redirect || '/')
}

async function handle(code, state, context) {
  try {
    const res = await oauthSignIn(context.platform, code, state)
    const data = res?.data || {}

    // 1) 登录 / 注册成功：后端下发了 token
    if (data.token && data.user) {
      afterSignIn(data, context)
      return
    }

    // 2) 建号成功但需要人工审核：不发 token
    if (data.need_audit) {
      status.value = 'audit'
      return
    }

    // 3) 未登录且未绑定：记下票据，引导先登录，登录成功后自动绑定
    if (data.need_bind) {
      saveBindTicket(data.ticket)
      toast.info('该第三方账号还未绑定本站账号，登录后将自动完成绑定')
      router.replace({ path: '/auth/login', query: context.redirect && context.redirect !== '/' ? { redirect: context.redirect } : {} })
      return
    }

    // 4) 已登录状态下发起的绑定
    if (data.bind) {
      await finishPendingBind()
      toast.success('绑定成功')
      router.replace('/user/security')
      return
    }

    fail('第三方登录失败，请重新发起登录')
  } catch (e) {
    // 错误提示已在拦截器里给过，这里在页面上再保留一份原因（整页流程，toast 会消失）
    fail(e?.msg || '第三方登录失败，请稍后重试')
  }
}

onMounted(() => {
  // 带走并清空发起时记录的信息（刷新页面后由于 state 已焚，会给出「请重新发起」的提示）
  const context = takeCallbackContext()
  const platform = String(route.query.platform || context.platform || '')
  platformCode.value = platform

  const code = String(route.query.code || '')
  const state = String(route.query.state || '')
  const error = String(route.query.error || '')

  if (error) {
    fail(error === 'access_denied' ? '你取消了授权，或第三方平台拒绝了本次请求' : `第三方平台返回错误：${error}`)
    return
  }
  if (!code) {
    fail('未获取到授权码，请重新发起登录')
    return
  }
  if (!platform) {
    fail('登录会话已过期（未找到发起平台），请重新发起登录')
    return
  }
  if (context.state && state && state !== context.state) {
    fail('state 校验未通过，为保障账号安全已中止本次登录，请重新发起')
    return
  }

  handle(code, state, { ...context, platform })
})
</script>

<style scoped>
.oauth-callback {
  text-align: center;
  padding: 6px 0 4px;
}
.oauth-loading {
  padding: 12px 0 8px;
}
.oauth-loading .spinner {
  margin: 0 auto 14px;
}
.oauth-icon {
  font-size: 34px;
  line-height: 1;
  margin-bottom: 12px;
  color: var(--text-light);
}
.oauth-icon.is-error {
  color: var(--danger);
}
.oauth-icon.is-info {
  color: var(--primary);
}
.oauth-title {
  font-family: var(--font-serif);
  font-size: 19px;
  font-weight: 600;
  margin-bottom: 8px;
}
.oauth-text {
  font-size: 13px;
  line-height: 1.7;
  color: var(--text-muted);
  margin: 0 auto 20px;
  max-width: 300px;
}
.oauth-actions {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
</style>
