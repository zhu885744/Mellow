<template>
  <div>
    <div class="profile-layout">
      <!-- 头像设置 -->
      <div class="card card-pad avatar-card">
        <h2 class="block-title">头像设置</h2>

        <!-- 头像预览 + 操作 -->
        <div class="avatar-top">
          <div class="avatar-preview">
            <AvatarFrame
              :src="form.avatar"
              :name="form.nickname"
              :frame="form.frame"
              :animated="frameRender.animated"
              :fallback="defaultAvatar"
              :size="'75px'"
              :frame-hole="frameRender.hole"
              :frame-offset-x="frameRender.offsetX"
              :frame-offset-y="frameRender.offsetY"
              alt="头像预览"
            />
          </div>
          <div class="avatar-controls">
            <label class="btn btn-sm btn-primary">
              <i class="bi bi-cloud-upload" /> {{ uploading ? '上传中...' : '上传头像' }}
              <input
                v-if="!uploading"
                type="file"
                accept="image/*"
                hidden
                @change="onAvatarFileChange"
              />
            </label>
            <button type="button" class="btn btn-sm" title="从附件库选择头像" @click="showLibrary = true">
              <i class="bi bi-folder2-open" /> 从附件库选择
            </button>
            <p class="hint">支持 JPG、PNG、GIF，建议 1:1 比例；修改后点「保存修改」生效。</p>
          </div>
        </div>

        <!-- 附件库（选择已上传图片作为头像） -->
        <AttachmentLibrary
          v-model:visible="showLibrary"
          title="选择头像"
          accept="image"
          @select="onLibrarySelect"
        />

        <!-- 默认头像 -->
        <div v-if="DEFAULT_AVATARS.length" class="preset-section">
          <div class="preset-label"><span><i class="bi bi-people" /> 默认头像</span></div>
          <div class="frame-grid">
            <button
              v-for="(url, idx) in DEFAULT_AVATARS"
              :key="idx"
              :class="['frame-item', { 'is-selected': form.avatar === url }]"
              @click="selectDefaultAvatar(url)"
            >
              <img :src="url" :alt="`默认头像 ${idx + 1}`" loading="lazy" />
            </button>
          </div>
        </div>

        <!-- 主页封面（存 users.json.cover）：自定义图片 / 自定义颜色 二选一，用户主页顶部横幅使用 -->
        <div class="preset-section">
          <div class="preset-label">
            <span><i class="bi bi-image" /> 主页封面</span>
            <button v-if="hasCover" type="button" class="btn btn-xs" @click="clearCover">恢复默认</button>
          </div>

          <!-- 封面类型：图片 / 颜色 -->
          <div class="cover-mode">
            <button
              v-for="m in COVER_MODES"
              :key="m.key"
              type="button"
              class="cover-mode-item"
              :class="{ 'is-active': coverMode === m.key }"
              @click="switchCoverMode(m.key)"
            >
              <i :class="m.icon" aria-hidden="true" /> {{ m.label }}
            </button>
          </div>

          <!-- 自定义图片 -->
          <template v-if="coverMode === 'image'">
            <div class="cover-preview" :class="{ 'is-empty': !form.cover }">
              <img v-if="form.cover" :src="form.cover" alt="主页封面预览" loading="lazy" />
              <span v-else>未设置封面，用户主页将使用主题色渐变</span>
            </div>
            <div class="cover-actions">
              <label class="btn btn-sm btn-primary">
                <i class="bi bi-cloud-upload" /> {{ coverUploading ? '上传中...' : '上传封面' }}
                <input
                  v-if="!coverUploading"
                  type="file"
                  accept="image/*"
                  hidden
                  @change="onCoverFileChange"
                />
              </label>
              <button type="button" class="btn btn-sm" title="从附件库选择封面" @click="showCoverLibrary = true">
                <i class="bi bi-folder2-open" /> 从附件库选择
              </button>
            </div>
            <p class="hint">建议 16:9 或更宽（如 1200×480）；保存后点「保存修改」生效。</p>
          </template>

          <!-- 自定义颜色 -->
          <template v-else>
            <div
              class="cover-preview is-color"
              :style="{ background: form.coverColor || DEFAULT_COVER_COLOR }"
            >
              <span class="cover-color-hex">{{ form.coverColor || DEFAULT_COVER_COLOR }}</span>
            </div>
            <div class="cover-actions">
              <input
                v-model="coverColorPicker"
                type="color"
                class="cover-color-input"
                aria-label="选择封面颜色"
              />
              <input
                v-model="form.coverColor"
                class="input cover-color-text"
                maxlength="7"
                placeholder="#c7482a"
                aria-label="封面颜色色值"
              />
              <button
                v-for="c in COVER_COLORS"
                :key="c"
                type="button"
                class="cover-swatch"
                :class="{ 'is-active': (form.coverColor || '').toLowerCase() === c }"
                :style="{ background: c }"
                :title="c"
                :aria-label="`使用颜色 ${c}`"
                @click="form.coverColor = c"
              />
            </div>
            <p class="hint">用取色器或直接填色值都可以；保存后点「保存修改」生效。</p>
          </template>
        </div>

        <!-- 附件库（选择已上传图片作为封面） -->
        <AttachmentLibrary
          v-model:visible="showCoverLibrary"
          title="选择封面"
          accept="image"
          @select="onCoverLibrarySelect"
        />

      </div>

      <!-- 基本信息表单 -->
      <div class="card card-pad">
        <h2 class="block-title">个人信息</h2>
        <form @submit.prevent="save">
          <div class="form-item">
            <label class="form-label">昵称</label>
            <input v-model="form.nickname" class="input" placeholder="请输入昵称" maxlength="20" />
          </div>

          <div class="form-item">
            <label class="form-label">性别</label>
            <div class="radio-row">
              <label class="radio-item"><input type="radio" :value="1" v-model="form.gender" /> 男</label>
              <label class="radio-item"><input type="radio" :value="2" v-model="form.gender" /> 女</label>
              <label class="radio-item"><input type="radio" :value="0" v-model="form.gender" /> 保密</label>
            </div>
          </div>

          <div class="form-item">
            <label class="form-label">头衔</label>
            <!-- 只读展示当前头衔：佩戴 / 卸下 / 换字统一在「我的装扮」里操作 -->
            <div class="current-title-row">
              <span class="current-title-label">当前头衔：</span>
              <!-- 佩戴了装扮头衔时用 TitleBadge 还原后台配色（文字色 / 背景 / 边框 / 发光 / 图标 / 动效） -->
              <TitleBadge
                v-if="form.title || currentTitlePayload"
                :payload="currentTitlePayload || {}"
                :text="form.title"
              />
              <span v-else :class="['current-title', { empty: !form.title }]">
                {{ form.title || '未设置' }}
              </span>
              <RouterLink to="/user/decorations" class="decoration-link">去我的装扮更换</RouterLink>
            </div>
            <p class="hint">头衔与头像框统一在「我的装扮」中佩戴、卸下。</p>
          </div>

          <div class="form-item">
            <label class="form-label">个人简介</label>
            <textarea v-model="form.description" class="textarea" rows="4" maxlength="200" placeholder="请输入个人简介" />
            <div class="char-count">{{ form.description.length }}/200</div>
          </div>

          <div class="form-item">
            <label class="form-label">联系方式</label>
            <div class="contact-readonly">
              <div class="input is-disabled"><i class="bi bi-phone" /> {{ userStore.user?.phone || '未设置' }}</div>
              <div class="input is-disabled"><i class="bi bi-envelope" /> {{ userStore.user?.email || '未设置' }}</div>
            </div>
            <p class="hint">
              邮箱和手机号是登录凭证，修改入口在
              <RouterLink to="/user/security" class="hint-link">账号安全</RouterLink>
            </p>
          </div>

          <div class="form-item">
            <label class="form-label">个人网站</label>
            <input v-model="form.websiteName" class="input" placeholder="网站名称" maxlength="50" />
            <input
              v-model="form.websiteUrl"
              class="input website-url"
              placeholder="https://blog.example.com"
              maxlength="100"
            />
            <p class="hint">展示在你的个人主页上，两项都留空表示不展示</p>
          </div>

          <div class="btn-row">
            <button class="btn btn-primary" :disabled="loading" type="submit">
              {{ loading ? '保存中...' : '保存修改' }}
            </button>
            <button class="btn" type="button" :disabled="loading" @click="resetForm">重置</button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, watch } from 'vue'
