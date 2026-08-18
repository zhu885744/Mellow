<template>
  <div>
    <div class="profile-layout">
      <!-- 头像设置 -->
      <div class="card card-pad avatar-card">
        <h2 class="block-title">头像设置</h2>
        <div class="avatar-top">
          <div class="avatar-preview">
            <AvatarFrame
              :src="form.avatar"
              :frame="form.frame"
              :fallback="defaultAvatar"
              :size="'75px'"
              :frame-scale="1.6"
              alt="头像预览"
            />
          </div>
          <div class="avatar-controls">
            <button class="btn btn-sm btn-primary" :disabled="uploading" @click="handleUploadAvatar">
              {{ uploading ? '上传中...' : '上传头像' }}
            </button>
            <button class="btn btn-sm" @click="showAvatarUrlInput = !showAvatarUrlInput">
              自定义链接
            </button>
            <button v-if="form.avatar" class="btn btn-sm btn-danger" @click="removeAvatar">
              移除头像
            </button>
            <p class="hint">
              支持 JPG、PNG、GIF 格式，建议 1:1 比例。上传头像后请点击「保存修改」才能生效。
            </p>
          </div>
        </div>
        <div v-if="showAvatarUrlInput" class="url-input-row">
          <input v-model="customAvatarUrl" class="input" placeholder="请输入头像图片链接" @keyup.enter="applyCustomAvatar" />
          <button class="btn btn-sm" :disabled="!customAvatarUrl.trim()" @click="applyCustomAvatar">应用</button>
        </div>

        <!-- 头像框 -->
        <div class="preset-section">
          <div class="preset-label">
            <span>头像框</span>
            <button v-if="form.frame" class="btn-link" @click="form.frame = ''">移除</button>
          </div>
          <div class="frame-grid">
            <button
              v-for="(url, idx) in PRESET_FRAMES"
              :key="idx"
              :class="['frame-item', { selected: form.frame === url }]"
              @click="form.frame = form.frame === url ? '' : url"
            >
              <img :src="url" :alt="`头像框 ${idx + 1}`" />
            </button>
          </div>
        </div>

        <!-- 默认头像 -->
        <div class="preset-section">
          <div class="preset-label"><span>默认头像</span></div>
          <div class="frame-grid">
            <button
              v-for="(url, idx) in DEFAULT_AVATARS"
              :key="idx"
              :class="['frame-item', { selected: form.avatar === url }]"
              @click="selectDefaultAvatar(url)"
            >
              <img :src="url" :alt="`默认头像 ${idx + 1}`" />
            </button>
          </div>
        </div>
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
            <!-- 当前头衔标签 -->
            <div class="current-title-row">
              <span class="current-title-label">当前头衔：</span>
              <span
                v-if="form.title"
                :class="['current-title', getTitleColorClass(form.title), { 'is-custom': isCustomTitle }]"
              >
                {{ form.title }}
                <i v-if="isCustomTitle" class="bi bi-patch-exclamation" title="自定义头衔（预设中不存在）" />
              </span>
              <span v-else class="current-title empty">未设置</span>
              <button v-if="form.title" type="button" class="btn-link clear-title" @click="clearTitle">清除</button>
            </div>
            <div class="preset-titles">
              <button
                v-for="title in PRESET_TITLES"
                :key="title"
                type="button"
                :class="['preset-title', getTitleColorClass(title), { selected: form.title === title }]"
                @click="selectPresetTitle(title)"
              >
                <i v-if="form.title === title" class="bi bi-check-circle-fill" />
                {{ title }}
              </button>
            </div>
            <p v-if="isCustomTitle" class="hint custom-title-hint">
              <i class="bi bi-info-circle" /> 当前为自定义头衔，不在上方预设列表中，保存后将继续保留。
            </p>
          </div>

          <div class="form-item">
            <label class="form-label">个人简介</label>
            <textarea v-model="form.description" class="textarea" rows="4" maxlength="200" placeholder="请输入个人简介" />
            <div class="char-count">{{ form.description.length }}/200</div>
          </div>

          <div class="form-item">
            <label class="form-label">联系方式</label>
            <div class="contact-readonly">
              <div class="input disabled"><i class="bi bi-phone" /> {{ userStore.user?.phone || '未设置' }}</div>
              <div class="input disabled"><i class="bi bi-envelope" /> {{ userStore.user?.email || '未设置' }}</div>
            </div>
            <p class="hint">手机号和邮箱可在「联系方式」标签页中修改</p>
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
import { updateUser, uploadAvatar } from '@/api/users'
import { toast } from '@/utils/toast'
import AvatarFrame from '@/components/AvatarFrame.vue'

