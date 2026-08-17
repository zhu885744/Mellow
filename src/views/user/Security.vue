<template>
  <div class="security-wrap">
    <!-- 账号设置 -->
    <div class="card card-pad">
      <h2 class="block-title">账号设置</h2>
      <div class="form-item">
        <label class="form-label">当前账号</label>
        <div class="input-row">
          <input class="input" :value="currentAccount" disabled />
          <button class="btn" :disabled="accountLoading" @click="toggleAccountEdit">
            {{ showAccountEdit ? '取消' : '修改' }}
          </button>
        </div>
      </div>

      <div v-if="showAccountEdit" class="edit-box">
        <p class="warn-tip"><i class="bi bi-exclamation-triangle" /> 修改账号后将影响登录，请谨慎操作</p>
        <div class="form-item">
          <label class="form-label">新账号</label>
          <input
            v-model="accountForm.newAccount"
            class="input"
            placeholder="请输入新账号（字母、数字、下划线，4-20位）"
            maxlength="20"
            @input="validateNewAccount"
          />
          <p v-if="accountErrors.newAccount" class="form-error">{{ accountErrors.newAccount }}</p>
        </div>
        <div class="btn-row">
          <button class="btn btn-danger" :disabled="accountLoading" @click="handleAccountSubmit">
            {{ accountLoading ? '修改中...' : '确认修改账号' }}
          </button>
          <button class="btn" :disabled="accountLoading" @click="cancelAccountEdit">取消</button>
        </div>
      </div>
    </div>

    <!-- 重置密码 -->
    <div class="card card-pad">
      <h2 class="block-title">重置密码</h2>
      <form @submit.prevent="handleResetPasswordSubmit">
        <div class="form-item">
          <label class="form-label">邮箱 / 手机号</label>
          <input
            v-model="resetForm.contact"
            class="input"
            placeholder="请输入您的邮箱或手机号"
            @input="validateContact"
          />
          <p v-if="errors.contact" class="form-error">{{ errors.contact }}</p>
        </div>

        <div class="form-item">
          <label class="form-label">验证码</label>
          <div class="input-row">
            <input v-model="resetForm.code" class="input" placeholder="请输入验证码" @input="validateCode" />
            <button type="button" class="btn" :disabled="countdown > 0 || sendCodeLoading" @click="sendCode">
              {{ countdown > 0 ? `${countdown}秒后重试` : '获取验证码' }}
            </button>
          </div>
          <p v-if="errors.code" class="form-error">{{ errors.code }}</p>
        </div>

        <div class="form-item">
          <label class="form-label">新密码</label>
          <input
            type="password"
            v-model="resetForm.password"
            class="input"
            placeholder="请输入新密码"
            minlength="6"
            maxlength="20"
            @input="validatePassword"
          />
          <p v-if="errors.password" class="form-error">{{ errors.password }}</p>
        </div>

        <div class="form-item">
          <label class="form-label">确认新密码</label>
          <input
            type="password"
            v-model="resetForm.verifyPwd"
            class="input"
            placeholder="请再次输入新密码"
            @input="validateVerifyPwd"
          />
          <p v-if="errors.verifyPwd" class="form-error">{{ errors.verifyPwd }}</p>
        </div>

        <div v-if="resetForm.password" class="form-item">
          <div class="pwd-strength">
            <div class="strength-head">
              <span class="text-muted">密码强度</span>
              <span :class="['strength-text', passwordStrengthClass]">{{ passwordStrengthText }}</span>
            </div>
            <div class="strength-bar">
              <div class="strength-fill" :class="passwordStrengthClass" :style="{ width: passwordStrengthWidth }"></div>
            </div>
          </div>
        </div>

        <button class="btn btn-primary" :disabled="resetLoading" type="submit">
          {{ resetLoading ? '重置中...' : '重置密码' }}
        </button>
      </form>
    </div>

    <!-- 安全提示 -->
    <div class="card card-pad">
      <h2 class="block-title">安全提示</h2>
      <ul class="tip-list">
        <li><i class="bi bi-shield-check" /> 建议使用字母、数字和特殊字符组合的密码</li>
        <li><i class="bi bi-clock" /> 定期更换密码，建议每 3 个月更换一次</li>
        <li><i class="bi bi-exclamation-triangle" /> 不要在多个网站使用相同的密码</li>
        <li><i class="bi bi-lock" /> 不要将密码告诉他人，包括网站客服</li>
      </ul>
    </div>

    <!-- 账号注销 -->
    <div class="card card-pad">
      <h2 class="block-title danger-title">账号注销</h2>
      <p class="danger-tip">注销账号后，您的所有数据将被永久删除且无法恢复。</p>
      <button class="btn btn-danger" @click="openDestroy">注销我的账号</button>
    </div>
  </div>

  <!-- 注销账户确认弹层 -->
  <div v-if="destroyVisible" class="modal-mask" @click.self="closeDestroy">
    <div class="modal-box">
      <div class="modal-title">
        <i class="bi bi-exclamation-triangle" /> 注销账户确认
      </div>
      <p class="modal-warn">
        此操作将<strong>永久删除</strong>你的账号及所有数据，且不可恢复。请先通过验证码与密码完成身份验证。
      </p>

      <div class="field">
        <label>验证码</label>
        <div class="code-row">
          <input
            v-model.trim="destroyForm.code"
            class="input"
            type="text"
            placeholder="请输入验证码"
            :disabled="destroyLoading"
          />
          <button
            class="btn btn-sm btn-ghost"
            :disabled="destroyLoading || codeCountdown > 0"
            @click="sendDestroyCode"
          >
            {{ codeCountdown > 0 ? codeCountdown + 's' : '获取验证码' }}
          </button>
        </div>
        <span class="field-hint">验证码将发送至你绑定的手机或邮箱</span>
      </div>

      <div class="field">
        <label>当前密码</label>
        <input
          v-model.trim="destroyForm.password"
          class="input"
          type="password"
          placeholder="请输入当前登录密码"
          :disabled="destroyLoading"
        />
        <span class="field-hint">为防止他人盗用验证码操作，需二次验证密码</span>
      </div>

      <div class="field">
        <label>注销原因（选填）</label>
        <textarea
          v-model.trim="destroyForm.source"
          class="input"
          rows="2"
          placeholder="可填写注销原因，默认 default"
          :disabled="destroyLoading"
        ></textarea>
      </div>

      <p v-if="destroyError" class="form-error">
        <i class="bi bi-x-circle" /> {{ destroyError }}
      </p>

      <div class="modal-actions">
        <button class="btn btn-sm btn-ghost" :disabled="destroyLoading" @click="closeDestroy">
          取消
        </button>
        <button class="btn btn-sm btn-danger" :disabled="destroyLoading" @click="submitDestroy">
          <span v-if="destroyLoading" class="spinner" />
          {{ destroyLoading ? '注销中...' : '确认注销' }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '@/stores/user'
import { updateUser, destroy, destroySendCode } from '@/api/users'
import { resetPasswordSendCode, resetPassword } from '@/api/comm'
import { toast } from '@/utils/toast'

const userStore = useUserStore()
const router = useRouter()

const CONST = {
  ACCOUNT_MIN: 4,
  ACCOUNT_MAX: 20,
  PWD_MIN: 6,
  CODE_COOLDOWN: 60
}

// ===== 账号修改 =====
const accountLoading = ref(false)
const showAccountEdit = ref(false)
const currentAccount = ref('')
const accountForm = reactive({ newAccount: '' })
const accountErrors = reactive({ newAccount: '' })

function validateNewAccount() {
  const val = accountForm.newAccount.trim()
  if (!val) { accountErrors.newAccount = '请输入新账号'; return false }
  if (val.length < CONST.ACCOUNT_MIN) { accountErrors.newAccount = `账号长度不能少于${CONST.ACCOUNT_MIN}位`; return false }
  if (val.length > CONST.ACCOUNT_MAX) { accountErrors.newAccount = `账号长度不能超过${CONST.ACCOUNT_MAX}位`; return false }
  if (!/^[a-zA-Z0-9_]+$/.test(val)) { accountErrors.newAccount = '账号只能包含字母、数字和下划线'; return false }
  if (val === currentAccount.value) { accountErrors.newAccount = '新账号不能与当前账号相同'; return false }
  accountErrors.newAccount = ''
  return true
}

function toggleAccountEdit() {
  showAccountEdit.value = !showAccountEdit.value
  if (!showAccountEdit.value) resetAccountForm()
}
function cancelAccountEdit() {
  showAccountEdit.value = false
  resetAccountForm()
}
function resetAccountForm() {
  accountForm.newAccount = ''
  accountErrors.newAccount = ''
}

async function handleAccountSubmit() {
  if (!validateNewAccount()) return
  accountLoading.value = true
  try {
    const uid = userStore.user?.id
    if (!uid) { toast.error('用户信息获取失败，请刷新页面重试'); return }
    await updateUser({ id: uid, account: accountForm.newAccount.trim() })
    toast.success('账号修改成功')
    await userStore.checkLoginState()
    showAccountEdit.value = false
    resetAccountForm()
    currentAccount.value = userStore.user?.account || ''
  } catch {
    // 拦截器已提示
  } finally {
    accountLoading.value = false
  }
}

// ===== 重置密码 =====
const resetLoading = ref(false)
const sendCodeLoading = ref(false)
const countdown = ref(0)
let countdownTimer = null

const resetForm = reactive({ contact: '', code: '', password: '', verifyPwd: '' })
const errors = reactive({ contact: '', code: '', password: '', verifyPwd: '' })
const valid = reactive({ contact: false, code: false, password: false, verifyPwd: false })

function validateContact() {
  const val = resetForm.contact.trim()
  if (!val) { errors.contact = '请输入邮箱或手机号'; valid.contact = false; return }
  const isPhone = /^1[3-9]\d{9}$/.test(val)
  const isEmail = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(val)
  if (!isPhone && !isEmail) { errors.contact = '请输入正确的邮箱或手机号'; valid.contact = false; return }
  errors.contact = ''
  valid.contact = true
}
function validateCode() {
  const val = resetForm.code.trim()
  if (!val) { errors.code = '请输入验证码'; valid.code = false; return }
  if (val.length < 4) { errors.code = '验证码长度不足'; valid.code = false; return }
  errors.code = ''
  valid.code = true
}
function validatePassword() {
  const val = resetForm.password
  if (!val) { errors.password = '请输入新密码'; valid.password = false; return }
  if (val.length < CONST.PWD_MIN) { errors.password = `密码长度不能少于${CONST.PWD_MIN}位`; valid.password = false; return }
  errors.password = ''
  valid.password = true
  validateVerifyPwd()
}
function validateVerifyPwd() {
  const val = resetForm.verifyPwd
  if (!val) { errors.verifyPwd = '请确认新密码'; valid.verifyPwd = false; return }
  if (val !== resetForm.password) { errors.verifyPwd = '两次输入的密码不一致'; valid.verifyPwd = false; return }
  errors.verifyPwd = ''
  valid.verifyPwd = true
}

// 密码强度
function calculatePasswordStrength(pwd) {
  if (!pwd) return 0
  let s = 0
  if (pwd.length >= 8) s += 25
  else if (pwd.length >= 6) s += 15
  if (/\d/.test(pwd)) s += 25
  if (/[a-z]/.test(pwd)) s += 25
  if (/[A-Z]/.test(pwd) || /[^a-zA-Z0-9]/.test(pwd)) s += 25
  return Math.min(s, 100)
}
const passwordStrengthValue = computed(() => calculatePasswordStrength(resetForm.password))
const passwordStrengthWidth = computed(() => `${passwordStrengthValue.value}%`)
const passwordStrengthText = computed(() => {
  const s = passwordStrengthValue.value
  if (s < 25) return '弱'
  if (s < 50) return '一般'
  if (s < 75) return '良好'
  return '强'
})
const passwordStrengthClass = computed(() => {
  const s = passwordStrengthValue.value
  if (s < 25) return 'danger'
  if (s < 50) return 'warning'
  if (s < 75) return 'info'
  return 'success'
})

function startCountdown() {
  countdown.value = CONST.CODE_COOLDOWN
  if (countdownTimer) clearInterval(countdownTimer)
  countdownTimer = setInterval(() => {
    if (countdown.value > 0) countdown.value--
    else { clearInterval(countdownTimer); countdownTimer = null }
  }, 1000)
}

async function sendCode() {
  validateContact()
  if (!valid.contact) return
  const contact = resetForm.contact.trim()
  sendCodeLoading.value = true
  try {
    await resetPasswordSendCode(contact)
    toast.success('验证码发送成功！')
    startCountdown()
  } catch {
    // 拦截器已提示
  } finally {
    sendCodeLoading.value = false
  }
}

function handleResetPasswordSubmit() {
  validateContact()
  validateCode()
  validatePassword()
  validateVerifyPwd()
  if (!valid.contact || !valid.code || !valid.password || !valid.verifyPwd) {
    toast.warning('请检查表单填写是否正确')
    return
  }
  doResetPassword()
}

async function doResetPassword() {
  resetLoading.value = true
  try {
    await resetPassword(resetForm.contact.trim(), resetForm.code.trim(), resetForm.password)
    toast.success('密码修改成功，请重新登录')
    resetForm.contact = ''
    resetForm.code = ''
    resetForm.password = ''
    resetForm.verifyPwd = ''
  } catch {
    // 拦截器已提示
  } finally {
    resetLoading.value = false
  }
}

// ===== 账号注销 =====
// ===== 注销账户 =====
const destroyVisible = ref(false)
const destroyLoading = ref(false)
const destroyError = ref('')
const destroyForm = reactive({ code: '', password: '', source: '' })
const codeCountdown = ref(0)
let codeTimer = null

function openDestroy() {
  destroyForm.code = ''
  destroyForm.password = ''
  destroyForm.source = ''
  destroyError.value = ''
  destroyVisible.value = true
}

function closeDestroy() {
  if (destroyLoading.value) return
  destroyVisible.value = false
  if (codeTimer) {
    clearInterval(codeTimer)
    codeTimer = null
  }
  codeCountdown.value = 0
}

function startCodeCountdown() {
  codeCountdown.value = CONST.CODE_COOLDOWN
  codeTimer = setInterval(() => {
    codeCountdown.value--
    if (codeCountdown.value <= 0) {
      clearInterval(codeTimer)
      codeTimer = null
    }
  }, 1000)
}

async function sendDestroyCode() {
  destroyError.value = ''
  try {
    await destroySendCode()
    toast.success('验证码已发送，请查收手机或邮箱')
    startCodeCountdown()
  } catch {
    // 拦截器已提示
  }
}

async function submitDestroy() {
  destroyError.value = ''
  if (!destroyForm.code) {
    destroyError.value = '请输入验证码'
    return
  }
  if (!destroyForm.password) {
    destroyError.value = '请输入当前登录密码'
    return
  }
  destroyLoading.value = true
  try {
    await destroy(destroyForm.code, destroyForm.password, destroyForm.source || 'default')
    userStore.clear()
    toast.success('账号已注销')
    router.replace('/')
  } catch (e) {
    destroyError.value = e?.response?.data?.msg || '注销失败，请检查验证码与密码'
  } finally {
    destroyLoading.value = false
  }
}

function fetchUserInfo() {
  const u = userStore.user
  if (u) currentAccount.value = u.account || ''
}

onMounted(fetchUserInfo)
onUnmounted(() => {
  if (countdownTimer) clearInterval(countdownTimer)
  if (codeTimer) clearInterval(codeTimer)
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
.danger-title { color: var(--danger); }
.security-wrap {
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.input-row {
  display: flex;
  gap: 8px;
}
.input-row .input {
  flex: 1;
}
.edit-box {
  margin-top: 12px;
  padding: 16px;
  background: var(--bg-muted);
  border-radius: var(--radius);
}
.warn-tip {
  font-size: 13px;
  color: var(--danger);
  margin: 0 0 12px;
}
.btn-row {
  display: flex;
  gap: 8px;
}
.pwd-strength {
  margin-top: 4px;
}
.strength-head {
  display: flex;
  justify-content: space-between;
  font-size: 12px;
  margin-bottom: 6px;
}
.strength-text.danger { color: var(--danger); }
.strength-text.warning { color: var(--warning); }
.strength-text.info { color: #2980b9; }
.strength-text.success { color: var(--success); }
.strength-bar {
  height: 6px;
  background: var(--bg-muted);
  border-radius: 3px;
  overflow: hidden;
}
.strength-fill {
  height: 100%;
  border-radius: 3px;
  transition: width 0.3s;
}
.strength-fill.danger { background: var(--danger); }
.strength-fill.warning { background: var(--warning); }
.strength-fill.info { background: #2980b9; }
.strength-fill.success { background: var(--success); }

.tip-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.tip-list li {
  font-size: 13px;
  color: var(--text-soft);
}
.danger-tip {
  font-size: 13px;
  color: var(--text-muted);
  margin-bottom: 16px;
  padding: 12px;
  background: rgba(217, 84, 77, 0.08);
  border-radius: var(--radius);
}

/* 注销确认弹层 */
.modal-mask {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.45);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 16px;
}
.modal-box {
  width: 100%;
  max-width: 420px;
  background: var(--bg);
  border-radius: var(--radius);
  padding: 24px;
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.2);
}
.modal-title {
  font-size: 17px;
  font-weight: 600;
  color: var(--danger);
  margin-bottom: 12px;
}
.modal-warn {
  font-size: 13px;
  color: var(--text-soft);
  line-height: 1.6;
  margin: 0 0 16px;
}
.modal-warn strong { color: var(--danger); }
.field {
  margin-bottom: 14px;
}
.field label {
  display: block;
  font-size: 13px;
  font-weight: 500;
  margin-bottom: 6px;
  color: var(--text);
}
.code-row {
  display: flex;
  gap: 8px;
}
.code-row .input { flex: 1; }
.field-hint {
  display: block;
  font-size: 12px;
  color: var(--text-muted);
  margin-top: 6px;
}
.form-error {
  font-size: 13px;
  color: var(--danger);
  margin: 4px 0 14px;
}
.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 8px;
}
.spinner {
  display: inline-block;
  width: 12px;
  height: 12px;
  border: 2px solid rgba(255, 255, 255, 0.4);
  border-top-color: #fff;
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
  margin-right: 6px;
  vertical-align: -2px;
}
@keyframes spin {
  to { transform: rotate(360deg); }
}
</style>
