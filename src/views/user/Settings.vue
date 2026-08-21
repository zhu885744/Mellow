<template>
  <div>
    <div class="profile-layout">
      <!-- 隐私设置 -->
      <div class="card card-pad">
        <h2 class="block-title">隐私设置</h2>

        <!-- 关注与粉丝列表可见范围 -->
        <div class="form-item">
          <label class="form-label">关注与粉丝列表</label>
          <div class="radio-col">
            <label class="radio-item" v-for="opt in followsOptions" :key="opt.value">
              <input type="radio" :value="opt.value" v-model="privacy.follows" />
              <span>{{ opt.label }}</span>
            </label>
          </div>
          <p class="hint">控制其他用户能否查看你的关注列表与粉丝列表。</p>
        </div>

        <!-- 我的收藏 -->
        <div class="form-item">
          <div class="switch-row">
            <div class="switch-text">
              <span class="switch-title">公开我的收藏</span>
              <span class="hint">开启后，其他用户可查看你收藏的内容。</span>
            </div>
            <button :class="['switch', { on: privacy.collects === 1 }]" @click="privacy.collects = privacy.collects === 1 ? 0 : 1">
              <span class="knob" />
            </button>
          </div>
        </div>

        <!-- 我的点赞 -->
        <div class="form-item">
          <div class="switch-row">
            <div class="switch-text">
              <span class="switch-title">公开我的点赞</span>
              <span class="hint">开启后，其他用户可查看你点赞过的内容。</span>
            </div>
            <button :class="['switch', { on: privacy.likes === 1 }]" @click="privacy.likes = privacy.likes === 1 ? 0 : 1">
              <span class="knob" />
            </button>
          </div>
        </div>
      </div>

      <div class="btn-row">
        <button class="btn btn-primary" :disabled="loading" @click="save">
          {{ loading ? '保存中...' : '保存设置' }}
        </button>
        <button class="btn" :disabled="loading" @click="reset">重置</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { reactive, ref, onMounted, watch } from 'vue'
import { useUserStore } from '@/stores/user'
import { updateUser } from '@/api/users'
import { toast } from '@/utils/toast'

const userStore = useUserStore()

const followsOptions = [
  { value: 'all', label: '全部公开' },
  { value: 'following', label: '仅公开关注列表' },
  { value: 'followers', label: '仅公开粉丝列表' },
  { value: 'none', label: '全部私密' }
]

const privacy = reactive({ follows: 'all', collects: 0, likes: 0 })
const loading = ref(false)

function loadFromStore() {
  const setting = userStore.user?.result?.setting
  if (setting && typeof setting === 'object') {
    if (setting.privacy) {
      privacy.follows = setting.privacy.follows || 'all'
      privacy.collects = setting.privacy.collects === 1 ? 1 : 0
      privacy.likes = setting.privacy.likes === 1 ? 1 : 0
    }
  }
}

const defaultSetting = () => ({
  privacy: { follows: 'all', collects: 0, likes: 0 }
})

function reset() {
  const d = defaultSetting()
  Object.assign(privacy, d.privacy)
  toast.info('已重置为默认设置')
}

async function save() {
  loading.value = true
  try {
    // 合并既有 json（保留 frame 等），再写入隐私设置
    const currentJson = (userStore.user?.json && typeof userStore.user.json === 'object')
      ? { ...userStore.user.json }
      : {}
    const mergedJson = {
      ...currentJson,
      privacy: {
        follows: privacy.follows,
        collects: privacy.collects,
        likes: privacy.likes
      }
    }

    await updateUser({
      id: userStore.user?.id,
      json: mergedJson
    })
    toast.success('设置已保存')
    // 同步最新用户信息（含新的 result.setting）
    await userStore.checkLoginState()
  } catch {
    // 错误已由拦截器提示
  } finally {
    loading.value = false
  }
}

onMounted(loadFromStore)
watch(
  () => userStore.user,
  (nu) => {
    if (nu && nu.id) loadFromStore()
  },
  { immediate: true }
)
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
.form-item {
  margin-bottom: 18px;
}
.form-item:last-child {
  margin-bottom: 0;
}
.form-label {
  display: block;
  font-size: 13px;
  font-weight: 600;
  color: var(--text-soft);
  margin-bottom: 10px;
}
.radio-col {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.radio-item {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  cursor: pointer;
}
.hint {
  font-size: 11px;
  color: var(--text-muted);
  line-height: 1.6;
  margin-top: 8px;
}
.switch-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}
.switch-text {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.switch-title {
  font-size: 13px;
  color: var(--text-soft);
}
.switch {
  position: relative;
  width: 44px;
  height: 24px;
  border-radius: 999px;
  background: var(--border);
  border: none;
  cursor: pointer;
  transition: background 0.2s;
  flex-shrink: 0;
}
.switch.on {
  background: var(--primary);
}
.knob {
  position: absolute;
  top: 2px;
  left: 2px;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: #fff;
  transition: transform 0.2s;
}
.switch.on .knob {
  transform: translateX(20px);
}
.btn-row {
  display: flex;
  gap: 8px;
}
</style>