const userStore = useUserStore()

const DEFAULT_AVATARS = [
  'https://img.zhuxu.asia/tx/1.png',
  'https://img.zhuxu.asia/tx/2.png',
  'https://img.zhuxu.asia/tx/3.png',
  'https://img.zhuxu.asia/tx/4.png',
  'https://img.zhuxu.asia/tx/5.png'
]

const PRESET_FRAMES = [
  'https://img.zhuxu.asia/txk/1.gif',
  'https://img.zhuxu.asia/txk/2.png',
  'https://img.zhuxu.asia/txk/3.gif',
  'https://img.zhuxu.asia/txk/4.png',
  'https://img.zhuxu.asia/txk/5.gif',
  'https://img.zhuxu.asia/txk/6.png',
  'https://img.zhuxu.asia/txk/7.gif',
  'https://img.zhuxu.asia/txk/8.png',
  'https://img.zhuxu.asia/txk/9.gif',
  'https://img.zhuxu.asia/txk/10.png',
  'https://img.zhuxu.asia/txk/11.gif',
  'https://img.zhuxu.asia/txk/12.png',
  'https://img.zhuxu.asia/txk/13.gif',
  'https://img.zhuxu.asia/txk/14.png',
  'https://img.zhuxu.asia/txk/15.gif',
  'https://img.zhuxu.asia/txk/16.png',
  'https://img.zhuxu.asia/txk/17.gif',
  'https://img.zhuxu.asia/txk/18.png',
  'https://img.zhuxu.asia/txk/19.gif',
  'https://img.zhuxu.asia/txk/20.png'
]

const PRESET_TITLES = ['掌门', '长老', '护法', '内门弟子', '外门弟子', '炼气修士', '筑基修士', '结丹修士', '元婴老祖', '化神大能']

const defaultAvatar = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 80"><circle cx="40" cy="40" r="40" fill="%23e8e6dd"/></svg>'

const loading = ref(false)
const uploading = ref(false)
const showAvatarUrlInput = ref(false)
const customAvatarUrl = ref('')

const form = reactive({
  id: '',
  nickname: '',
  gender: 0,
  description: '',
  avatar: '',
  title: '',
  frame: ''
})
const originalData = reactive({})

function getTitleColorClass(title) {
  const map = {
    '掌门': 'title-zhangmen',
    '长老': 'title-zhanglao',
    '护法': 'title-hufa',
    '内门弟子': 'title-neimen',
    '外门弟子': 'title-waimen',
    '炼气修士': 'title-lianqi',
    '筑基修士': 'title-zhuji',
    '结丹修士': 'title-jiedan',
    '元婴老祖': 'title-yuanying',
    '化神大能': 'title-huashen'
  }
  return map[title] || 'title-default'
}