import { useUserStore } from '@/stores/user'
import { useSiteStore } from '@/stores/site'
import { updateUser, uploadAvatar } from '@/api/users'
import { toast } from '@/utils/toast'
import AvatarFrame from '@/components/AvatarFrame.vue'
import TitleBadge from '@/components/TitleBadge.vue'
import AttachmentLibrary from '@/components/AttachmentLibrary.vue'
import { pickUserTitlePayload } from '@/utils/helper'
import { resolveFrameRender } from '@/utils/frameRender'

const userStore = useUserStore()
const siteStore = useSiteStore()

// 头衔样式 / 头像框动效（都由装扮系统写入 users.json，佩戴时服务端回写）
const currentTitlePayload = computed(() => pickUserTitlePayload(userStore.user))
// 头像框渲染参数：以装扮 payload 为准（users.json 上的副本只作兜底）
const frameRender = computed(() => resolveFrameRender(userStore.user?.json))

const BUILTIN_AVATARS = [
  'https://img.zhuxu.asia/tx/1.png',
  'https://img.zhuxu.asia/tx/2.png',
  'https://img.zhuxu.asia/tx/3.png',
  'https://img.zhuxu.asia/tx/4.png',
  'https://img.zhuxu.asia/tx/5.png'
]
// 优先用后台「默认值设置 → 默认头像」配置；未配置时使用主题内置头像兜底
const DEFAULT_AVATARS = ref(BUILTIN_AVATARS)

