<template>
  <div class="card card-pad">
    <h2 class="block-title">个人资料</h2>

    <form @submit.prevent="save">
      <div class="avatar-row">
        <img :src="form.avatar || defaultAvatar" class="big-avatar" />
        <div class="avatar-actions">
          <input
            v-model="form.avatar"
            class="input"
            placeholder="头像 URL"
          />
          <p class="hint">支持 jpg/png/webp</p>
        </div>
      </div>

      <div class="form-item">
        <label class="form-label">昵称</label>
        <input v-model="form.nickname" class="input" />
      </div>

      <div class="form-item">
        <label class="form-label">个性签名</label>
        <textarea v-model="form.description" class="textarea" rows="3" />
      </div>

      <div class="form-item">
        <label class="form-label">性别</label>
        <div class="radio-row">
          <label class="radio-item">
            <input type="radio" :value="1" v-model="form.gender" /> 男
          </label>
          <label class="radio-item">
            <input type="radio" :value="2" v-model="form.gender" /> 女
          </label>
          <label class="radio-item">
            <input type="radio" :value="0" v-model="form.gender" /> 保密
          </label>
        </div>
      </div>

      <button class="btn btn-primary" :disabled="loading" type="submit">
        {{ loading ? '保存中...' : '保存修改' }}
      </button>
    </form>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useUserStore } from '@/stores/user'
import { updateUser } from '@/api/users'
import { toast } from '@/utils/toast'

const userStore = useUserStore()

const defaultAvatar = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 80"><circle cx="40" cy="40" r="40" fill="%23e8e6dd"/></svg>'

const form = ref({
  nickname: '',
  description: '',
  avatar: '',
  gender: 0,
  email: ''
})

const loading = ref(false)

onMounted(() => {
  if (userStore.user) {
    form.value = {
      nickname: userStore.user.nickname || '',
      description: userStore.user.description || '',
      avatar: userStore.user.avatar || '',
      gender: userStore.user.gender || 0,
      email: userStore.user.email || ''
    }
  }
})

async function save() {
  loading.value = true
  try {
    await updateUser({
      id: userStore.user.id,
      nickname: form.value.nickname,
      description: form.value.description,
      avatar: form.value.avatar,
      gender: form.value.gender
    })
    // 更新本地用户信息
    userStore.setUser({ ...userStore.user, ...form.value })
    toast.success('保存成功')
  } catch {} finally {
    loading.value = false
  }
}
</script>

<style scoped>
.block-title {
  font-size: 16px;
  font-weight: 600;
  margin-bottom: 16px;
  padding-bottom: 12px;
  border-bottom: 1px solid var(--border-soft);
}
.avatar-row {
  display: flex;
  gap: 16px;
  align-items: center;
  margin-bottom: 16px;
  padding: 16px;
  background: var(--bg-muted);
  border-radius: var(--radius);
}
.big-avatar {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  object-fit: cover;
}
.avatar-actions {
  flex: 1;
}
.hint {
  font-size: 11px;
  color: var(--text-muted);
  margin: 4px 0 0;
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
</style>