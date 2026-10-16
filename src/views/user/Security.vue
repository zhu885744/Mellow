<template>
  <div class="security-wrap">
    <!-- 账号设置（是否可改用后台「系统设置 → 账号与登录 → 账号修改」控制） -->
    <div class="card card-pad">
      <h2 class="block-title">
        账号设置
        <span v-if="accountRule && !accountRule.enabled" class="title-tip">当前禁止修改</span>
      </h2>
      <div class="form-item">
        <label class="form-label">当前账号</label>
        <div class="input-row">
          <input class="input" :value="currentAccount" disabled />
          <button
            v-if="canEditAccount"
            class="btn"
            :disabled="accountLoading"
            @click="toggleAccountEdit"
          >
            {{ showAccountEdit ? '取消' : '修改' }}
          </button>
        </div>
        <p v-if="accountRule && !canEditAccount" class="field-tip">{{ accountRuleMessage }}</p>
        <p v-else-if="canEditAccount" class="field-tip">{{ accountEditHint }}</p>
      </div>

      <div v-if="showAccountEdit" class="edit-box">
        <p class="warn-tip"><i class="bi bi-exclamation-triangle" /> 修改账号后将影响登录，请谨慎操作</p>
        <div class="form-item">
          <label class="form-label">新账号</label>
          <input
            v-model.trim="accountForm.newAccount"
            class="input"
            :placeholder="accountPlaceholder"
            :maxlength="Number(accountRule?.max_length || CONST.ACCOUNT_MAX)"
            @input="validateNewAccount"
          />
          <p v-if="accountErrors.newAccount" class="form-error">{{ accountErrors.newAccount }}</p>
        </div>

        <!-- 身份验证：与后端 verifyIdentity 一致（当前密码 / 已绑定联系方式的验证码） -->
        <div v-if="accountRule?.require_verify" class="form-item">
          <div class="label-row">
            <label class="form-label">身份验证</label>
            <button
              v-if="accountHasContact"
              type="button"
              class="switch-link"
              @click="toggleAccountIdentityMode"
            >
              {{ accountIdentityMode === 'password' ? `改用${accountIdentityLabel}验证码` : '改用当前密码' }}
            </button>
          </div>
          <input
            v-if="accountIdentityMode === 'password'"
            v-model="accountForm.password"
            type="password"
            class="input"
            placeholder="请输入当前密码"
            autocomplete="current-password"
          />
          <div v-else class="input-row">
            <input v-model="accountForm.identityCode" class="input" placeholder="6位数字验证码" maxlength="6" />
            <button
              type="button"
              class="btn"
              :disabled="accountIdentitySending || accountIdentityCountdown > 0"
              @click="sendAccountIdentityCode"
            >
              {{ accountIdentitySending ? '发送中...' : accountIdentityCountdown > 0 ? `${accountIdentityCountdown}秒后重试` : '发送验证码' }}
            </button>
          </div>
          <p v-if="accountErrors.identity" class="form-error">{{ accountErrors.identity }}</p>
          <p v-else class="field-tip">
            {{ accountHasContact ? `验证码会发送到你已绑定的${accountIdentityLabel}` : '未设置密码、也未绑定邮箱/手机号的账号可留空' }}
          </p>
        </div>

        <div class="btn-row">
          <button class="btn btn-primary" :disabled="accountLoading" @click="handleAccountSubmit">
            {{ accountLoading ? '修改中...' : '确认修改账号' }}
          </button>
          <button class="btn" :disabled="accountLoading" @click="cancelAccountEdit">取消</button>
        </div>
      </div>
    </div>

    <!-- 联系方式：邮箱 / 手机号改绑（原「联系方式」页的功能，已合并到账号安全） -->
    <div class="card card-pad">
      <h2 class="block-title">手机号|邮箱设置<span class="title-tip">用于登录、找回密码与安全验证</span></h2>
      <div class="contact-grid">
        <!-- 邮箱设置 -->
        <div class="contact-block">
          <h3 class="sub-title">邮箱设置</h3>
          <form @submit.prevent="updateEmailFn">
            <div class="form-item">
              <label class="form-label">新邮箱</label>
              <input v-model="emailForm.email" class="input" placeholder="请输入新邮箱" maxlength="50" />
            </div>
            <div class="form-item">
              <label class="form-label">新邮箱验证码</label>
              <div class="input-row">
                <input v-model="emailForm.code" class="input" placeholder="6位数字验证码" maxlength="6" />
                <button type="button" class="btn" :disabled="emailSending || emailCountdown > 0" @click="sendEmailCode">
                  {{ emailSending ? '发送中...' : emailCountdown > 0 ? `${emailCountdown}秒后重试` : '发送验证码' }}
                </button>
              </div>
            </div>

            <!-- 身份验证：改绑邮箱会改变登录凭证，后端要求再验证一次操作者身份 -->
            <div class="form-item">
              <div class="label-row">
                <label class="form-label">身份验证</label>
                <button v-if="emailHasContact" type="button" class="switch-link" @click="toggleEmailIdentityMode">
                  {{ emailIdentityMode === 'password' ? `改用${emailIdentityLabel}验证码` : '改用当前密码' }}
                </button>
              </div>
              <input
                v-if="emailIdentityMode === 'password'"
                v-model="emailForm.password"
                type="password"
                class="input"
                placeholder="请输入当前密码"
                autocomplete="current-password"
              />
              <div v-else class="input-row">
                <input v-model="emailForm.identityCode" class="input" placeholder="6位数字验证码" maxlength="6" />
                <button
                  type="button"
                  class="btn"
                  :disabled="emailIdentitySending || emailIdentityCountdown > 0"
                  @click="sendEmailIdentityCode"
                >
                  {{ emailIdentitySending ? '发送中...' : emailIdentityCountdown > 0 ? `${emailIdentityCountdown}秒后重试` : '发送验证码' }}
                </button>
              </div>
              <p class="field-tip">
                {{ emailHasContact ? `验证码会发送到你已绑定的${emailIdentityLabel}` : '未设置密码、也未绑定邮箱/手机号的账号可留空' }}
              </p>
            </div>

            <button class="btn btn-primary" :disabled="emailLoading" type="submit">
              {{ emailLoading ? '保存中...' : '修改邮箱' }}
            </button>
          </form>
        </div>

        <!-- 手机号设置 -->
        <div class="contact-block">
          <h3 class="sub-title">手机号设置</h3>
          <form @submit.prevent="updatePhoneFn">
            <div class="form-item">
              <label class="form-label">新手机号</label>
              <input v-model="phoneForm.phone" class="input" placeholder="请输入新手机号" maxlength="11" />
            </div>
            <div class="form-item">
              <label class="form-label">新手机号验证码</label>
              <div class="input-row">
                <input v-model="phoneForm.code" class="input" placeholder="6位数字验证码" maxlength="6" />
                <button type="button" class="btn" :disabled="phoneSending || phoneCountdown > 0" @click="sendPhoneCode">
                  {{ phoneSending ? '发送中...' : phoneCountdown > 0 ? `${phoneCountdown}秒后重试` : '发送验证码' }}
                </button>
              </div>
            </div>

            <!-- 身份验证：改绑手机号会改变登录凭证，后端要求再验证一次操作者身份 -->
            <div class="form-item">
              <div class="label-row">
                <label class="form-label">身份验证</label>
                <button v-if="phoneHasContact" type="button" class="switch-link" @click="togglePhoneIdentityMode">
                  {{ phoneIdentityMode === 'password' ? `改用${phoneIdentityLabel}验证码` : '改用当前密码' }}
                </button>
              </div>
              <input
                v-if="phoneIdentityMode === 'password'"
                v-model="phoneForm.password"
                type="password"
                class="input"
                placeholder="请输入当前密码"
                autocomplete="current-password"
              />
              <div v-else class="input-row">
                <input v-model="phoneForm.identityCode" class="input" placeholder="6位数字验证码" maxlength="6" />
                <button
                  type="button"
                  class="btn"
                  :disabled="phoneIdentitySending || phoneIdentityCountdown > 0"
                  @click="sendPhoneIdentityCode"
                >
                  {{ phoneIdentitySending ? '发送中...' : phoneIdentityCountdown > 0 ? `${phoneIdentityCountdown}秒后重试` : '发送验证码' }}
                </button>
              </div>
              <p class="field-tip">
                {{ phoneHasContact ? `验证码会发送到你已绑定的${phoneIdentityLabel}` : '未设置密码、也未绑定邮箱/手机号的账号可留空' }}
              </p>
            </div>

            <button class="btn btn-primary" :disabled="phoneLoading" type="submit">
              {{ phoneLoading ? '保存中...' : '修改手机号' }}
            </button>
          </form>
        </div>
      </div>
    </div>

    <!-- 修改密码（需要当前密码；与下方「重置密码」的分工见 script 里的注释） -->
    <div class="card card-pad">
      <h2 class="block-title">修改密码</h2>
      <form @submit.prevent="handleChangePasswordSubmit">
        <div class="form-item">
          <label class="form-label">当前密码</label>
          <input
            type="password"
            v-model="pwdForm.oldPassword"
            class="input"
            placeholder="请输入当前密码"
            autocomplete="current-password"
            @input="validateOldPassword"
          />
          <p v-if="pwdErrors.oldPassword" class="form-error">{{ pwdErrors.oldPassword }}</p>
          <p v-else class="field-tip">从未设置过密码（第三方登录注册）？请用下方「重置密码」</p>
        </div>

        <div class="form-item">
          <label class="form-label">新密码</label>
          <input
            type="password"
            v-model="pwdForm.password"
            class="input"
            placeholder="请输入新密码"
            minlength="6"
            maxlength="20"
            autocomplete="new-password"
            @input="validateNewPassword"
          />
          <p v-if="pwdErrors.password" class="form-error">{{ pwdErrors.password }}</p>
        </div>

        <div class="form-item">
          <label class="form-label">确认新密码</label>
          <input
            type="password"
            v-model="pwdForm.verifyPwd"
            class="input"
            placeholder="请再次输入新密码"
            autocomplete="new-password"
            @input="validateNewVerifyPwd"
          />
          <p v-if="pwdErrors.verifyPwd" class="form-error">{{ pwdErrors.verifyPwd }}</p>
        </div>

        <div v-if="pwdForm.password" class="form-item">
          <div class="pwd-strength">
            <div class="strength-head">
              <span class="text-muted">密码强度</span>
              <span :class="['strength-text', pwdStrengthClass]">{{ pwdStrengthText }}</span>
            </div>
            <div class="strength-bar">
              <div class="strength-fill" :class="pwdStrengthClass" :style="{ width: pwdStrengthWidth }"></div>
            </div>
          </div>
        </div>

        <button class="btn btn-primary" :disabled="pwdLoading" type="submit">
          {{ pwdLoading ? '修改中...' : '修改密码' }}
        </button>
      </form>
    </div>

    <!-- 重置密码（忘记当前密码 / 从未设过密码时使用） -->
    <div class="card card-pad">
      <h2 class="block-title">重置密码<span class="title-tip">忘记当前密码时使用</span></h2>
      <form @submit.prevent="handleResetPasswordSubmit">
        <div class="form-item">
          <div class="label-row">
            <label class="form-label">邮箱 / 手机号</label>
            <button
              v-if="canSwitchContact"
              type="button"
              class="switch-link"
              @click="switchContact"
            >
              切换为{{ nextContactLabel }}
            </button>
          </div>
          <input
            v-model="resetForm.contact"
            class="input"
            placeholder="请输入您的邮箱或手机号"
            @input="validateContact"
          />
          <p v-if="errors.contact" class="form-error">{{ errors.contact }}</p>
          <p v-else-if="contactHint" class="field-tip">{{ contactHint }}</p>
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
        <li><i class="bi bi-envelope-check" /> 邮箱和手机号用于登录、找回密码与安全验证，请保持可用</li>
        <li><i class="bi bi-stopwatch" /> 验证码有效期为 5 分钟，请勿透露给他人</li>
      </ul>
    </div>

    <!-- 第三方账号绑定（QQ / GitHub / Gitee）：未开启任何平台时整块不显示 -->
    <div v-if="oauthLoading || oauthList.length || oauthAvailable.length" class="card card-pad">
      <h2 class="block-title">第三方账号</h2>
      <p class="oauth-tip">
        绑定后可用第三方账号一键登录。解绑前请确认已设置密码（或绑定了其它方式），否则会无法登录本站。
      </p>

      <div v-if="oauthLoading" class="oauth-loading"><span class="spinner" /> 加载中…</div>
      <ul v-else class="oauth-list">
        <!-- 已绑定 -->
        <li v-for="item in oauthList" :key="item.platform" class="oauth-item">
          <i class="oauth-brand-icon" :class="platformIcon(item.platform)" />
          <span class="oauth-info">
            <span class="oauth-name">{{ item.name }}</span>
            <span class="oauth-sub" :title="item.nickname">{{ item.nickname || '已绑定' }}</span>
          </span>
          <button
            class="btn btn-sm btn-outline-danger"
            :disabled="!!oauthActing"
            @click="askUnbind(item)"
          >
            {{ oauthActing === item.platform ? '解绑中…' : '解绑' }}
          </button>
        </li>
        <!-- 未绑定 -->
        <li v-for="item in oauthAvailable" :key="item.platform" class="oauth-item">
          <i class="oauth-brand-icon" :class="platformIcon(item.platform)" />
          <span class="oauth-info">
            <span class="oauth-name">{{ item.name }}</span>
            <span class="oauth-sub">未绑定</span>
          </span>
          <button class="btn btn-sm btn-primary" :disabled="!!oauthActing" @click="bindOauth(item)">
            绑定
          </button>
        </li>
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
          placeholder="可填写注销原因"
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

  <!-- 解绑第三方账号确认 -->
  <ConfirmDialog
    v-model:visible="oauthConfirmVisible"
    title="解绑第三方账号"
    :message="oauthConfirmMessage"
    confirm-text="确定解绑"
    cancel-text="再想想"
    loading-text="解绑中..."
    :loading="!!oauthActing"
    @confirm="doUnbind"
  />