// 注意：头像框 / 头衔的佩戴、卸下、换字全部收口在「我的装扮」(/user/decorations)，
// 本页只做「头像上传 + 基本信息」——这里不再拉取装扮数据、也不提供装扮设置控件。

const defaultAvatar = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 80"><circle cx="40" cy="40" r="40" fill="%23e8e6dd"/></svg>'

const loading = ref(false)
const uploading = ref(false)
const showAvatarUrlInput = ref(false)
const customAvatarUrl = ref('')
// 主页封面：上传状态 + 附件库开关
const coverUploading = ref(false)
const showCoverLibrary = ref(false)

// ===== 主页封面：自定义图片 / 自定义颜色 二选一 =====
// 当前选择的封面类型：image 自定义图片 / color 自定义颜色
const coverMode = ref('image')
const COVER_MODES = [
  { key: 'image', label: '自定义图片', icon: 'bi-image' },
  { key: 'color', label: '自定义颜色', icon: 'bi-palette' }
]
// 常用色（第一枚即站点朱砂主色），点一下直接套用
const COVER_COLORS = ['#c7482a', '#c8a04a', '#2e7a5c', '#2f6f8f', '#6c5ce7', '#4a4f57']
// 默认封面色：优先取当前主题的主色（--primary），取不到时用朱砂兜底
const DEFAULT_COVER_COLOR = (() => {
  const value = typeof document !== 'undefined'
    ? getComputedStyle(document.documentElement).getPropertyValue('--primary').trim()
    : ''
  return /^#[0-9a-f]{6}$/i.test(value) ? value.toLowerCase() : '#c7482a'
})()

const hasCover = computed(() => !!(form.cover || form.coverColor))

// #rgb / #rrggbb → #rrggbb（<input type="color"> 只认 6 位色值）
function normalizeHex(value) {
  const raw = String(value || '').trim()
  if (/^#[0-9a-f]{3}$/i.test(raw)) {
    return `#${raw[1]}${raw[1]}${raw[2]}${raw[2]}${raw[3]}${raw[3]}`.toLowerCase()
  }
  return /^#[0-9a-f]{6}$/i.test(raw) ? raw.toLowerCase() : ''
}

