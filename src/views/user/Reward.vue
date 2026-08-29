<template>
  <div>
    <div class="card card-pad">
      <h2 class="block-title">打赏设置</h2>
      <p class="hint">
        设置您的个人收款码后，读者在您发布的文章详情页点击「打赏」时将展示您的收款码。
        每个用户独立维护，互不影响。
      </p>

      <!-- 微信收款码 -->
      <div class="reward-block">
        <div class="reward-head">
          <div class="reward-name">
            <i class="bi bi-wechat" style="color: #07c160" /> 微信收款码
          </div>
          <label class="btn btn-sm btn-primary">
            <i class="bi bi-cloud-upload" /> {{ uploading === 'wechat' ? '上传中...' : '上传图片' }}
            <input
              v-if="uploading !== 'wechat'"
              type="file"
              accept="image/*"
              hidden
              @change="(e) => onFileChange(e, 'wechat')"
            />
          </label>
        </div>
        <div class="qr-row">
          <div v-if="form.wechat" class="qr-preview">
            <img :src="form.wechat" alt="微信收款码" @click="openPreview(form.wechat)" />
            <button class="btn-link danger" type="button" @click="form.wechat = ''">移除</button>
          </div>
          <div v-else class="qr-empty">未设置</div>
          <input
            v-model="form.wechat"
            class="input"
            placeholder="或粘贴收款码图片链接"
          />
        </div>
      </div>

      <!-- 支付宝收款码 -->
      <div class="reward-block">
        <div class="reward-head">
          <div class="reward-name">
            <i class="bi bi-credit-card-2-front" style="color: #1677ff" /> 支付宝收款码
          </div>
          <label class="btn btn-sm btn-primary">
            <i class="bi bi-cloud-upload" /> {{ uploading === 'alipay' ? '上传中...' : '上传图片' }}
            <input
              v-if="uploading !== 'alipay'"
              type="file"
              accept="image/*"
              hidden
              @change="(e) => onFileChange(e, 'alipay')"
            />
          </label>
        </div>
        <div class="qr-row">
          <div v-if="form.alipay" class="qr-preview">
            <img :src="form.alipay" alt="支付宝收款码" @click="openPreview(form.alipay)" />
            <button class="btn-link danger" type="button" @click="form.alipay = ''">移除</button>
          </div>
          <div v-else class="qr-empty">未设置</div>
          <input
            v-model="form.alipay"
            class="input"
            placeholder="或粘贴收款码图片链接"
          />
        </div>
      </div>

      <div class="btn-row">
        <button class="btn btn-primary" :disabled="saving" @click="save">
          {{ saving ? '保存中...' : '保存修改' }}
        </button>
        <button class="btn" :disabled="saving" @click="reset">重置</button>
      </div>
    </div>

    <!-- 图片预览灯箱 -->
    <Teleport to="body">
      <transition name="preview-fade">
        <div v-if="previewSrc" class="preview-mask" @click="previewSrc = ''">
          <img :src="previewSrc" class="preview-img" alt="预览" />
        </div>
      </transition>
    </Teleport>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, watch } from 'vue'
import { useUserStore } from '@/stores/user'
import { updateUser, uploadAvatar } from '@/api/users'
import { toast } from '@/utils/toast'

const userStore = useUserStore()

const form = reactive({ wechat: '', alipay: '' })
const original = reactive({ wechat: '', alipay: '' })
const saving = ref(false)
// 上传状态：'' 空闲，'wechat' / 'alipay' 上传中
const uploading = ref('')
const previewSrc = ref('')

function fillFromUser() {
  const reward = userStore.user?.json?.reward || {}
  form.wechat = reward.wechat || ''
  form.alipay = reward.alipay || ''
  Object.assign(original, { ...form })
}

function reset() {
  Object.assign(form, { ...original })
}

function openPreview(src) {
  previewSrc.value = src
}

