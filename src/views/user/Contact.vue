<template>
  <div class="contact-wrap">
    <!-- 个人网站设置 -->
    <div class="card card-pad">
      <h2 class="block-title">个人网站设置</h2>
      <form @submit.prevent="updateWebsite">
        <div class="form-item">
          <label class="form-label">网站名称</label>
          <input v-model="websiteForm.name" class="input" placeholder="请输入网站名称" maxlength="50" />
        </div>
        <div class="form-item">
          <label class="form-label">网站网址</label>
          <input v-model="websiteForm.url" class="input" placeholder="https://blog.example.com" maxlength="100" />
        </div>
        <button class="btn btn-primary" :disabled="websiteLoading" type="submit">
          {{ websiteLoading ? '保存中...' : '保存网站信息' }}
        </button>
      </form>
    </div>

    <div class="contact-grid">
      <!-- 邮箱设置 -->
      <div class="card card-pad">
        <h2 class="block-title">邮箱设置</h2>
        <form @submit.prevent="updateEmail">
          <div class="form-item">
            <label class="form-label">新邮箱</label>
            <input v-model="emailForm.email" class="input" placeholder="请输入新邮箱" maxlength="50" />
          </div>
          <div class="form-item">
            <label class="form-label">验证码</label>
            <div class="input-row">
              <input v-model="emailForm.code" class="input" placeholder="6位数字验证码" maxlength="6" />
              <button type="button" class="btn" :disabled="emailSending || emailCountdown > 0" @click="sendEmailCode">
                {{ emailSending ? '发送中...' : emailCountdown > 0 ? `${emailCountdown}秒后重试` : '发送验证码' }}
              </button>
            </div>
          </div>
          <button class="btn btn-primary" :disabled="emailLoading" type="submit">
            {{ emailLoading ? '保存中...' : '修改邮箱' }}
          </button>
        </form>
      </div>

      <!-- 手机号设置 -->
      <div class="card card-pad">
        <h2 class="block-title">手机号设置</h2>
        <form @submit.prevent="updatePhone">
          <div class="form-item">
            <label class="form-label">新手机号</label>
            <input v-model="phoneForm.phone" class="input" placeholder="请输入新手机号" maxlength="11" />
          </div>
          <div class="form-item">
            <label class="form-label">验证码</label>
            <div class="input-row">
              <input v-model="phoneForm.code" class="input" placeholder="6位数字验证码" maxlength="6" />
              <button type="button" class="btn" :disabled="phoneSending || phoneCountdown > 0" @click="sendPhoneCode">
                {{ phoneSending ? '发送中...' : phoneCountdown > 0 ? `${phoneCountdown}秒后重试` : '发送验证码' }}
              </button>
            </div>
          </div>
          <button class="btn btn-primary" :disabled="phoneLoading" type="submit">
            {{ phoneLoading ? '保存中...' : '修改手机号' }}
          </button>
        </form>
      </div>
    </div>

    <!-- 安全提示 -->
    <div class="card card-pad">
      <h2 class="block-title">安全提示</h2>
      <ul class="tip-list">
        <li>🛡️ 邮箱和手机号用于账号找回和安全验证</li>
        <li>🕐 验证码有效期为 5 分钟，请及时输入</li>
        <li>⚠️ 请勿将验证码透露给他人</li>
        <li>🔒 修改联系方式后，系统会自动同步用户信息</li>
      </ul>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, onUnmounted } from 'vue'
import { useUserStore } from '@/stores/user'
import { updateUser, updateEmail, updatePhone } from '@/api/users'
import { toast } from '@/utils/toast'

const userStore = useUserStore()

const emailForm = reactive({ email: '', code: '' })
const phoneForm = reactive({ phone: '', code: '' })
const websiteForm = reactive({ name: '', url: '' })

const emailLoading = ref(false)
const phoneLoading = ref(false)
const websiteLoading = ref(false)
const emailSending = ref(false)
const phoneSending = ref(false)
const emailCountdown = ref(0)
const phoneCountdown = ref(0)

let emailTimer = null
let phoneTimer = null

function startCountdown(kind) {
  if (kind === 'email') {
    emailCountdown.value = 60
    if (emailTimer) clearInterval(emailTimer)
    emailTimer = setInterval(() => {
      if (emailCountdown.value > 0) emailCountdown.value--
      else { clearInterval(emailTimer); emailTimer = null }
    }, 1000)
  } else {
    phoneCountdown.value = 60
    if (phoneTimer) clearInterval(phoneTimer)
    phoneTimer = setInterval(() => {
      if (phoneCountdown.value > 0) phoneCountdown.value--
      else { clearInterval(phoneTimer); phoneTimer = null }
    }, 1000)
  }
}

