<template>
  <div class="reward-wrap">
    <!-- 说明 + 开启状态 -->
    <div class="card reward-intro">
      <div class="intro-main">
        <h2 class="block-title">打赏设置</h2>
        <p class="intro-desc">
          设置个人收款码后，读者在您发布的文章详情页点击「打赏」即可看到。
          两个收款码都为空时不会显示打赏入口。
        </p>
      </div>
      <span class="intro-status" :class="hasAny ? 'is-on' : 'is-off'">
        <i :class="hasAny ? 'bi bi-check-circle-fill' : 'bi bi-exclamation-circle'" aria-hidden="true" />
        {{ hasAny ? '打赏入口已开启' : '尚未设置收款码' }}
      </span>
    </div>

    <!-- 收款码设置 -->
    <div class="reward-grid">
      <section
        v-for="ch in channels"
        :key="ch.key"
        class="card channel"
        :class="`is-${ch.key}`"
      >
        <header class="channel-head">
          <span class="channel-icon" :style="{ color: ch.color }">
            <i :class="ch.icon" aria-hidden="true" />
          </span>
          <span class="channel-name">{{ ch.label }}</span>
          <span class="channel-badge" :class="form[ch.key] ? 'is-on' : 'is-off'">
            {{ form[ch.key] ? '已设置' : '未设置' }}
          </span>
        </header>

        <!-- 收款码预览 -->
        <div
          class="qr-box"
          :class="{ 'is-empty': !form[ch.key], 'is-loading': uploading === ch.key }"
          @click="form[ch.key] && openPreview(form[ch.key])"
        >
          <img v-if="form[ch.key]" :src="form[ch.key]" :alt="`${ch.label}收款码`" />
          <template v-else>
            <i class="bi bi-qr-code" aria-hidden="true" />
            <span>暂无收款码</span>
          </template>
          <span v-if="form[ch.key]" class="qr-zoom">
            <i class="bi bi-arrows-fullscreen" aria-hidden="true" />
          </span>
          <span v-if="uploading === ch.key" class="qr-mask">
            <span class="spinner" />
          </span>
        </div>

        <!-- 操作 -->
        <div class="channel-actions">
          <label class="btn btn-sm btn-primary">
            <i class="bi bi-cloud-upload" /> {{ uploading === ch.key ? '上传中...' : '上传图片' }}
            <input
              v-if="uploading !== ch.key"
              type="file"
              accept="image/*"
              hidden
              @change="(e) => onFileChange(e, ch.key)"
            />
          </label>
          <button type="button" class="btn btn-sm" title="从附件库选择" @click="openLibrary(ch.key)">
            <i class="bi bi-folder2-open" /> 附件库
          </button>
          <button
            v-if="form[ch.key]"
            type="button"
            class="btn btn-sm btn-ghost remove-btn"
            @click="removeChannel(ch.key)"
          >
            <i class="bi bi-trash3" /> 移除
          </button>
        </div>

        <!-- 或粘贴链接 -->
        <div class="channel-url">
          <i class="bi bi-link-45deg" aria-hidden="true" />
          <input
            v-model="form[ch.key]"
            class="url-input"
            type="text"
            :placeholder="`或粘贴${ch.label}图片链接`"
          />
          <button
            v-if="form[ch.key]"
            type="button"
            class="url-clear"
            title="清空"
            @click="form[ch.key] = ''"
          >
            <i class="bi bi-x-lg" />
          </button>
        </div>

        <p class="channel-tip">{{ ch.tip }}</p>
      </section>
    </div>

    <!-- 读者端效果预览 -->
    <div class="card preview-card">
      <h2 class="block-title">读者看到的效果</h2>
      <div class="preview-layout">
        <!-- 仿文章详情页的打赏弹窗 -->
        <div class="demo-dialog">
          <div class="demo-header">
            <span>感谢支持</span>
            <i class="bi bi-x-lg" aria-hidden="true" />
          </div>
          <div v-if="previewTabs.length > 1" class="demo-tabs">
            <button
              v-for="t in previewTabs"
              :key="t.key"
              type="button"
              class="demo-tab"
              :class="{ active: previewTab === t.key }"
              @click="previewTab = t.key"
            >{{ t.label }}</button>
          </div>
          <div class="demo-body">
            <p class="demo-tip">如果这篇文章对你有帮助，欢迎打赏支持作者～</p>
            <img
              v-if="previewSrc"
              :src="previewSrc"
              class="demo-qr"
              :alt="`${previewChannel?.label || ''}收款码`"
            />
            <div v-else class="demo-empty">
              <i class="bi bi-qr-code" aria-hidden="true" />
              <span>设置收款码后，这里会显示二维码</span>
            </div>
            <div v-if="previewSrc" class="demo-label">
              {{ previewChannel?.label }}扫码支持
            </div>
          </div>
        </div>

        <ul class="preview-tips">
          <li><i class="bi bi-check2" aria-hidden="true" /> 建议使用 400×400 以上的清晰收款码，避免扫码失败</li>
          <li><i class="bi bi-check2" aria-hidden="true" /> 微信、支付宝可只设置其一，弹窗标签会自动适配</li>
          <li><i class="bi bi-check2" aria-hidden="true" /> 收款码保存在你的个人资料中，仅用于读者打赏展示</li>
        </ul>
      </div>
    </div>

    <!-- 保存栏 -->
    <div class="card save-bar">
      <span class="save-tip" :class="{ 'is-dirty': dirty }">
        <i :class="dirty ? 'bi bi-exclamation-circle' : 'bi bi-check2-circle'" aria-hidden="true" />
        {{ dirty ? '有未保存的修改' : '已与服务器同步' }}
      </span>
      <div class="save-actions">
        <button class="btn" :disabled="saving" @click="reset">重置</button>
        <button class="btn btn-primary" :disabled="saving" @click="save">
          {{ saving ? '保存中...' : '保存修改' }}
        </button>
      </div>
    </div>

    <!-- 附件库（选择已上传图片作为收款码） -->
    <AttachmentLibrary
      v-model:visible="showLibrary"
      title="选择收款码图片"
      accept="image"
      @select="onLibrarySelect"
    />

    <!-- 图片预览灯箱 -->
    <Teleport to="body">
      <transition name="preview-fade">
        <div v-if="previewBig" class="preview-mask" @click="previewBig = ''">
          <img :src="previewBig" class="preview-img" alt="预览" />
        </div>
      </transition>
    </Teleport>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, watch } from 'vue'