</template>

<script setup>
import { ref, reactive, computed, onMounted, onUnmounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '@/stores/user'
import { changeAccount, changePassword, destroy, destroySendCode, getAccountRule, updateEmail, updatePhone } from '@/api/users'
import { resetPasswordSendCode, resetPassword } from '@/api/comm'
import { getMyOauth, oauthUnbind } from '@/api/oauth'
import { enabledPlatforms, platformIcon, startOauth } from '@/utils/oauth'
import { useIdentityVerify } from '@/utils/identity-verify'
import ConfirmDialog from '@/components/ConfirmDialog.vue'
import { toast } from '@/utils/toast'

const userStore = useUserStore()
const router = useRouter()

const CONST = {
  ACCOUNT_MIN: 4,
  ACCOUNT_MAX: 20,
  PWD_MIN: 6,
  CODE_COOLDOWN: 60
}

// ===== 账号展示（账号修改功能暂时关闭） =====
const currentAccount = ref('')

// ===== 第三方账号绑定（QQ / GitHub / Gitee） =====
// 已绑定列表来自 /api/oauth/mine；可绑定平台来自 /api/oauth/config（过滤掉已绑定的）
const oauthLoading = ref(false)
const oauthList = ref([])
const oauthAvailable = ref([])
const oauthActing = ref('')
const oauthConfirmVisible = ref(false)
const oauthConfirmItem = ref(null)

const oauthConfirmMessage = computed(() => {
  const name = oauthConfirmItem.value?.name || '第三方账号'
  return `确定解绑 ${name} 吗？解绑后将无法再用它登录。`
})

async function loadOauthMine() {
  oauthLoading.value = true
  try {
    const [res, platforms] = await Promise.all([getMyOauth(), enabledPlatforms()])
    const list = Array.isArray(res?.data?.list) ? res.data.list : []
    oauthList.value = list
    const bound = new Set(list.map((item) => item.platform))
    oauthAvailable.value = platforms.filter((item) => !bound.has(item.platform))
  } catch {
    // 接口失败（如平台全未开启）时整块不渲染，不打扰用户
    oauthList.value = []
    oauthAvailable.value = []
  } finally {
    oauthLoading.value = false
  }
}

// 绑定：跳第三方授权页；回调页识别到已登录会直接把该平台绑到当前账号（mode=bind）
function bindOauth(item) {
  startOauth(item, { mode: 'bind', redirect: '/user/security' })
}

function askUnbind(item) {
  oauthConfirmItem.value = item
  oauthConfirmVisible.value = true
}

async function doUnbind() {
  const item = oauthConfirmItem.value
  if (!item) return
  oauthActing.value = item.platform
  try {
    await oauthUnbind(item.platform)
    toast.success(`${item.name} 已解绑`)
    oauthConfirmVisible.value = false
    oauthConfirmItem.value = null
    await loadOauthMine()
  } catch {
    // 错误已由拦截器提示（例如「解绑后你将无法登录本站」）
  } finally {
    oauthActing.value = ''
  }
}

// ===== 账号修改 =====
// 是否开放、冷却天数（默认改完 30 天内不可再改）、是否要求绑定手机号/邮箱与身份验证
// 全部由后台「系统设置 → 账号与登录 → 账号修改」控制（config 表 SYSTEM_ACCOUNT_CHANGE）。
// 这里先读规则（getAccountRule）：不可改时连「修改」按钮都不显示，直接把原因写出来。
const accountRule = ref(null)
const accountLoading = ref(false)
const showAccountEdit = ref(false)
const accountForm = reactive({ newAccount: '', password: '', identityCode: '' })
const accountErrors = reactive({ newAccount: '', identity: '' })

// 身份验证：与联系方式页共用同一份实现（@/utils/identity-verify）
const {
  mode: accountIdentityMode,
  sending: accountIdentitySending,
  countdown: accountIdentityCountdown,
  hasBoundContact: accountHasContact,
  targetLabel: accountIdentityLabel,
  toggle: toggleAccountIdentityMode,
  send: sendAccountIdentityCode,
  payload: accountIdentityPayload,
  stop: stopAccountIdentityVerify
} = useIdentityVerify()

const canEditAccount = computed(() => Boolean(accountRule.value?.can_change))
const accountRuleMessage = computed(() => accountRule.value?.message || '管理员未开放账号修改功能')
const accountEditHint = computed(() => {
  const days = Number(accountRule.value?.cooldown_days || 0)
  return days > 0 ? `修改成功后 ${days} 天内不可再次修改` : '修改账号将影响登录，请谨慎操作'
})
const accountPlaceholder = computed(() => {
  const min = Number(accountRule.value?.min_length || CONST.ACCOUNT_MIN)
  const max = Number(accountRule.value?.max_length || CONST.ACCOUNT_MAX)
  return `请输入新账号（${min}-${max}位字母、数字或下划线）`
})

async function loadAccountRule() {
  try {
    const res = await getAccountRule()
    accountRule.value = res?.data && typeof res.data === 'object' ? res.data : null
  } catch {
    // 接口不可用（未登录等）时按「不可修改」处理，不打扰用户
    accountRule.value = null
  }
}

function validateNewAccount() {
  const val = accountForm.newAccount.trim()
  const min = Number(accountRule.value?.min_length || CONST.ACCOUNT_MIN)
  const max = Number(accountRule.value?.max_length || CONST.ACCOUNT_MAX)

  if (!val) { accountErrors.newAccount = '请输入新账号'; return false }
  if (val.length < min) { accountErrors.newAccount = `账号长度不能少于${min}位`; return false }
  if (val.length > max) { accountErrors.newAccount = `账号长度不能超过${max}位`; return false }
  if (!/^[a-zA-Z0-9_]+$/.test(val)) { accountErrors.newAccount = '账号只能包含字母、数字和下划线'; return false }
  if (val === currentAccount.value) { accountErrors.newAccount = '新账号不能与当前账号相同'; return false }

  accountErrors.newAccount = ''
  return true
}

// 身份验证只做前端能判断的部分：验证码模式必须填满 6 位；
// 密码模式留空也放行（从未设置密码的账号可留空，由后端 verifyIdentity 判定）
function validateAccountIdentity() {
  if (!accountRule.value?.require_verify) { accountErrors.identity = ''; return true }
  if (accountIdentityMode.value === 'code' && !/^\d{6}$/.test(accountForm.identityCode)) {
    accountErrors.identity = '请输入身份验证码'
    return false
  }
  accountErrors.identity = ''
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
  accountForm.password = ''
  accountForm.identityCode = ''
  accountErrors.newAccount = ''
  accountErrors.identity = ''
}

async function handleAccountSubmit() {
  if (accountLoading.value) return
  if (!validateNewAccount() || !validateAccountIdentity()) return

  accountLoading.value = true
  try {
    await changeAccount({
      account: accountForm.newAccount.trim(),
      ...accountIdentityPayload(accountForm)
    })
    toast.success('账号修改成功')
    showAccountEdit.value = false
    resetAccountForm()
    // 账号变了：刷新登录态里的用户信息，并重新拉规则（冷却期立即生效）
    await userStore.checkLoginState()
    currentAccount.value = userStore.user?.account || ''
    await loadAccountRule()
  } catch {
    // 错误已由拦截器提示（如「该账号已被占用」「还需 X 天」）
  } finally {
    accountLoading.value = false
  }
}

// ===== 联系方式（邮箱 / 手机号改绑）=====
// 原「联系方式」页（/user/contact）的邮箱、手机号设置，已合并到本页。
// 两者都是登录凭证，改绑要双重校验：新联系方式的验证码（证明归你所有）
// + 身份验证（证明操作者是本人），见后端 users.email / users.phone。
const emailForm = reactive({ email: '', code: '', password: '', identityCode: '' })
const phoneForm = reactive({ phone: '', code: '', password: '', identityCode: '' })

const emailLoading = ref(false)
const phoneLoading = ref(false)
const emailSending = ref(false)
const phoneSending = ref(false)
const emailCountdown = ref(0)
const phoneCountdown = ref(0)

let emailTimer = null
let phoneTimer = null

// 身份验证（改绑联系方式是敏感操作，后端要求再验证一次「操作者是本人」）：
// 模式切换 / 发码倒计时 / 参数组装统一在 @/utils/identity-verify
// 两张表单各用一个实例：邮箱优先发邮箱、手机号优先发手机号，
// 避免在「手机号设置」里出现「改用邮箱验证码」（对应通道未绑定时才回退另一种）
const {
  mode: emailIdentityMode,
  sending: emailIdentitySending,
  countdown: emailIdentityCountdown,
  hasBoundContact: emailHasContact,
  targetLabel: emailIdentityLabel,
  toggle: toggleEmailIdentityMode,
  send: sendEmailIdentityCode,
  payload: emailIdentityPayload,
  stop: stopEmailIdentityVerify
} = useIdentityVerify({ prefer: 'email' })

const {
  mode: phoneIdentityMode,
  sending: phoneIdentitySending,
  countdown: phoneIdentityCountdown,
  hasBoundContact: phoneHasContact,
  targetLabel: phoneIdentityLabel,
  toggle: togglePhoneIdentityMode,
  send: sendPhoneIdentityCode,
  payload: phoneIdentityPayload,
  stop: stopPhoneIdentityVerify
} = useIdentityVerify({ prefer: 'sms' })

function startContactCountdown(kind) {
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
    startContactCountdown('email')
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
    startContactCountdown('phone')
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
  if (!/^\d{6}$/.test(emailForm.code)) { toast.error('请输入新邮箱收到的6位数字验证码'); return }
  if (emailIdentityMode.value === 'code' && !/^\d{6}$/.test(emailForm.identityCode)) { toast.error('请输入身份验证码'); return }
  emailLoading.value = true
  try {
    await updateEmail({ email: emailForm.email, code: emailForm.code, ...emailIdentityPayload(emailForm) })
    toast.success('邮箱修改成功')
    await userStore.checkLoginState()
    emailForm.email = ''
    emailForm.code = ''
    emailForm.password = ''
    emailForm.identityCode = ''
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
  if (!/^\d{6}$/.test(phoneForm.code)) { toast.error('请输入新手机号收到的6位数字验证码'); return }
  if (phoneIdentityMode.value === 'code' && !/^\d{6}$/.test(phoneForm.identityCode)) { toast.error('请输入身份验证码'); return }
  phoneLoading.value = true
  try {
    await updatePhone({ phone: phoneForm.phone, code: phoneForm.code, ...phoneIdentityPayload(phoneForm) })
    toast.success('手机号修改成功')
    await userStore.checkLoginState()
    phoneForm.phone = ''
    phoneForm.code = ''
    phoneForm.password = ''
    phoneForm.identityCode = ''
  } catch {
    // 拦截器已提示
  } finally {
    phoneLoading.value = false
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

// 已绑定的联系方式（邮箱优先），用于自动填充
const contactOptions = computed(() => {
  const u = userStore.user || {}
  return [u.email, u.phone].filter(Boolean)
})
const canSwitchContact = computed(() => contactOptions.value.length > 1)
const nextContactLabel = computed(() => (resetForm.contact.trim() === (userStore.user || {}).email ? '手机号' : '邮箱'))
const contactHint = computed(() => {
  const u = userStore.user || {}
  const cur = resetForm.contact.trim()
  // 仅在当前值与绑定值一致（即自动填充的结果）时提示，手动输入时不打扰
  if (!cur || (cur !== u.email && cur !== u.phone)) return ''
  return canSwitchContact.value
    ? '已自动填入你绑定的联系方式，可切换或手动修改'
    : '已自动填入你绑定的联系方式，可手动修改'
})

// 自动填充：优先邮箱，其次手机号（已有输入内容时不覆盖）
function fillContact() {
  const u = userStore.user || {}
  const contact = u.email || u.phone || ''
  if (contact && !resetForm.contact) {
    resetForm.contact = contact
    validateContact()
  }
}

// 邮箱 / 手机号切换
function switchContact() {
  const list = contactOptions.value
  if (list.length < 2) return
  const idx = list.indexOf(resetForm.contact.trim())
  resetForm.contact = list[(idx + 1) % list.length]
  validateContact()
}

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
  const message = checkNewPassword(resetForm.password)
  errors.password = message
  valid.password = !message
  if (!message) validateVerifyPwd()
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
// 强度文案 / 颜色：修改密码与重置密码两个表单共用（原来两处各写了一份）
function strengthText(value) {
  if (value < 25) return '弱'
  if (value < 50) return '一般'
  if (value < 75) return '良好'
  return '强'
}
function strengthClass(value) {
  if (value < 25) return 'danger'
  if (value < 50) return 'warning'
  if (value < 75) return 'info'
  return 'success'
}
/**
 * 新密码校验，返回空字符串表示通过
 *
 * 规则与后端 passwordWeakMessage（app/api/controller/users-identity.go）保持一致：
 * 前端先拦一道省一次往返，但真正的把关在后端（接口可以被直接调用）。
 */
function checkNewPassword(value, oldPassword = '') {
  if (!value) return '请输入新密码'
  if (value.length < CONST.PWD_MIN) return `密码长度不能少于${CONST.PWD_MIN}位`
  if (value.length > 20) return '密码长度不能超过20位'
  if (/\s/.test(value)) return '密码不能包含空格'
  if (/^\d+$/.test(value)) return '密码不能是纯数字，请混合字母或符号'
  if (oldPassword && value === oldPassword) return '新密码不能与当前密码相同'
  return ''
}

const passwordStrengthValue = computed(() => calculatePasswordStrength(resetForm.password))
const passwordStrengthWidth = computed(() => `${passwordStrengthValue.value}%`)
const passwordStrengthText = computed(() => strengthText(passwordStrengthValue.value))
const passwordStrengthClass = computed(() => strengthClass(passwordStrengthValue.value))

// ===== 修改密码 =====
// 与「重置密码」的分工：
// - 修改密码：记得当前密码时主动更换 —— 要校验当前密码（本页上方卡片）
// - 重置密码：忘记当前密码 / 第三方登录注册（从未设过密码）—— 用邮箱或手机验证码
const pwdLoading = ref(false)
const pwdForm = reactive({ oldPassword: '', password: '', verifyPwd: '' })
const pwdErrors = reactive({ oldPassword: '', password: '', verifyPwd: '' })
const pwdValid = reactive({ oldPassword: false, password: false, verifyPwd: false })

function validateOldPassword() {
  const val = pwdForm.oldPassword
  if (!val) { pwdErrors.oldPassword = '请输入当前密码'; pwdValid.oldPassword = false; return }
  pwdErrors.oldPassword = ''
  pwdValid.oldPassword = true
}

function validateNewPassword() {
  const message = checkNewPassword(pwdForm.password, pwdForm.oldPassword)
  pwdErrors.password = message
  pwdValid.password = !message
  if (!message) validateNewVerifyPwd()
}

function validateNewVerifyPwd() {
  const val = pwdForm.verifyPwd
  if (!val) { pwdErrors.verifyPwd = '请确认新密码'; pwdValid.verifyPwd = false; return }
  if (val !== pwdForm.password) { pwdErrors.verifyPwd = '两次输入的密码不一致'; pwdValid.verifyPwd = false; return }
  pwdErrors.verifyPwd = ''
  pwdValid.verifyPwd = true
}

const pwdStrengthValue = computed(() => calculatePasswordStrength(pwdForm.password))
const pwdStrengthWidth = computed(() => `${pwdStrengthValue.value}%`)
const pwdStrengthText = computed(() => strengthText(pwdStrengthValue.value))
const pwdStrengthClass = computed(() => strengthClass(pwdStrengthValue.value))

function handleChangePasswordSubmit() {
  validateOldPassword()
  validateNewPassword()
  validateNewVerifyPwd()
  if (!pwdValid.oldPassword || !pwdValid.password || !pwdValid.verifyPwd) {
    toast.warning('请检查表单填写是否正确')
    return
  }
  doChangePassword()
}

async function doChangePassword() {
  pwdLoading.value = true
  try {
    await changePassword({ old_password: pwdForm.oldPassword, password: pwdForm.password })
    toast.success('密码修改成功')
    pwdForm.oldPassword = ''
    pwdForm.password = ''
    pwdForm.verifyPwd = ''
    pwdErrors.oldPassword = ''
    pwdErrors.password = ''
    pwdErrors.verifyPwd = ''
  } catch {
    // 错误已由拦截器提示（如「密码错误！」「新密码不能与当前密码相同！」）
  } finally {
    pwdLoading.value = false
  }
}

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
  if (u) {
    currentAccount.value = u.account || ''
    // 联系方式：预填当前已绑定的邮箱 / 手机号，便于直接改绑
    emailForm.email = u.email || ''
    phoneForm.phone = u.phone || ''
  }
  // 重置密码：自动填入当前绑定的邮箱或手机号
  fillContact()
}

onMounted(() => {
  fetchUserInfo()
  loadOauthMine()
  loadAccountRule()
})
// 刷新页面时 user 可能晚于组件挂载，登录态就绪后补填一次
watch(() => userStore.user?.id, () => fetchUserInfo())
onUnmounted(() => {
  if (countdownTimer) clearInterval(countdownTimer)
  if (codeTimer) clearInterval(codeTimer)
  if (emailTimer) clearInterval(emailTimer)
  if (phoneTimer) clearInterval(phoneTimer)
  stopAccountIdentityVerify()
  stopEmailIdentityVerify()
  stopPhoneIdentityVerify()
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
/* 卡片标题后的补充说明（如「重置密码」的适用场景） */
.title-tip {
  margin-left: 8px;
  font-size: 12px;
  font-weight: 400;
  color: var(--text-muted);
}
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
/* ===== 联系方式（邮箱 / 手机号改绑）===== */
.contact-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  align-items: start;
}
.sub-title {
  font-size: 14px;
  font-weight: 600;
  margin: 0 0 12px;
  padding-bottom: 8px;
  border-bottom: 1px solid var(--border-soft);
}
@media (max-width: 768px) {
  .contact-grid {
    grid-template-columns: 1fr;
  }
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
.label-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 6px;
}
.label-row .form-label {
  margin-bottom: 0;
}
.switch-link {
  padding: 0;
  border: none;
  background: none;
  font-size: 12px;
  color: var(--primary);
  cursor: pointer;
}
.switch-link:hover {
  text-decoration: underline;
}
.field-tip {
  margin-top: 6px;
  font-size: 12px;
  color: var(--text-muted);
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

/* ===== 第三方账号绑定 ===== */
.oauth-tip {
  margin: -4px 0 14px;
  font-size: 12px;
  line-height: 1.7;
  color: var(--text-muted);
}
.oauth-loading {
  display: flex;
  align-items: center;
  font-size: 13px;
  color: var(--text-muted);
}
/* 本页 .spinner 是给危险按钮用的白圈，浅色卡片上要换成主题色 */
.oauth-loading .spinner {
  border-color: var(--border);
  border-top-color: var(--primary);
}
.oauth-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
}
.oauth-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 0;
  border-top: 1px solid var(--border-soft);
}
.oauth-item:first-child {
  border-top: none;
  padding-top: 0;
}
.oauth-brand-icon {
  width: 26px;
  flex-shrink: 0;
  font-size: 20px;
  text-align: center;
  color: var(--text);
}
.oauth-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.oauth-name {
  font-size: 14px;
  color: var(--text);
}
.oauth-sub {
  font-size: 12px;
  color: var(--text-muted);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
