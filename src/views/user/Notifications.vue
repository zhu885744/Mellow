<template>
  <div class="notif-page">
    <section class="card notif-card">
      <!-- 头部：标题 + 概览 + 全部已读 + 清空已读 -->
      <header class="notif-head">
        <div class="notif-head-main">
          <h2 class="notif-heading">
            <i class="bi bi-bell-fill" />
            消息通知
          </h2>
          <p class="notif-summary">
            共 {{ total }} 条
            <template v-if="unreadCount > 0">
              · <span class="notif-summary-unread">{{ unreadCount }} 条未读</span>
            </template>
          </p>
        </div>
        <div class="notif-head-actions">
          <button
            type="button"
            class="btn btn-sm btn-soft"
            :disabled="!canReadAll || readAllLoading"
            @click="readAll"
          >
            <i class="bi bi-check2-all" />
            {{ readAllLoading ? '处理中...' : '全部已读' }}
          </button>
          <button
            type="button"
            class="btn btn-sm btn-outline-danger"
            :disabled="loading"
            @click="showClearConfirm = true"
          >
            <i class="bi bi-trash3" />
            {{ clearReadLoading ? '清空中...' : '清空已读' }}
          </button>
        </div>
      </header>

      <!-- 筛选 -->
      <div class="notif-filter">
        <div class="chip-group" aria-label="通知类型">
          <button
            v-for="opt in typeOptions"
            :key="opt.value"
            type="button"
            class="chip"
            :class="{ active: filter.type === opt.value }"
            :aria-pressed="filter.type === opt.value"
            @click="setType(opt.value)"
          >
            {{ opt.label }}
          </button>
        </div>
        <div class="chip-group" aria-label="读取状态">
          <button
            v-for="opt in readOptions"
            :key="opt.value"
            type="button"
            class="chip"
            :class="{ active: filter.is_read === opt.value }"
            :aria-pressed="filter.is_read === opt.value"
            @click="setRead(opt.value)"
          >
            {{ opt.label }}
          </button>
        </div>
      </div>

      <!-- 加载骨架 -->
      <div v-if="loading" class="notif-loading">
        <div v-for="i in 4" :key="i" class="notif-skeleton">
          <span class="skeleton sk-icon" />
          <div class="sk-lines">
            <span class="skeleton sk-line w60" />
            <span class="skeleton sk-line w90" />
            <span class="skeleton sk-line w30" />
          </div>
        </div>
      </div>

      <EmptyState v-else-if="!items.length" icon="bi bi-bell-slash" text="暂无通知" />

      <ul v-else class="notif-list">
        <li
          v-for="n in items"
          :key="n.id"
          class="notif"
          :class="{ unread: !n.is_read }"
          role="button"
          tabindex="0"
          @click="onClick(n)"
          @keydown.enter.prevent="onClick(n)"
          @keydown.space.prevent="onClick(n)"
        >
          <span class="notif-dot" aria-hidden="true" />
          <span class="notif-icon" :class="`type-${n.type}`">
            <i :class="iconOf(n.type)" />
          </span>
          <div class="notif-body">
            <div class="notif-row">
              <span class="notif-title">{{ n.title }}</span>
              <time class="notif-time">{{ fromNow(n.create_time) }}</time>
            </div>
            <p v-if="n.content" class="notif-content">{{ n.content }}</p>
            <div class="notif-meta">
              <span class="notif-tag">{{ typeLabel(n.type) }}</span>
              <span v-if="!n.is_read" class="notif-unread-text">未读</span>
            </div>
          </div>
          <i class="bi bi-chevron-right notif-arrow" aria-hidden="true" />
        </li>
      </ul>

      <Pagination
        :current="page"
        :total="total"
        :page-size="pageSize"
        @update:current="(p) => { page = p; load() }"
      />
    </section>

    <!-- 清空已读确认弹窗 -->
    <ConfirmDialog
      v-model:visible="showClearConfirm"
      title="清空已读消息"
      message="确定清空所有已读消息吗？清空后将移入回收站，可稍后恢复。"
      confirm-text="清空"
      loading-text="清空中..."
      danger
      :loading="clearReadLoading"
      @confirm="clearRead"
    />
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import EmptyState from '@/components/EmptyState.vue'
import Pagination from '@/components/Pagination.vue'
import ConfirmDialog from '@/components/ConfirmDialog.vue'
import { listNotifications, readNotification, removeAllNotifications } from '@/api/tags'
import { useNotificationStore } from '@/stores/notification'
import { useRouter } from 'vue-router'
import { fromNow } from '@/utils/time'
import { toast } from '@/utils/toast'