import { useUserStore } from '@/stores/user'
import { updateUser, uploadAvatar } from '@/api/users'
import AttachmentLibrary from '@/components/AttachmentLibrary.vue'
import { toast } from '@/utils/toast'

const userStore = useUserStore()

// 收款渠道配置
const channels = [
  {
    key: 'wechat',
    label: '微信收款码',
    short: '微信',
    icon: 'bi bi-wechat',
    color: '#07c160',
    tip: '在微信「我 → 服务 → 收付款 → 二维码收款」中保存收款码'
  },
  {
    key: 'alipay',
    label: '支付宝收款码',
    short: '支付宝',
    icon: 'bi bi-credit-card-2-front',
    color: '#1677ff',
    tip: '在支付宝「收钱」页面保存收款码图片'
  }
]

const form = reactive({ wechat: '', alipay: '' })
const original = reactive({ wechat: '', alipay: '' })
const saving = ref(false)
// 上传状态：'' 空闲，'wechat' / 'alipay' 上传中
const uploading = ref('')
// 灯箱预览
const previewBig = ref('')

const hasAny = computed(() => !!(form.wechat || form.alipay))
const dirty = computed(() => form.wechat !== original.wechat || form.alipay !== original.alipay)

// 读者端弹窗预览：只展示已设置的渠道
const previewTab = ref('wechat')
const previewTabs = computed(() => channels.filter((ch) => form[ch.key]).map((ch) => ({ key: ch.key, label: ch.short })))
// 当前预览渠道（标签与图源保持一致，避免只有一个渠道时错位）
const previewChannel = computed(
  () => previewTabs.value.find((t) => t.key === previewTab.value) || previewTabs.value[0] || null
)
const previewSrc = computed(() => (previewChannel.value ? form[previewChannel.value.key] : ''))