// 取色器只接受合法色值：为空或非法时先给默认色，保证「不动它也能保存」
const coverColorPicker = computed({
  get: () => normalizeHex(form.coverColor) || DEFAULT_COVER_COLOR,
  set: (value) => { form.coverColor = value }
})

function switchCoverMode(mode) {
  coverMode.value = mode
  // 切到颜色模式且还没选过颜色时，先给一个主题主色，避免预览空白
  if (mode === 'color' && !form.coverColor) form.coverColor = DEFAULT_COVER_COLOR
}

function clearCover() {
  form.cover = ''
  form.coverColor = ''
  coverMode.value = 'image'
}

const form = reactive({
  id: '',
  nickname: '',
  gender: 0,
  description: '',
  avatar: '',
  title: '',
  frame: '',
  // 主页封面（存 users.json.cover）：用户主页顶部横幅，图片 / 颜色二选一
  cover: '',
  // 颜色封面的色值（json.cover = { type: 'color', value }）
  coverColor: '',
  // 个人网站（存 users.json.website）：展示在个人主页，原「联系方式」页的功能
  websiteName: '',
  websiteUrl: ''
})
const originalData = reactive({})

function onAvatarFileChange(e) {
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
  uploading.value = true
  const params = new FormData()
  params.append('file', file, file.name)
  uploadAvatar(params)
    .then((res) => {
      const url = res.data?.results?.[0]?.full_url || res.data?.results?.[0]?.url || ''
      if (url) {
        form.avatar = url
        toast.success('头像上传成功，请点击「保存修改」完成更新')
      } else {
        toast.error('上传失败，请重试')
      }
    })
    .catch(() => {
      toast.error('上传失败，请稍后重试')
    })
    .finally(() => {
      uploading.value = false
      e.target.value = ''
    })
}

// 主页封面上传（存 json.cover，手机端用户主页顶部横幅使用）
function onCoverFileChange(e) {
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
  coverUploading.value = true
  const params = new FormData()
  params.append('file', file, file.name)
  uploadAvatar(params)
    .then((res) => {
      const url = res.data?.results?.[0]?.full_url || res.data?.results?.[0]?.url || ''
      if (url) {
        form.cover = url
        toast.success('封面上传成功，请点击「保存修改」完成更新')
      } else {
        toast.error('上传失败，请重试')
      }
    })
    .catch(() => {
      toast.error('上传失败，请稍后重试')
    })
    .finally(() => {
      coverUploading.value = false
      e.target.value = ''
    })
}

// 附件库：选择已上传图片作为封面
function onCoverLibrarySelect(urls = []) {
  const url = urls[0]
  if (!url) return
  form.cover = url
  toast.success('封面已应用，请点击「保存修改」完成更新')
}

// 附件库：选择已上传图片作为头像
const showLibrary = ref(false)
function onLibrarySelect(urls = []) {
  const url = urls[0]
  if (!url) return
  form.avatar = url
  toast.success('头像已应用，请点击「保存修改」完成更新')
}

function applyCustomAvatar() {
  const url = customAvatarUrl.value.trim()
  if (!url) {
    toast.warning('请输入头像链接')
    return
  }
  if (!/^https?:\/\//.test(url)) {
    toast.warning('请输入有效的图片链接（以 http:// 或 https:// 开头）')
    return
  }
  form.avatar = url
  showAvatarUrlInput.value = false
  customAvatarUrl.value = ''
  toast.success('头像链接已应用，请点击「保存修改」完成更新')
}

function selectDefaultAvatar(url) {
  form.avatar = url
  showAvatarUrlInput.value = false
  customAvatarUrl.value = ''
  toast.success('已选择默认头像，请点击「保存修改」完成更新')
}

function removeAvatar() {
  form.avatar = ''
  toast.info('头像已移除，请点击「保存修改」完成更新')
}