async function sendEmailCode() {
  if (emailSending.value || emailCountdown.value > 0) return
  if (!emailForm.email) { toast.error('请输入邮箱'); return }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailForm.email)) { toast.error('请输入有效的邮箱地址'); return }
  emailSending.value = true
  try {
    await updateEmail({ email: emailForm.email })
    toast.success('验证码已发送，请查收')
    startCountdown('email')
  } catch {
    // 拦截器已提示
  } finally {
    emailSending.value = false
  }
}

async function sendPhoneCode() {
  if (phoneSending.value || phoneCountdown.value > 0) return
  if (!phoneForm.phone) { toast.error('请输入手机号'); return }
  if (!/^1[3-9]\d{9}$/.test(phoneForm.phone)) { toast.error('请输入有效的手机号'); return }
  phoneSending.value = true
  try {
    await updatePhone({ phone: phoneForm.phone })
    toast.success('验证码已发送，请查收')
    startCountdown('phone')
  } catch {
    // 拦截器已提示
  } finally {
    phoneSending.value = false
  }
}

async function updateEmailFn() {
  if (emailLoading.value) return
  if (!emailForm.email) { toast.error('请输入邮箱'); return }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailForm.email)) { toast.error('请输入有效的邮箱地址'); return }
  if (!/^\d{6}$/.test(emailForm.code)) { toast.error('请输入6位数字验证码'); return }
  emailLoading.value = true
  try {
    await updateEmail({ email: emailForm.email, code: emailForm.code })
    toast.success('邮箱修改成功')
    await userStore.checkLoginState()
    emailForm.email = ''
    emailForm.code = ''
  } catch {
    // 拦截器已提示
  } finally {
    emailLoading.value = false
  }
}

async function updatePhoneFn() {
  if (phoneLoading.value) return
  if (!phoneForm.phone) { toast.error('请输入手机号'); return }
  if (!/^1[3-9]\d{9}$/.test(phoneForm.phone)) { toast.error('请输入有效的手机号'); return }
  if (!/^\d{6}$/.test(phoneForm.code)) { toast.error('请输入6位数字验证码'); return }
  phoneLoading.value = true
  try {
    await updatePhone({ phone: phoneForm.phone, code: phoneForm.code })
    toast.success('手机号修改成功')
    await userStore.checkLoginState()
    phoneForm.phone = ''
    phoneForm.code = ''
  } catch {
    // 拦截器已提示
  } finally {
    phoneLoading.value = false
  }
}

async function updateWebsite() {
  if (websiteLoading.value) return
  if (!websiteForm.name && !websiteForm.url) { toast.error('请至少填写网站名称或网址'); return }
  if (websiteForm.url && !/^https?:\/\//.test(websiteForm.url)) { toast.error('请输入有效的网站网址'); return }
  const uid = userStore.user?.id
  if (!uid) { toast.error('用户信息获取失败，请刷新页面重试'); return }
  websiteLoading.value = true
  try {
    const currentJson = (userStore.user?.json && typeof userStore.user.json === 'object') ? { ...userStore.user.json } : {}
    const mergedJson = { ...currentJson, website: { name: websiteForm.name || '', url: websiteForm.url || '' } }
    await updateUser({ id: uid, json: mergedJson })
    toast.success('网站信息保存成功')
    await userStore.checkLoginState()
  } catch {
    // 拦截器已提示
  } finally {
    websiteLoading.value = false
  }
}

function fetchUserInfo() {
  const u = userStore.user
  if (u) {
    emailForm.email = u.email || ''
    phoneForm.phone = u.phone || ''
    if (u.json?.website) {
      websiteForm.name = u.json.website.name || ''
      websiteForm.url = u.json.website.url || ''
    }
  }
}

onMounted(fetchUserInfo)
onUnmounted(() => {
  if (emailTimer) clearInterval(emailTimer)
  if (phoneTimer) clearInterval(phoneTimer)
})
</script>

<style scoped>
.block-title {
  font-size: 16px;
  font-weight: 600;
  margin-bottom: 16px;
  padding-bottom: 12px;
  border-bottom: 1px solid var(--border-soft);
}
.contact-wrap {
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.contact-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  align-items: start;
}
.input-row {
  display: flex;
  gap: 8px;
}
.input-row .input {
  flex: 1;
}
.tip-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.tip-list li {
  font-size: 13px;
  color: var(--text-soft);
}
@media (max-width: 768px) {
  .contact-grid {
    grid-template-columns: 1fr;
  }
}
</style>