watch(
  previewTabs,
  (tabs) => {
    if (!tabs.some((t) => t.key === previewTab.value)) {
      previewTab.value = tabs[0]?.key || 'wechat'
    }
  },
  { immediate: true }
)

function fillFromUser() {
  const reward = userStore.user?.json?.reward || {}
  form.wechat = reward.wechat || ''
  form.alipay = reward.alipay || ''
  Object.assign(original, { ...form })
}

function reset() {
  Object.assign(form, { ...original })
  toast.info('已还原为上次保存的内容')
}

function removeChannel(key) {
  form[key] = ''
}

function openPreview(src) {
  previewBig.value = src
}

// 附件库：选择已上传图片作为收款码（wechat / alipay）
const showLibrary = ref(false)
const libraryTarget = ref('wechat')
function openLibrary(type) {
  libraryTarget.value = type
  showLibrary.value = true
}
function onLibrarySelect(urls = []) {
  const url = urls[0]
  if (!url) return
  form[libraryTarget.value] = url
  toast.success('已应用，请点击「保存修改」生效')
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
.reward-wrap {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.block-title {
  font-size: 16px;
  font-weight: 600;
  color: var(--text);
  margin: 0 0 10px;
}

/* ---------- 说明卡 ---------- */
.reward-intro {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 12px;
  padding: 18px 20px;
}
.intro-main {
  min-width: 0;
  flex: 1;
}
.intro-desc {
  margin: 0;
  font-size: 13px;
  line-height: 1.7;
  color: var(--text-muted);
}
.intro-status {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
  padding: 6px 12px;
  font-size: 12px;
  font-weight: 500;
  border-radius: 999px;
}
.intro-status.is-on {
  background: rgba(108, 154, 77, 0.12);
  color: var(--success);
}
.intro-status.is-off {
  background: var(--gold-wash);
  color: var(--warning);
}

/* ---------- 收款渠道 ---------- */
.reward-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 16px;
}
.channel {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 18px;
}
.channel-head {
  display: flex;
  align-items: center;
  gap: 8px;
}
.channel-icon {
  width: 30px;
  height: 30px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  border-radius: 50%;
  background: var(--bg-muted);
  flex-shrink: 0;
}
.channel-name {
  font-size: 14px;
  font-weight: 600;
  color: var(--text);
}
.channel-badge {
  margin-left: auto;
  padding: 2px 8px;
  font-size: 11px;
  border-radius: 999px;
}
.channel-badge.is-on {
  background: rgba(108, 154, 77, 0.12);
  color: var(--success);
}
.channel-badge.is-off {
  background: var(--bg-muted);
  color: var(--text-muted);
}

/* 收款码预览 */
.qr-box {
  position: relative;
  width: 132px;
  height: 132px;
  margin: 2px auto 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6px;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background: var(--bg-muted);
  overflow: hidden;
}
.qr-box:not(.is-empty) {
  cursor: zoom-in;
}
.qr-box img {
  width: 100%;
  height: 100%;
  object-fit: contain;
  background: #fff;
}
.qr-box.is-empty {
  border-style: dashed;
  color: var(--text-light);
  font-size: 12px;
}
.qr-box.is-empty .bi {
  font-size: 26px;
}
.qr-zoom {
  position: absolute;
  right: 6px;
  bottom: 6px;
  width: 22px;
  height: 22px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  color: #fff;
  background: rgba(0, 0, 0, 0.45);
  border-radius: 50%;
  opacity: 0;
  transition: opacity 0.15s;
}
.qr-box:not(.is-empty):hover .qr-zoom {
  opacity: 1;
}
.qr-mask {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--bg-overlay);
}

/* 操作按钮 */
.channel-actions {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
}
.remove-btn {
  margin-left: auto;
  color: var(--danger);
}
.remove-btn:hover {
  background: var(--accent-wash);
  color: var(--danger);
}