function fetchUserInfo() {
  const u = userStore.user
  if (u && Object.keys(u).length > 0) {
    form.id = u.id
    form.nickname = u.nickname || ''
    // 性别映射
    if (u.gender === 'boy') form.gender = 1
    else if (u.gender === 'girl') form.gender = 2
    else if (typeof u.gender === 'number') form.gender = u.gender
    else form.gender = 0
    form.description = u.description || ''
    form.avatar = u.avatar || ''
    // title / frame 由装扮系统维护（佩戴时服务端自动回写），这里仅用于展示
    form.title = u.title || ''
    form.frame = u.json?.frame || ''
    // 主页封面：兼容早期「字符串 = 图片地址」与 { type, value } 两种写法
    const rawCover = u.json?.cover
    if (typeof rawCover === 'string' && rawCover) {
      form.cover = rawCover
      form.coverColor = ''
      coverMode.value = 'image'
    } else if (rawCover && typeof rawCover === 'object' && rawCover.value) {
      if (rawCover.type === 'color') {
        form.coverColor = normalizeHex(rawCover.value) || DEFAULT_COVER_COLOR
        form.cover = ''
        coverMode.value = 'color'
      } else {
        form.cover = rawCover.value
        form.coverColor = ''
        coverMode.value = 'image'
      }
    } else {
      form.cover = ''
      form.coverColor = ''
      coverMode.value = 'image'
    }
    // 个人网站（json.website）：缺省按未设置处理
    const website = u.json?.website && typeof u.json.website === 'object' ? u.json.website : {}
    form.websiteName = website.name || ''
    form.websiteUrl = website.url || ''
    Object.assign(originalData, { ...form })
  }
}

function resetForm() {
  Object.assign(form, { ...originalData })
  showAvatarUrlInput.value = false
  customAvatarUrl.value = ''
}

async function save() {
  loading.value = true
  try {
    // 性别映射：1->boy, 2->girl, 0->空
    const genderMap = { 1: 'boy', 2: 'girl', 0: '' }
    // 头衔 / 头像框由装扮系统维护（佩戴走 /decoration/wear 服务端回写），
    // 这里不再提交，避免把服务端已写入的值覆盖回旧值；json 原样回传以防后端整体替换
    const currentJson = (userStore.user?.json && typeof userStore.user.json === 'object') ? { ...userStore.user.json } : {}
    // 主页封面写入 json.cover（图片 / 颜色二选一）；未设置时删掉该键，回到主题色渐变
    if (coverMode.value === 'color') {
      // 颜色模式下色值非法时回落到默认色，避免「填错就静默清空封面」
      currentJson.cover = { type: 'color', value: normalizeHex(form.coverColor) || DEFAULT_COVER_COLOR }
    } else if (coverMode.value === 'image' && form.cover) {
      currentJson.cover = { type: 'image', value: form.cover }
    } else {
      delete currentJson.cover
    }

    // 个人网站写入 json.website（名称 + 网址）；两项都为空时删掉该键，个人主页不再展示
    const websiteName = String(form.websiteName || '').trim()
    const websiteUrl = String(form.websiteUrl || '').trim()
    if (websiteUrl && !/^https?:\/\//.test(websiteUrl)) {
      toast.error('请输入有效的网站网址（以 http:// 或 https:// 开头）')
      return
    }
    if (websiteName || websiteUrl) {
      currentJson.website = { name: websiteName, url: websiteUrl }
    } else {
      delete currentJson.website
    }

    const payload = {
      id: form.id,
      nickname: form.nickname,
      description: form.description,
      avatar: form.avatar,
      json: currentJson
    }
    if (form.gender !== 0) {
      payload.gender = genderMap[form.gender]
    }

    await updateUser(payload)
    toast.success('用户信息更新成功')
    // 同步用户信息
    await userStore.checkLoginState()
    Object.assign(originalData, { ...form })
  } catch {
    // 错误已由拦截器提示
  } finally {
    loading.value = false
  }
}

