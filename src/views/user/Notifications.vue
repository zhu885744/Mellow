<template>
  <div class="card card-pad">
    <div class="notif-head">
      <h2 class="block-title">消息通知</h2>
      <div class="notif-actions">
        <select v-model="filter.type" class="select" @change="reload">
          <option value="">全部</option>
          <option value="comment">评论</option>
          <option value="like">点赞</option>
          <option value="follow">关注</option>
          <option value="collect">收藏</option>
          <option value="system">系统</option>
        </select>
        <select v-model="filter.is_read" class="select" @change="reload">
          <option value="">全部状态</option>
          <option value="0">未读</option>
          <option value="1">已读</option>
        </select>
        <button class="btn btn-sm" @click="readAll">
          全部已读
        </button>
      </div>
    </div>

    <div v-if="loading" class="loading">
      <span class="spinner" /> 加载中...
    </div>
    <div v-else-if="!items.length" class="empty-row">
      <EmptyState text="暂无通知" />
    </div>
    <ul v-else class="notif-list">
      <li
        v-for="n in items"
        :key="n.id"
        :class="['notif', { unread: !n.is_read }]"
        @click="onClick(n)"
      >
        <div class="notif-icon" :class="`type-${n.type}`">
          <i :class="iconOf(n.type)" />
        </div>
        <div class="notif-body">
          <div class="notif-title">{{ n.title }}</div>
          <div class="notif-content">{{ n.content }}</div>
          <div class="notif-meta">
            <span>{{ fromNow(n.create_time) }}</span>
            <span class="notif-type">{{ typeLabel(n.type) }}</span>
            <span class="read-status" :class="n.is_read ? 'read' : 'unread'">
              {{ n.is_read ? '已读' : '未读' }}
            </span>
          </div>
        </div>
      </li>
    </ul>

    <Pagination
      :current="page"
      :total="total"
      :page-size="pageSize"
      @update:current="(p) => { page = p; load() }"
    />
  </div>
</template>

<script setup>
import { ref, onMounted, watch } from 'vue'
import EmptyState from '@/components/EmptyState.vue'
import Pagination from '@/components/Pagination.vue'
import { listNotifications, readNotification } from '@/api/tags'
import { useNotificationStore } from '@/stores/notification'
import { useRouter } from 'vue-router'
import { fromNow } from '@/utils/time'
import { toast } from '@/utils/toast'

const router = useRouter()
const notif = useNotificationStore()

const items = ref([])
const total = ref(0)
const loading = ref(false)
const page = ref(1)
const pageSize = 15

const filter = ref({
  type: '',
  is_read: ''
})

async function load() {
  loading.value = true
  try {
    const params = { page: page.value }
    if (filter.value.type) params.type = filter.value.type
    if (filter.value.is_read) params.is_read = filter.value.is_read
    const res = await listNotifications(params)
    // 后端返回结构: { code, data: { data: [...], count, page } }
    const payload = res.data?.data
    items.value = Array.isArray(payload) ? payload : (payload?.data || [])
    total.value = payload?.count || res.data?.count || 0
    notif.refresh()
  } catch {
    items.value = []
  } finally {
    loading.value = false
  }
}

function reload() {
  page.value = 1
  load()
}

function typeLabel(t) {
  return (
    { comment: '评论', like: '点赞', follow: '关注', collect: '收藏', system: '系统' }[t] ||
    '通知'
  )
}

function iconOf(t) {
  return ({ comment: 'bi bi-chat-dots', like: 'bi bi-hand-thumbs-up', follow: 'bi bi-people', collect: 'bi bi-star', system: 'bi bi-megaphone' })[t] || 'bi bi-bell'
}

async function readAll() {
  try {
    await notif.readAll()
    toast.success('已全部标记为已读')
  } catch {
    toast.error('操作失败，请重试')
  }
  load()
}

async function onClick(n) {
  if (!n.is_read) {
    try {
      await readNotification(n.id)
      n.is_read = 1
      notif.count = Math.max(0, notif.count - 1)
    } catch {}
  }
  // 跳转
  if (n.bind_type === 'article' && n.bind_id) {
    router.push(`/archives/${n.bind_id}`)
  } else if (n.bind_type === 'moments' && n.bind_id) {
    router.push('/moments')
  } else if (n.bind_type === 'user' && n.bind_id) {
    // 跳到用户主页（暂无）
  }
}

onMounted(load)
</script>

<style scoped>
.notif-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 16px;
  padding-bottom: 12px;
  border-bottom: 1px solid var(--border-soft);
}
.block-title {
  font-size: 16px;
  font-weight: 600;
}
.notif-actions {
  display: flex;
  gap: 6px;
}
.select {
  padding: 4px 8px;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  background: var(--bg-card);
  font-size: 12px;
}
.notif-list {
  display: flex;
  flex-direction: column;
}
.notif {
  position: relative;
  display: flex;
  gap: 12px;
  padding: 12px 8px 12px 18px;
  border-bottom: 1px dashed var(--border-soft);
  cursor: pointer;
  transition: background 0.15s;
}
.notif:hover {
  background: var(--bg-muted);
}
.notif.unread {
  background: rgba(184, 153, 104, 0.08);
}
.notif.unread .notif-title {
  font-weight: 600;
  color: var(--text);
}
.notif-icon {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  background: var(--bg-muted);
  font-size: 18px;
}
.notif-icon.type-comment { background: rgba(184, 153, 104, 0.12); }
.notif-icon.type-like { background: rgba(217, 84, 77, 0.1); }
.notif-icon.type-follow { background: rgba(108, 154, 77, 0.1); }
.notif-icon.type-collect { background: rgba(212, 161, 72, 0.1); }
.notif-icon.type-system { background: rgba(74, 144, 226, 0.1); }

.notif-body {
  flex: 1;
  min-width: 0;
}
.notif-title {
  font-size: 14px;
  font-weight: 500;
  margin-bottom: 2px;
}
.notif-content {
  font-size: 12px;
  color: var(--text-soft);
  margin-bottom: 4px;
}
.notif-meta {
  display: flex;
  gap: 12px;
  font-size: 11px;
  color: var(--text-muted);
}
.notif-type {
  padding: 1px 6px;
  background: var(--bg-muted);
  border-radius: 3px;
}
.read-status {
  padding: 1px 6px;
  border-radius: 3px;
  font-size: 11px;
}
.read-status.unread {
  color: #fff;
  background: var(--danger);
}
.read-status.read {
  color: var(--text-muted);
  background: var(--bg-muted);
}
.loading {
  padding: 32px;
  text-align: center;
  color: var(--text-muted);
}
</style>