const router = useRouter()
const notif = useNotificationStore()

const items = ref([])
const total = ref(0)
const loading = ref(false)
const readAllLoading = ref(false)
const clearReadLoading = ref(false)
const showClearConfirm = ref(false)
const page = ref(1)
const pageSize = 15

const filter = ref({
  type: '',
  is_read: ''
})

const typeOptions = [
  { value: '', label: '全部' },
  { value: 'comment', label: '评论' },
  { value: 'like', label: '点赞' },
  { value: 'follow', label: '关注' },
  { value: 'collect', label: '收藏' },
  { value: 'system', label: '系统' }
]

const readOptions = [
  { value: '', label: '全部状态' },
  { value: '0', label: '未读' },
  { value: '1', label: '已读' }
]

const unreadCount = computed(() => Number(notif.count) || 0)

// 当前列表里是否还有未读（全局未读数依赖轮询，可能滞后或接口异常）
const unreadInView = computed(() => items.value.some((n) => !n.is_read))

// 满足任一条件即可一键已读：全局有未读，或当前列表存在未读
const canReadAll = computed(() => unreadCount.value > 0 || unreadInView.value)

const typeMap = {
  comment: '评论',
  like: '点赞',
  follow: '关注',
  collect: '收藏',
  system: '系统'
}

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

function setType(v) {
  if (filter.value.type === v) return
  filter.value.type = v
  reload()
}

function setRead(v) {
  if (filter.value.is_read === v) return
  filter.value.is_read = v
  reload()
}

function typeLabel(t) {
  return typeMap[t] || '通知'
}

function iconOf(t) {
  return ({ comment: 'bi bi-chat-dots', like: 'bi bi-hand-thumbs-up', follow: 'bi bi-people', collect: 'bi bi-star', system: 'bi bi-megaphone' })[t] || 'bi bi-bell'
}

async function readAll() {
  if (readAllLoading.value || !canReadAll.value) return
  readAllLoading.value = true
  try {
    await notif.readAll()
    toast.success('已全部标记为已读')
    await load()
  } catch {
    toast.error('操作失败，请重试')
  } finally {
    readAllLoading.value = false
  }
}