onMounted(async () => {
  fetchUserInfo()
  // 读取后台配置的默认头像（Mellow_functions）
  try {
    const site = await siteStore.load()
    // 开关关闭：前台不展示任何预设头像，用户只能自行上传
    if (site?.default_avatars_enabled === false) {
      DEFAULT_AVATARS.value = []
      return
    }
    const list = site?.default_avatars
    if (Array.isArray(list)) {
      // 已配置（含空数组）：尊重之——管理员删光后前台即无预设头像
      DEFAULT_AVATARS.value = list.filter((u) => typeof u === 'string' && u.trim())
    }
    // 字段不存在（从未配置）：保持内置兜底（DEFAULT_AVATARS 初始值）
  } catch {
    /* 读取失败保持内置头像兜底 */
  }
})
watch(() => userStore.user, (nu) => {
  if (nu && Object.keys(nu).length > 0) fetchUserInfo()
}, { immediate: true })
</script>

<style scoped>
.block-title {
  font-size: 16px;
  font-weight: 600;
  margin-bottom: 16px;
  padding-bottom: 12px;
  border-bottom: 1px solid var(--border-soft);
}
.profile-layout {
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.avatar-top {
  display: flex;
  align-items: center;
  gap: 20px;
  padding: 16px;
  background: var(--bg-muted);
  border: 1px solid var(--border-soft);
  border-radius: var(--radius);
  margin-bottom: 16px;
}
.avatar-preview {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 75px;
  height: 75px;
  background: var(--bg-card);
  border-radius: 50%;
  border: 1px dashed var(--border);
}
.big-avatar {
  width: 100px;
  height: 100px;
  border-radius: 50%;
  object-fit: cover;
  border: 2px solid var(--border);
}
.avatar-controls {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 10px;
}
.avatar-controls .btn {
  min-width: 116px;
  justify-content: center;
}
.url-input-row {
  display: flex;
  gap: 8px;
  margin-bottom: 16px;
}
.url-input-row .input {
  flex: 1;
}
.preset-section {
  margin-bottom: 16px;
}
.preset-label {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 13px;
  font-weight: 600;
  color: var(--text-soft);
  margin-bottom: 10px;
}
.preset-label i {
  margin-right: 6px;
  color: var(--primary);
}
/* ---------- 主页封面（手机端用户主页顶部横幅使用） ---------- */
.cover-preview {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 92px;
  margin-bottom: 10px;
  border: 1px solid var(--border);
  border-radius: 4px;
  background: var(--bg-muted);
  overflow: hidden;
}
.cover-preview img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
}
/* 未设置封面：虚线框 + 一行说明，明确会回落到主题色渐变 */
.cover-preview.is-empty {
  border-style: dashed;
  font-size: 12px;
  color: var(--text-muted);
}
.cover-actions {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 10px;
}
/* 封面类型切换：自定义图片 / 自定义颜色 */
.cover-mode {
  display: inline-flex;
  gap: 2px;
  padding: 2px;
  margin-bottom: 10px;
  border-radius: 999px;
  background: var(--bg-muted);
}
.cover-mode-item {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 12px;
  border: none;
  border-radius: 999px;
  background: transparent;
  color: var(--text-soft);
  font-size: 12px;
  font-family: inherit;
  line-height: 1.5;
  cursor: pointer;
  transition: all 0.18s;
}
.cover-mode-item:hover {
  color: var(--primary);
}
.cover-mode-item.is-active {
  background: var(--bg-card);
  color: var(--primary-deep);
  font-weight: 600;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
}
/* 颜色模式预览：铺满所选颜色，中间标出色值 */
.cover-preview.is-color {
  border-color: transparent;
}
.cover-color-hex {
  padding: 2px 8px;
  border-radius: 4px;
  background: rgba(0, 0, 0, 0.3);
  color: #fff;
  font-size: 12px;
  font-variant-numeric: tabular-nums;
}
.cover-color-input {
  width: 40px;
  height: var(--control-h-sm);
  padding: 0;
  border: 1px solid var(--border);
  border-radius: 4px;
  background: var(--bg-card);
  cursor: pointer;
}
.cover-color-text {
  width: 104px;
  font-variant-numeric: tabular-nums;
}
.cover-swatch {
  width: 22px;
  height: 22px;
  padding: 0;
  border: 1px solid var(--border);
  border-radius: 50%;
  cursor: pointer;
  transition: transform 0.15s, box-shadow 0.15s;
}
.cover-swatch:hover {
  transform: translateY(-1px);
}
.cover-swatch.is-active {
  box-shadow: 0 0 0 2px var(--bg-card), 0 0 0 4px var(--primary);
}
.frame-grid {
  /* 预设头像只有 5 个：写死列数会让宽屏把它们均分成大方块，
     改用固定尺寸 + auto-fill，格子大小可控，窄屏自动换行 */
  --preset-size: 56px;
  display: grid;
  grid-template-columns: repeat(auto-fill, var(--preset-size));
  gap: 8px;
}
.frame-item {
  position: relative;
  width: var(--preset-size);
  height: var(--preset-size);
  padding: 4px;
  background: var(--bg-card);
  border: 2px solid var(--border);
  border-radius: var(--radius);
  cursor: pointer;
  overflow: hidden;
  transition: all 0.2s;
}
.frame-item img {
  width: 100%;
  height: 100%;
  object-fit: contain;
  display: block;
}
.frame-item:hover {
  border-color: var(--primary);
  transform: translateY(-2px);
}
.frame-item.is-selected {
  border-color: var(--primary);
  box-shadow: 0 0 0 3px var(--accent-ring);
}
.hint {
  font-size: 11px;
  color: var(--text-muted);
  line-height: 1.6;
  margin-top: 0;
}