function handleUploadAvatar() {
  if (uploading.value) return
  const input = document.createElement('input')
  input.type = 'file'
  input.accept = 'image/*'
  input.addEventListener('change', async () => {
    const file = input.files?.[0]
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
    try {
      const params = new FormData()
      params.append('file', file, file.name)
      const res = await uploadAvatar(params)
      const url = res.data?.results?.[0]?.full_url || res.data?.results?.[0]?.url || ''
      if (url) {
        form.avatar = url
        toast.success('头像上传成功，请点击「保存修改」完成更新')
      } else {
        toast.error('上传失败，请重试')
      }
    } catch {
      toast.error('上传失败，请稍后重试')
    } finally {
      uploading.value = false
      input.value = ''
    }
  })
  input.click()
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

function selectPresetTitle(title) {
  form.title = title
  toast.success('头衔已应用，请点击「保存修改」完成更新')
}

// 当前头衔是否为预设之外的自定义头衔
const isCustomTitle = computed(() => !!form.title && !PRESET_TITLES.includes(form.title))

function clearTitle() {
  form.title = ''
  toast.info('已清除头衔，请点击「保存修改」完成更新')
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
    form.title = u.title || ''
    form.frame = u.json?.frame || ''
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
    // 合并既有 json，只更新 frame
    const currentJson = (userStore.user?.json && typeof userStore.user.json === 'object') ? { ...userStore.user.json } : {}
    const mergedJson = { ...currentJson, frame: form.frame || '' }

    const payload = {
      id: form.id,
      nickname: form.nickname,
      description: form.description,
      avatar: form.avatar,
      title: form.title,
      json: mergedJson
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

onMounted(fetchUserInfo)
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
  align-items: flex-start;
  gap: 24px;
  margin-bottom: 16px;
}
.avatar-preview {
  flex-shrink: 0;
  text-align: center;
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
  gap: 8px;
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
  color: var(--text-soft);
  margin-bottom: 8px;
}
.btn-link {
  background: none;
  border: none;
  color: var(--text-muted);
  font-size: 12px;
  cursor: pointer;
  text-decoration: underline;
}
.frame-grid {
  display: grid;
  grid-template-columns: repeat(8, 1fr);
  gap: 8px;
}
.frame-item {
  position: relative;
  aspect-ratio: 1;
  padding: 0;
  background: none;
  border: 2px solid var(--border);
  border-radius: 50%;
  cursor: pointer;
  overflow: hidden;
  transition: all 0.2s;
}
.frame-item img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}
.frame-item:hover {
  border-color: var(--primary);
  transform: scale(1.08);
}
.frame-item.selected {
  border-color: var(--primary);
  box-shadow: 0 0 0 3px rgba(184, 153, 104, 0.25);
}
.hint {
  font-size: 11px;
  color: var(--text-muted);
  line-height: 1.6;
  margin-top: 12px;
}

.preset-titles {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.preset-title {
  padding: 5px 12px;
  font-size: 12px;
  border-radius: var(--radius-sm);
  border: 1px solid var(--border);
  background: var(--bg-muted);
  color: #fff;
  cursor: pointer;
  transition: all 0.2s;
}
.preset-title:hover {
  transform: translateY(-1px);
  border-color: var(--primary);
}
.preset-title.selected {
  border-color: var(--primary-deep);
  box-shadow: 0 0 0 3px rgba(184, 153, 104, 0.35);
  transform: translateY(-1px);
  outline: 2px solid var(--primary-deep);
  font-weight: 600;
}
.preset-title.selected i {
  margin-right: 3px;
  vertical-align: -1px;
}
/* 当前头衔标签 */
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
  gap: 4px;
  padding: 3px 10px;
  font-size: 12px;
  font-weight: 600;
  color: #fff;
  border-radius: 999px;
}
.current-title.is-custom {
  outline: 2px dashed rgba(255, 255, 255, 0.7);
}
.current-title.empty {
  background: #6c757d;
  color: #fff;
  font-weight: 400;
}
.clear-title {
  font-size: 12px;
  margin-left: auto;
}
.custom-title-hint {
  margin-top: 10px;
}
/* 头衔颜色（与评论/动态/作者主页统一） */
.title-zhangmen { background: linear-gradient(135deg, #c8a04a, #b07d2e); }
.title-zhanglao { background: linear-gradient(135deg, #8e6f3e, #6c4f24); }
.title-hufa { background: linear-gradient(135deg, #c0392b, #a93226); }
.title-neimen { background: linear-gradient(135deg, #2980b9, #1f618d); }
.title-waimen { background: linear-gradient(135deg, #16a085, #117a65); }
.title-lianqi { background: linear-gradient(135deg, #27ae60, #1e8449); }
.title-zhuji { background: linear-gradient(135deg, #7cb342, #558b2f); }
.title-jiedan { background: linear-gradient(135deg, #e67e22, #ca6f1e); }
.title-yuanying { background: linear-gradient(135deg, #6c5ce7, #5a3fd4); }
.title-huashen { background: linear-gradient(135deg, #f6d365, #fda085); text-shadow: 0 1px 2px rgba(0, 0, 0, 0.25); }
.title-default { background: #6c757d; }

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
.input.disabled {
  background: var(--bg-muted);
  color: var(--text-muted);
  cursor: not-allowed;
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
    grid-template-columns: repeat(5, 1fr);
  }
}
</style>