/* 链接输入 */
.channel-url {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 0 10px;
  height: 36px;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background: var(--bg-card);
  transition: border-color 0.2s, box-shadow 0.2s;
}
.channel-url:focus-within {
  border-color: var(--primary);
  box-shadow: 0 0 0 3px var(--accent-ring);
}
.channel-url > .bi {
  font-size: 14px;
  color: var(--text-light);
  flex-shrink: 0;
}
.url-input {
  flex: 1;
  min-width: 0;
  border: none;
  outline: none;
  background: transparent;
  color: var(--text);
  font-size: 13px;
  font-family: inherit;
}
.url-clear {
  flex-shrink: 0;
  width: 20px;
  height: 20px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 10px;
  border: none;
  border-radius: 50%;
  background: var(--bg-muted);
  color: var(--text-muted);
  cursor: pointer;
}
.url-clear:hover {
  background: var(--accent-soft);
  color: var(--danger);
}
.channel-tip {
  margin: 0;
  font-size: 11px;
  line-height: 1.6;
  color: var(--text-light);
}

/* ---------- 读者端预览 ---------- */
.preview-card {
  padding: 18px 20px;
}
.preview-layout {
  display: flex;
  align-items: flex-start;
  gap: 24px;
  flex-wrap: wrap;
}
.demo-dialog {
  width: 280px;
  flex-shrink: 0;
  border: 1px solid var(--border);
  border-radius: var(--radius-xl);
  background: var(--bg-card);
  overflow: hidden;
}
.demo-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  font-size: 14px;
  font-weight: 600;
  color: var(--text);
  background: linear-gradient(135deg, var(--gold-wash), var(--accent-wash));
  border-bottom: 1px solid var(--border-soft);
}
.demo-header .bi {
  font-size: 12px;
  color: var(--text-light);
}
.demo-tabs {
  display: flex;
  border-bottom: 1px solid var(--border-soft);
}
.demo-tab {
  flex: 1;
  padding: 8px;
  font-family: inherit;
  font-size: 13px;
  border: none;
  background: transparent;
  color: var(--text-muted);
  cursor: pointer;
  border-bottom: 2px solid transparent;
  transition: color 0.2s, border-color 0.2s;
}
.demo-tab:hover,
.demo-tab.active {
  color: var(--primary);
}
.demo-tab.active {
  border-bottom-color: var(--primary);
}
.demo-body {
  padding: 18px 16px;
  text-align: center;
}
.demo-tip {
  margin: 0 0 12px;
  font-size: 12px;
  color: var(--text-muted);
}
.demo-qr {
  width: 160px;
  height: 160px;
  margin: 0 auto;
  padding: 6px;
  object-fit: contain;
  background: #fff;
  border: 1px solid var(--border-soft);
  border-radius: var(--radius);
}
.demo-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  width: 160px;
  height: 160px;
  margin: 0 auto;
  font-size: 12px;
  color: var(--text-light);
  border: 1px dashed var(--border);
  border-radius: var(--radius);
}
.demo-empty .bi {
  font-size: 26px;
}
.demo-label {
  margin-top: 10px;
  font-size: 12px;
  font-weight: 500;
  color: var(--primary-deep);
}
.preview-tips {
  flex: 1;
  min-width: 220px;
  margin: 4px 0 0;
  padding: 0;
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.preview-tips li {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  font-size: 12px;
  line-height: 1.7;
  color: var(--text-muted);
}
.preview-tips .bi {
  margin-top: 3px;
  font-size: 12px;
  color: var(--success);
}

/* ---------- 保存栏 ---------- */
.save-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 12px;
  padding: 14px 20px;
}
.save-tip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: var(--text-muted);
}
.save-tip .bi {
  color: var(--success);
}
.save-tip.is-dirty {
  color: var(--warning);
}
.save-tip.is-dirty .bi {
  color: var(--warning);
}
.save-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-left: auto;
}

/* ---------- 灯箱 ---------- */
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

@media (max-width: 640px) {
  .reward-intro {
    flex-direction: column;
    align-items: flex-start;
  }
  .preview-layout {
    flex-direction: column;
    gap: 16px;
  }
  .demo-dialog {
    width: 100%;
  }
  .save-actions {
    width: 100%;
    justify-content: flex-end;
  }
}
</style>