/* 当前头衔：只读展示（佩戴 / 卸下 / 换字都在「我的装扮」） */
.current-title-row {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 12px;
  padding: 10px 12px;
  background: var(--bg-muted);
  border-radius: var(--radius-sm);
  border: 1px solid var(--border);
}
.current-title-label {
  font-size: 13px;
  color: var(--text-soft);
}
.current-title {
  display: inline-flex;
  align-items: center;
  padding: 3px 10px;
  font-size: 12px;
  font-weight: 600;
  color: var(--text);
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: 4px;
}
.current-title.empty {
  color: var(--text-muted);
  font-weight: 400;
}
/* 去「我的装扮」的入口 */
.decoration-link {
  margin-left: auto;
  font-size: 12px;
  color: var(--primary);
  text-decoration: none;
}
.decoration-link:hover {
  text-decoration: underline;
}

.radio-row {
  display: flex;
  gap: 16px;
  padding: 8px 0;
}
.radio-item {
  font-size: 13px;
  cursor: pointer;
}
.char-count {
  text-align: right;
  font-size: 11px;
  color: var(--text-muted);
  margin-top: 4px;
}
.contact-readonly {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}
/* 只读展示：这两格是 <div>，不是 <input>。
   .input 的垂直居中原本依赖 <input> 自身的行内居中，div 只会把这一行按 line-height
   排在盒顶（看起来「偏上」），所以这里手动用 flex 居中。 */
.input.is-disabled {
  display: flex;
  align-items: center;
  gap: 6px;
  /* 只读值可能较长（尤其手机端两列更窄）：保持单行，右侧裁掉，不撑破固定高度 */
  white-space: nowrap;
  overflow: hidden;
  background: var(--bg-muted);
  color: var(--text-muted);
  cursor: not-allowed;
}
.input.is-disabled i {
  flex-shrink: 0;
  color: var(--text-light);
}
/* 个人网站：名称 + 网址上下两行，第二个输入框留一点间距 */
.website-url {
  margin-top: 8px;
}
.hint-link {
  color: var(--primary);
  text-decoration: none;
}
.hint-link:hover {
  text-decoration: underline;
}
.btn-row {
  display: flex;
  gap: 8px;
}

@media (max-width: 768px) {
  .avatar-top {
    flex-direction: column;
    align-items: center;
  }
  .avatar-controls {
    align-items: center;
  }
  .frame-grid {
    --preset-size: 48px;
  }
}
</style>