// 清空已读消息：只软删除已读通知（移入回收站，可恢复），未读消息不受影响
// 由主题内置的 <ConfirmDialog> 二次确认后触发，处理中弹窗保持打开
async function clearRead() {
  if (clearReadLoading.value) return
  clearReadLoading.value = true
  try {
    const res = await removeAllNotifications({ is_read: 1 })
    if (res?.code === 204) {
      toast.info('暂无已读消息')
    } else {
      toast.success('已清空全部已读消息')
    }
    // 清空后第一页可能为空，回到首页重新加载
    if (page.value > 1) page.value = 1
    await load()
  } catch {
    toast.error('清空失败，请重试')
  } finally {
    clearReadLoading.value = false
    showClearConfirm.value = false
  }
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
.notif-page {
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.notif-card {
  overflow: hidden;
}

/* ---------- 头部 ---------- */
.notif-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 12px;
  padding: 18px 22px 14px;
}
.notif-head-main {
  min-width: 0;
}
.notif-head-actions {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
}
.notif-heading {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 16px;
  font-weight: 600;
  color: var(--text);
}
.notif-heading i {
  font-size: 15px;
  color: var(--primary);
}
.notif-summary {
  margin: 4px 0 0;
  font-size: 12px;
  color: var(--text-muted);
}
.notif-summary-unread {
  color: var(--primary-deep);
  font-weight: 600;
}

/* ---------- 筛选 ---------- */
.notif-filter {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 10px;
  padding: 0 22px 14px;
  border-bottom: 1px solid var(--border-soft);
}
.chip-group {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 6px;
}
.chip {
  display: inline-flex;
  align-items: center;
  padding: 4px 12px;
  border: 1px solid var(--border);
  border-radius: 999px;
  background: var(--bg-card);
  color: var(--text-soft);
  font-size: 12px;
  line-height: 1.5;
  transition: all 0.18s;
}
.chip:hover {
  border-color: var(--primary-soft);
  color: var(--primary);
}
.chip.active {
  background: var(--accent-soft);
  border-color: var(--primary);
  color: var(--primary-deep);
  font-weight: 600;
}

/* ---------- 列表 ---------- */
.notif-list {
  display: flex;
  flex-direction: column;
}
.notif {
  position: relative;
  display: flex;
  align-items: flex-start;
  gap: 14px;
  padding: 14px 22px 14px 24px;
  border-bottom: 1px solid var(--border-soft);
  cursor: pointer;
  transition: background 0.18s;
}
.notif:last-child {
  border-bottom: none;
}
.notif:hover {
  background: var(--bg-muted);
}
.notif:focus-visible {
  outline: 2px solid var(--primary-soft);
  outline-offset: -2px;
}
.notif.unread {
  background: var(--accent-wash);
}
.notif.unread:hover {
  background: var(--accent-soft);
}

.notif-dot {
  position: absolute;
  left: 10px;
  top: 30px;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: transparent;
  transition: background 0.2s;
}
.notif.unread .notif-dot {
  background: var(--primary);
}

.notif-icon {
  width: 38px;
  height: 38px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: var(--bg-muted);
  color: var(--text-soft);
  font-size: 17px;
  transition: transform 0.18s;
}
.notif:hover .notif-icon {
  transform: scale(1.06);
}
.notif-icon.type-comment { background: var(--accent-soft); color: var(--primary-deep); }
.notif-icon.type-like { background: rgba(217, 84, 77, 0.12); color: var(--danger); }
.notif-icon.type-follow { background: rgba(108, 154, 77, 0.12); color: var(--success); }
.notif-icon.type-collect { background: var(--gold-soft); color: var(--warning); }
.notif-icon.type-system { background: rgba(74, 144, 226, 0.12); color: #4a90e2; }

.notif-body {
  flex: 1;
  min-width: 0;
}
.notif-row {
  display: flex;
  align-items: baseline;
  gap: 10px;
}
.notif-title {
  flex: 1;
  min-width: 0;
  font-size: 14px;
  font-weight: 500;
  color: var(--text-soft);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.notif.unread .notif-title {
  font-weight: 600;
  color: var(--text);
}
.notif-time {
  flex-shrink: 0;
  font-size: 12px;
  color: var(--text-light);
}
.notif-content {
  margin: 4px 0 0;
  font-size: 13px;
  line-height: 1.6;
  color: var(--text-muted);
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.notif-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 8px;
}
.notif-tag {
  display: inline-block;
  padding: 1px 8px;
  font-size: 11px;
  border-radius: 999px;
  background: var(--bg-muted);
  color: var(--text-muted);
}
.notif-unread-text {
  font-size: 11px;
  color: var(--primary);
  font-weight: 600;
}

.notif-arrow {
  align-self: center;
  font-size: 12px;
  color: var(--text-light);
  opacity: 0;
  transform: translateX(-4px);
  transition: all 0.18s;
}
.notif:hover .notif-arrow {
  opacity: 1;
  transform: translateX(0);
  color: var(--primary);
}

/* ---------- 骨架屏 ---------- */
.notif-skeleton {
  display: flex;
  gap: 14px;
  padding: 14px 22px 14px 24px;
}
.sk-icon {
  width: 38px;
  height: 38px;
  border-radius: 50%;
  flex-shrink: 0;
}
.sk-lines {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding-top: 2px;
}
.sk-line {
  display: block;
  height: 11px;
}
.w60 { width: 60%; }
.w90 { width: 90%; }
.w30 { width: 30%; }

/* ---------- 响应式 ---------- */
@media (max-width: 640px) {
  .notif-head {
    padding: 16px 16px 12px;
  }
  .notif-filter {
    padding: 0 16px 12px;
  }
  .notif,
  .notif-skeleton {
    padding-left: 18px;
    padding-right: 16px;
    gap: 12px;
  }
  .notif-dot {
    left: 7px;
  }
  .notif-arrow {
    display: none;
  }
  .notif-heading {
    font-size: 15px;
  }
}
</style>
