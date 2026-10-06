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
              :frame="form.frame"
              :fallback="defaultAvatar"
              :size="'75px'"
              :frame-scale="1.6"
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
        <div class="preset-section">
          <div class="preset-label"><span><i class="bi bi-people" /> 默认头像</span></div>
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

        <!-- 头像框：数据来自「我的装扮」，可在商城解锁更多 -->
        <div class="preset-section">
          <div class="preset-label">
            <span><i class="bi bi-border-style" /> 头像框</span>
            <button v-if="wearingIds.avatar_frame" class="btn-link" @click="unwearDecorationItem('avatar_frame')">
              移除
            </button>
          </div>
          <div v-if="ownedFrames.length" class="frame-grid">
            <button
              v-for="item in ownedFrames"
              :key="item.id"
              :class="['frame-item', { selected: wearingIds.avatar_frame === item.id }]"
              :title="item.name"
              @click="wearDecorationItem(item)"
            >
              <img :src="item.preview || item.payload?.image" :alt="item.name" />
            </button>
          </div>
          <p v-else class="hint">
            暂无可用的头像框，<RouterLink to="/goods?tab=decoration">前往装扮商城</RouterLink>
          </p>
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
            <!-- 当前佩戴的头衔（样式由装扮 payload 驱动） -->
            <div class="current-title-row">
              <span class="current-title-label">当前头衔：</span>
              <TitleBadge
                v-if="decorationStore.wearing?.title"
                :payload="currentTitlePayload"
                :text="form.title"
              />
              <span v-else-if="form.title" class="current-title">{{ form.title }}</span>
              <span v-else class="current-title empty">未设置</span>
              <button
                v-if="decorationStore.wearing?.title"
                type="button"
                class="btn-link clear-title"
                @click="unwearDecorationItem('title')"
              >
                卸下
              </button>
            </div>

            <!-- 已拥有的头衔 -->
            <div class="preset-titles">
              <button
                v-for="item in ownedTitles"
                :key="item.id"
                type="button"
                :class="['preset-title', { selected: wearingIds.title === item.id }]"
                @click="wearDecorationItem(item)"
              >
                <i v-if="wearingIds.title === item.id" class="bi bi-check-circle-fill" />
                {{ item.payload?.text || item.name }}
              </button>
            </div>

            <!-- 纯样式类头衔：佩戴前需要自填文字 -->
            <div v-if="pendingTitle" class="custom-title-editor">
              <input
                v-model="customTitleInput"
                class="input"
                maxlength="10"
                placeholder="请输入头衔文字（最多 10 字）"
              />
              <div class="custom-title-actions">
                <button type="button" class="btn btn-primary" @click="applyWear(pendingTitle, customTitleInput)">
                  确定佩戴
                </button>
                <button type="button" class="btn" @click="pendingTitle = null">取消</button>
              </div>
            </div>

            <p class="hint">
              头衔与头像框均可在商城中解锁，<RouterLink to="/goods?tab=decoration">前往装扮商城</RouterLink>
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
import { getMyDecorations, wearDecoration, unwearDecoration } from '@/api/decoration'
import { toast } from '@/utils/toast'
import AvatarFrame from '@/components/AvatarFrame.vue'
import TitleBadge from '@/components/TitleBadge.vue'
import AttachmentLibrary from '@/components/AttachmentLibrary.vue'

const userStore = useUserStore()

const DEFAULT_AVATARS = [
  'https://img.zhuxu.asia/tx/1.png',
  'https://img.zhuxu.asia/tx/2.png',
  'https://img.zhuxu.asia/tx/3.png',
  'https://img.zhuxu.asia/tx/4.png',
  'https://img.zhuxu.asia/tx/5.png'
]

// ===== 装扮（头像框 / 头衔）=====
// 全部来自后台「装扮管理」，前端不再硬编码：后台增删改装扮后前端自动生效。
const decorationStore = ref({ types: [], wearing: {}, list: {} })

// 已拥有且未过期的装扮
const ownedDecorations = (type) =>
  (decorationStore.value.list?.[type] || []).filter((item) => item.owned && !item.expired)

const ownedFrames = computed(() => ownedDecorations('avatar_frame'))
const ownedTitles = computed(() => ownedDecorations('title'))

// 各类型当前佩戴中的装扮ID
const wearingIds = computed(() => {
  const map = {}
  Object.values(decorationStore.value.wearing || {}).forEach((item) => {
    if (item?.id) map[item.type] = item.id
  })
  return map
})

// 当前头衔样式（供 TitleBadge 渲染）
const currentTitlePayload = computed(() => decorationStore.value.wearing?.title?.payload || {})

async function loadDecorations() {
  try {
    const res = await getMyDecorations()
    decorationStore.value = res.data || { types: [], wearing: {}, list: {} }
  } catch {
    decorationStore.value = { types: [], wearing: {}, list: {} }
  }
}

// 纯样式类头衔需要用户自填文字
const pendingTitle = ref(null)
const customTitleInput = ref('')

// 点击装扮：样式模板且无自带文字时，先让用户填写文字
function wearDecorationItem(item) {
  if (item.type === 'title' && !item.payload?.text) {
    pendingTitle.value = item
    customTitleInput.value = item.custom_text || ''
    return
  }
  applyWear(item, '')
}

async function applyWear(item, text = '') {
  try {
    await wearDecoration(item.id, text)
    toast.success(item.type === 'title' ? '头衔已佩戴' : '头像框已佩戴')
    pendingTitle.value = null
    customTitleInput.value = ''
    await Promise.all([loadDecorations(), userStore.checkLoginState()])
  } catch {
    // 错误已由拦截器提示
  }
}

async function unwearDecorationItem(type) {
  try {
    await unwearDecoration(type)
    toast.success(type === 'title' ? '头衔已卸下' : '头像框已移除')
    await Promise.all([loadDecorations(), userStore.checkLoginState()])
  } catch {
    // 错误已由拦截器提示
  }
}

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

onMounted(() => {
  fetchUserInfo()
  loadDecorations()
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
  gap: 10px;
}
.frame-item {
  position: relative;
  aspect-ratio: 1;
  padding: 6px;
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
.frame-item.selected {
  border-color: var(--primary);
  box-shadow: 0 0 0 3px var(--accent-ring);
}
.hint {
  font-size: 11px;
  color: var(--text-muted);
  line-height: 1.6;
  margin-top: 0;
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
  box-shadow: 0 0 0 3px var(--accent-glow);
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
/* 纯样式类头衔：佩戴前自填文字 */
.custom-title-editor {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 10px;
  padding: 10px;
  background: var(--bg-muted);
  border: 1px solid var(--border-soft);
  border-radius: var(--radius-sm);
}
.custom-title-editor .input {
  flex: 1;
  min-width: 160px;
}
.custom-title-actions {
  display: flex;
  gap: 8px;
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