function onFileChange(e, type) {
  const file = e.target.files?.[0]
  if (!file) return
  if (file.size > 10 * 1024 * 1024) {
    toast.warning('图片大小不能超过 10MB')
    return
  }
  if (!['image/jpeg', 'image/png', 'image/gif', 'image/webp'].includes(file.type)) {
    toast.warning('请选择 JPG、PNG、GIF 或 WebP 格式的图片')
    return
  }
  uploading.value = type
  const params = new FormData()
  params.append('file', file, file.name)
  uploadAvatar(params)
    .then((res) => {
      const url = res.data?.results?.[0]?.full_url || res.data?.results?.[0]?.url || ''
      if (url) {
        form[type] = url
        toast.success('上传成功，请点击「保存修改」生效')
      } else {
        toast.error('上传失败，请重试')
      }
    })
    .catch(() => toast.error('上传失败，请稍后重试'))
    .finally(() => {
      uploading.value = ''
      e.target.value = ''
    })
}

async function save() {
  saving.value = true
  try {
    // 合并既有 json，仅更新 reward 字段
    const currentJson = (userStore.user?.json && typeof userStore.user.json === 'object')
      ? { ...userStore.user.json }
      : {}
    const mergedJson = {
      ...currentJson,
      reward: { wechat: form.wechat || '', alipay: form.alipay || '' }
    }
    await updateUser({ id: userStore.user.id, json: mergedJson })
    toast.success('打赏设置保存成功')
    // 同步本地用户信息
    await userStore.checkLoginState()
    Object.assign(original, { ...form })
  } catch {
    // 错误已由拦截器提示
  } finally {
    saving.value = false
  }
}

onMounted(fillFromUser)
watch(() => userStore.user, (nu) => {
  if (nu && Object.keys(nu).length > 0) fillFromUser()
}, { immediate: true })
</script>

<style scoped>
.block-title {
  font-size: 16px;
  font-weight: 600;
  margin-bottom: 12px;
  padding-bottom: 12px;
  border-bottom: 1px solid var(--border-soft);
}
.hint {
  font-size: 12px;
  color: var(--text-muted);
  line-height: 1.7;
  margin: 0 0 20px;
}

.reward-block {
  padding: 16px;
  margin-bottom: 16px;
  background: var(--bg-muted);
  border: 1px solid var(--border-soft);
  border-radius: var(--radius);
}
.reward-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}
.reward-name {
  font-size: 14px;
  font-weight: 600;
  color: var(--text);
}
.reward-name i {
  margin-right: 6px;
  font-size: 16px;
}
.qr-row {
  display: flex;
  align-items: center;
  gap: 14px;
}
.qr-preview {
  position: relative;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
}
.qr-preview img {
  width: 96px;
  height: 96px;
  object-fit: cover;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  cursor: zoom-in;
  background: #fff;
}
.qr-empty {
  flex-shrink: 0;
  width: 96px;
  height: 96px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px dashed var(--border);
  border-radius: var(--radius);
  color: var(--text-muted);
  font-size: 12px;
  background: var(--bg-card);
}
.qr-row .input {
  flex: 1;
  min-width: 0;
}

.btn-link {
  background: none;
  border: none;
  color: var(--text-muted);
  font-size: 12px;
  cursor: pointer;
  text-decoration: underline;
  padding: 0;
}
.btn-link.danger {
  color: var(--danger);
}

.btn-row {
  display: flex;
  gap: 8px;
  margin-top: 4px;
}

/* 图片预览 */
.preview-mask {
  position: fixed;
  inset: 0;
  z-index: 9999;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  cursor: zoom-out;
}
.preview-img {
  max-width: 90vw;
  max-height: 90vh;
  border-radius: var(--radius);
  background: #fff;
}
.preview-fade-enter-active,
.preview-fade-leave-active {
  transition: opacity 0.2s;
}
.preview-fade-enter-from,
.preview-fade-leave-to {
  opacity: 0;
}

@media (max-width: 480px) {
  .qr-row {
    flex-direction: column;
    align-items: stretch;
  }
  .qr-row .input {
    width: 100%;
  }
}
</style>
