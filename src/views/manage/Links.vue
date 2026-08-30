<template>
  <div class="card card-pad">
    <header class="links-head">
      <div>
        <h2 class="block-title">友链管理</h2>
        <p class="block-desc">管理自己申请的友情链接，提交后需管理员审核</p>
      </div>
      <button class="btn btn-primary btn-sm" @click="openCreate">
        <i class="bi bi-plus-lg" /> 申请友链
      </button>
    </header>

    <div v-if="loading" class="loading"><span class="spinner" /> 加载中...</div>

    <div v-else-if="!list.length" class="empty-row">
      <EmptyState text="还没有申请过友链" />
    </div>

    <ul v-else class="link-list">
      <li v-for="item in list" :key="item.id" class="link-row">
        <img :src="item.avatar || defaultAvatar" class="link-avatar" alt="avatar" />
        <div class="link-main">
          <div class="link-name-row">
            <a :href="item.url" target="_blank" rel="noopener" class="link-name">{{ item.nickname || '未命名' }}</a>
            <span class="link-status" :class="statusClass(item.audit)">{{ statusText(item.audit) }}</span>
          </div>
          <div class="link-url">{{ host(item.url) }}</div>
          <p class="link-desc">{{ item.description || '暂无描述' }}</p>
        </div>
        <div class="link-actions">
          <button class="btn btn-ghost btn-sm" title="编辑" @click="openEdit(item)">
            <i class="bi bi-pencil" />
          </button>
          <button class="btn btn-ghost btn-sm danger" title="删除" @click="confirmRemove(item)">
            <i class="bi bi-trash" />
          </button>
        </div>
      </li>
    </ul>

    <!-- 新增/编辑弹窗 -->
    <div v-if="showDialog" class="dialog-mask" @click.self="showDialog = false">
      <div class="dialog card card-pad">
        <h3 class="dialog-title">{{ editing ? '编辑友链' : '申请友链' }}</h3>
        <div class="form-item">
          <label class="form-label">站点名称 *</label>
          <input v-model="form.nickname" class="input" maxlength="32" />
        </div>
        <div class="form-item">
          <label class="form-label">站点链接 *</label>
          <input v-model="form.url" class="input" placeholder="https://" />
        </div>
        <div class="form-item">
          <label class="form-label">站点描述</label>
          <input v-model="form.description" class="input" />
        </div>
        <div class="form-item">
          <label class="form-label">头像 URL</label>
          <input v-model="form.avatar" class="input" />
        </div>
        <div class="dialog-actions">
          <button class="btn" @click="showDialog = false">取消</button>
          <button class="btn btn-primary" :disabled="submitting" @click="submit">
            {{ submitting ? '提交中...' : '保存' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import EmptyState from '@/components/EmptyState.vue'
import { listLinks, createLink, updateLink, removeLink } from '@/api/links'
import { useUserStore } from '@/stores/user'
import { storeToRefs } from 'pinia'
import { toast } from '@/utils/toast'

const defaultAvatar = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 80"><defs><linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" style="stop-color:%23667eea;stop-opacity:1" /><stop offset="100%" style="stop-color:%23764ba2;stop-opacity:1" /></linearGradient></defs><circle cx="40" cy="40" r="40" fill="url(%23grad)"/><text x="50%25" y="55%25" text-anchor="middle" font-size="36" font-family="sans-serif" fill="white">友</text></svg>'

const userStore = useUserStore()
const { user } = storeToRefs(userStore)
const uid = computed(() => user.value?.id || 0)

const loading = ref(false)
const list = ref([])
const showDialog = ref(false)
const submitting = ref(false)
const editing = ref(null) // 正在编辑的友链对象，null 表示新增

const form = ref({ nickname: '', url: '', description: '', avatar: '' })

function statusText(audit) {
  if (audit === 1) return '已通过'
  if (audit === 0) return '待审核'
  return '未通过'
}

function statusClass(audit) {
  if (audit === 1) return 'is-ok'
  if (audit === 0) return 'is-pending'
  return 'is-reject'
}

function host(url) {
  try {
    return new URL(url).host
  } catch {
    return url || ''
  }
}

async function load() {
  if (!uid.value) return
  loading.value = true
  try {
    const res = await listLinks({
      page: 1,
      limit: 200,
      where: JSON.stringify({ uid: uid.value }),
      field: 'id,nickname,url,description,avatar,group,audit,create_time'
    })
    list.value = res.data?.data || []
  } catch {
    list.value = []
  } finally {
    loading.value = false
  }
}

function openCreate() {
  editing.value = null
  form.value = { nickname: '', url: '', description: '', avatar: '' }
  showDialog.value = true
}

function openEdit(item) {
  editing.value = item
  form.value = {
    nickname: item.nickname || '',
    url: item.url || '',
    description: item.description || '',
    avatar: item.avatar || ''
  }
  showDialog.value = true
}

async function submit() {
  if (!form.value.nickname || !form.value.url) {
    toast.warning('请填写站点名称和链接')
    return
  }
  if (!/^https?:\/\//.test(form.value.url)) {
    toast.warning('链接需以 http:// 或 https:// 开头')
    return
  }
  submitting.value = true
  try {
    if (editing.value) {
      await updateLink({ id: editing.value.id, ...form.value })
      toast.success('更新成功')
    } else {
      await createLink({ ...form.value, group: 0, target: '_blank' })
      toast.success('已提交，等待审核')
    }
    showDialog.value = false
    load()
  } catch {} finally {
    submitting.value = false
  }
}

function confirmRemove(item) {
  if (!window.confirm(`确定删除「${item.nickname || '未命名'}」吗？`)) return
  removeLink(item.id)
    .then(() => {
      toast.success('已删除')
      load()
    })
    .catch(() => {})
}

onMounted(load)
</script>

<style scoped>
.links-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 16px;
}
.block-title {
  font-size: 16px;
  font-weight: 600;
  margin: 0;
}
.block-desc {
  margin: 4px 0 0;
  font-size: 12px;
  color: var(--text-muted);
}

.loading {
  padding: 40px;
  text-align: center;
  color: var(--text-muted);
}
.empty-row {
  padding: 24px 0;
  text-align: center;
}

.link-list {
  display: flex;
  flex-direction: column;
}
.link-row {
  display: flex;
  align-items: flex-start;
  gap: 14px;
  padding: 16px 0;
  border-bottom: 1px dashed var(--border-soft);
}
.link-row:last-child {
  border-bottom: none;
}
.link-avatar {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  object-fit: cover;
  flex-shrink: 0;
  background: var(--bg-muted);
}
.link-main {
  flex: 1;
  min-width: 0;
}
.link-name-row {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}
.link-name {
  font-size: 15px;
  font-weight: 600;
  color: var(--text);
}
.link-name:hover {
  color: var(--primary);
}
.link-status {
  padding: 1px 7px;
  font-size: 11px;
  border-radius: 3px;
}
.link-status.is-ok {
  background: rgba(108, 154, 77, 0.12);
  color: var(--success);
}
.link-status.is-pending {
  background: rgba(212, 161, 72, 0.12);
  color: var(--warning);
}
.link-status.is-reject {
  background: rgba(217, 84, 77, 0.12);
  color: var(--danger);
}
.link-url {
  font-size: 12px;
  color: var(--text-muted);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.link-desc {
  margin: 4px 0 0;
  font-size: 13px;
  color: var(--text-soft);
  line-height: 1.6;
}
.link-actions {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
}
.link-actions .danger:hover {
  border-color: var(--danger);
  color: var(--danger);
}

/* 弹窗 */
.dialog-mask {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.4);
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
}
.dialog {
  width: 100%;
  max-width: 420px;
}
.dialog-title {
  font-size: 16px;
  font-weight: 600;
  margin: 0 0 16px;
}
.form-item {
  margin-bottom: 12px;
}
.form-label {
  display: block;
  font-size: 13px;
  font-weight: 600;
  color: var(--text-soft);
  margin-bottom: 6px;
}
.input {
  width: 100%;
  padding: 8px 12px;
  font-size: 13px;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background: var(--bg-card);
  color: var(--text);
  outline: none;
  transition: border-color 0.2s, box-shadow 0.2s;
}
.input:focus {
  border-color: var(--primary);
  box-shadow: 0 0 0 3px rgba(184, 153, 104, 0.12);
}
.dialog-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 16px;
}
</style>
