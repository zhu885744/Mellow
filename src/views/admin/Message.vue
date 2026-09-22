<template>
  <div class="message-admin">
    <!-- 概览：随当前模块切换统计口径 -->
    <section class="card card-pad panel">
      <header class="panel-head">
        <div>
          <h2 class="block-title">消息通知</h2>
          <p class="block-desc">{{ activeView.desc }}</p>
        </div>
        <div class="head-actions">
          <button class="btn btn-primary btn-sm" @click="openSend('all')">
            <i class="bi bi-send" /> 发送系统消息
          </button>
          <button
            class="btn btn-ghost btn-sm"
            :disabled="loadingStats"
            title="刷新统计"
            aria-label="刷新统计"
            @click="loadStats"
          >
            <i class="bi bi-arrow-clockwise" />
          </button>
        </div>
      </header>

      <div class="stat-grid" :aria-busy="loadingStats">
        <div v-for="s in statCards" :key="s.label" class="stat-card">
          <span class="stat-icon" :style="{ color: s.color }"><i :class="s.icon" /></span>
          <span class="stat-body">
            <span class="stat-value">{{ loadingStats ? '···' : s.value }}</span>
            <span class="stat-label">{{ s.label }}</span>
          </span>
        </div>
      </div>
    </section>

    <div class="card card-pad">
      <!-- 模块切换：系统公告 / 我的消息 -->
      <div class="view-tabs">
        <button
          v-for="v in views"
          :key="v.key"
          type="button"
          class="status-tab"
          :class="{ active: view === v.key }"
          @click="switchView(v.key)"
        >
          <i :class="v.icon" /> {{ v.label }}
        </button>
      </div>

      <!-- ============ 1. 系统公告（广播消息 uid=0）============ -->
      <template v-if="view === 'broadcast'">
        <header class="list-head">
          <div>
            <h2 class="block-title">系统公告</h2>
            <p class="block-desc">
              广播消息仅存一条记录、全体用户可见；撤回后对所有人立即不可见
              <template v-if="bcTotal > 0"> · 共 {{ bcTotal }} 条</template>
            </p>
          </div>
          <div class="head-actions">
            <button class="btn btn-primary btn-sm" :disabled="trash" @click="openSend('all')">
              <i class="bi bi-megaphone" /> 新建公告
            </button>
          </div>
        </header>

        <div class="list-filter">
          <div class="status-tabs">
            <button
              type="button"
              class="status-tab"
              :class="{ active: !trash }"
              @click="switchTrash(false)"
            >已发布</button>
            <button
              type="button"
              class="status-tab trash-tab"
              :class="{ active: trash }"
              @click="switchTrash(true)"
            >
              <i class="bi bi-trash3" /> 已撤回
            </button>
          </div>

          <div class="filter-right">
            <div class="search-box">
              <i class="bi bi-search" aria-hidden="true" />
              <input
                v-model="bcKeyword"
                class="search-input"
                type="search"
                placeholder="搜索标题…"
                aria-label="搜索标题"
                @input="doBroadcastSearch"
              />
            </div>

            <button class="btn btn-sm" :disabled="bcLoading" @click="loadBroadcasts()">
              <i class="bi bi-arrow-clockwise" /> 刷新
            </button>
          </div>
        </div>

        <div v-if="trash" class="trash-bar">
          <span><i class="bi bi-trash3" /> 撤回的公告不再对任何用户展示，可恢复或彻底删除</span>
          <button class="btn btn-sm btn-danger" :disabled="busy || !bcList.length" @click="askClearRecycle()">
            清空回收站
          </button>
        </div>

        <div v-if="bcLoading" class="loading"><span class="spinner" /> 加载中...</div>

        <div v-else-if="!bcList.length" class="empty-row">
          <EmptyState :icon="trash ? 'bi bi-trash3' : 'bi bi-megaphone'" :text="bcEmptyText" />
        </div>

        <ul v-else class="notice-list">
          <li v-for="item in bcList" :key="item.id" class="notice-row">
            <span class="type-chip is-system"><i class="bi bi-megaphone" /> 系统公告</span>

            <div class="notice-main">
              <div class="notice-title-row">
                <span class="notice-title">{{ item.title }}</span>
                <span class="id-chip">#{{ item.id }}</span>
              </div>
              <p class="notice-content">{{ item.content || '—' }}</p>
              <div class="notice-meta">
                <span class="meta-text"><i class="bi bi-clock" /> {{ bcTimeText(item) }}</span>
                <span v-if="item.result?.from_user?.nickname" class="meta-text">
                  <i class="bi bi-person" /> {{ item.result.from_user.nickname }}
                </span>
              </div>
            </div>

            <div class="notice-actions">
              <template v-if="trash">
                <button class="btn btn-ghost btn-sm" title="恢复" aria-label="恢复" :disabled="busy" @click="restore(item)">
                  <i class="bi bi-arrow-counterclockwise" />
                </button>
                <button class="btn btn-ghost btn-sm danger" title="彻底删除" aria-label="彻底删除" :disabled="busy" @click="askForceDelete(item)">
                  <i class="bi bi-x-octagon" />
                </button>
              </template>
              <template v-else>
                <button class="btn btn-ghost btn-sm" title="编辑" aria-label="编辑" :disabled="busy" @click="openEdit(item)">
                  <i class="bi bi-pencil" />
                </button>
                <button class="btn btn-ghost btn-sm danger" title="撤回" aria-label="撤回" :disabled="busy" @click="askRemove(item)">
                  <i class="bi bi-eye-slash" />
                </button>
              </template>
            </div>
          </li>
        </ul>

        <Pagination
          v-if="!bcLoading && bcTotal > pageSize"
          :current="bcPage"
          :total="bcTotal"
          :page-size="pageSize"
          @update:current="changeBroadcastPage"
        />
      </template>

      <!-- ============ 2. 我的消息 ============ -->
      <template v-else>
        <header class="list-head">
          <div>
            <h2 class="block-title">我的消息</h2>
            <p class="block-desc">
              当前账号收到的通知，可按类型与已读状态筛选
              <template v-if="total > 0"> · 共 {{ total }} 条</template>
            </p>
          </div>
          <div class="head-actions">
            <button class="btn btn-sm" :disabled="busy || !unreadCount" @click="askReadAll">
              <i class="bi bi-check2-all" /> 全部已读
            </button>
          </div>
        </header>

        <div class="list-filter">
          <div class="status-tabs">
            <button
              v-for="tab in readTabs"
              :key="tab.key"
              type="button"
              class="status-tab"
              :class="{ active: !mineTrash && readFilter === tab.key }"
              @click="switchReadFilter(tab.key)"
            >{{ tab.label }}</button>
            <button
              type="button"
              class="status-tab trash-tab"
              :class="{ active: mineTrash }"
              @click="switchMineTrash"
            >
              <i class="bi bi-trash3" /> 回收站
            </button>
          </div>

          <div class="filter-right">
            <SelectMenu
              v-model="typeFilter"
              :options="typeOptions"
              icon="bi bi-tags"
              placeholder="全部类型"
              @change="reloadMine"
            />

            <div class="search-box">
              <i class="bi bi-search" aria-hidden="true" />
              <input
                v-model="keyword"
                class="search-input"
                type="search"
                placeholder="搜索标题…"
                aria-label="搜索标题"
                @input="doMineSearch"
              />
            </div>

            <button class="btn btn-sm" :disabled="loading" @click="loadMine()">
              <i class="bi bi-arrow-clockwise" /> 刷新
            </button>
          </div>
        </div>

        <!-- 批量操作 -->
        <div v-if="selectedIds.length" class="batch-bar">
          <span class="batch-count">已选 <strong>{{ selectedIds.length }}</strong> 条</span>
          <div class="batch-actions">
            <template v-if="mineTrash">
              <button class="btn btn-sm" :disabled="busy" @click="batchRestore()">
                <i class="bi bi-arrow-counterclockwise" /> 批量恢复
              </button>
              <button class="btn btn-sm btn-danger" :disabled="busy" @click="askBatchForceDelete()">
                <i class="bi bi-x-octagon" /> 彻底删除
              </button>
            </template>
            <template v-else>
              <button class="btn btn-sm" :disabled="busy" @click="batchRead()">
                <i class="bi bi-check2" /> 标记已读
              </button>
              <button class="btn btn-sm btn-danger" :disabled="busy" @click="askBatchRemove()">
                <i class="bi bi-trash" /> 删除
              </button>
            </template>
            <button class="btn btn-sm btn-ghost" :disabled="busy" @click="clearSelection">取消选择</button>
          </div>
        </div>

        <div v-if="mineTrash" class="trash-bar">
          <span><i class="bi bi-trash3" /> 回收站内的消息可恢复或彻底删除</span>
          <button class="btn btn-sm btn-danger" :disabled="busy || !list.length" @click="askClearRecycle()">
            清空回收站
          </button>
        </div>

        <div v-if="loading" class="loading"><span class="spinner" /> 加载中...</div>

        <div v-else-if="!list.length" class="empty-row">
          <EmptyState :icon="mineTrash ? 'bi bi-trash3' : 'bi bi-envelope'" :text="mineEmptyText" />
        </div>

        <template v-else>
          <div class="list-head-row">
            <label class="pick" title="全选本页">
              <input
                ref="selectAllRef"
                type="checkbox"
                :checked="pageAllSelected"
                :disabled="busy"
                aria-label="全选本页"
                @change="toggleSelectAll"
              />
            </label>
            <span class="list-head-text">本页 {{ list.length }} 条</span>
          </div>

          <ul class="notice-list">
            <li v-for="item in list" :key="item.id" class="notice-row" :class="{ selected: isSelected(item.id) }">
              <label class="pick" :title="isSelected(item.id) ? '取消选择' : '选择'">
                <input
                  type="checkbox"
                  :checked="isSelected(item.id)"
                  :disabled="busy"
                  :aria-label="`选择消息 ${item.title}`"
                  @change="toggleSelect(item.id)"
                />
              </label>

              <span class="type-chip" :class="typeClass(item)">{{ typeLabel(item) }}</span>

              <div class="notice-main">
                <div class="notice-title-row">
                  <span v-if="Number(item.is_read) === 0" class="unread-dot" title="未读" />
                  <span class="notice-title" :class="{ 'is-unread': Number(item.is_read) === 0 }">{{ item.title }}</span>
                  <span class="id-chip">#{{ item.id }}</span>
                </div>
                <p class="notice-content">{{ item.content || '—' }}</p>
                <div class="notice-meta">
                  <span class="meta-text"><i class="bi bi-clock" /> {{ mineTimeText(item) }}</span>
                  <span v-if="item.result?.from_user?.nickname" class="meta-text">
                    <i class="bi bi-person" /> {{ item.result.from_user.nickname }}
                  </span>
                  <span v-if="Number(item.bind_id) > 0" class="meta-text">
                    {{ item.bind_type || 'default' }} #{{ item.bind_id }}
                  </span>
                </div>
              </div>

              <div class="notice-actions">
                <template v-if="mineTrash">
                  <button class="btn btn-ghost btn-sm" title="恢复" aria-label="恢复" :disabled="busy" @click="restore(item)">
                    <i class="bi bi-arrow-counterclockwise" />
                  </button>
                  <button class="btn btn-ghost btn-sm danger" title="彻底删除" aria-label="彻底删除" :disabled="busy" @click="askForceDelete(item)">
                    <i class="bi bi-x-octagon" />
                  </button>
                </template>
                <template v-else>
                  <button
                    v-if="Number(item.is_read) === 0"
                    class="btn btn-ghost btn-sm"
                    title="标记已读"
                    aria-label="标记已读"
                    :disabled="busy"
                    @click="markRead(item)"
                  >
                    <i class="bi bi-check2" />
                  </button>
                  <button class="btn btn-ghost btn-sm danger" title="删除" aria-label="删除" :disabled="busy" @click="askRemove(item)">
                    <i class="bi bi-trash" />
                  </button>
                </template>
              </div>
            </li>
          </ul>
        </template>

        <Pagination
          v-if="!loading && total > pageSize"
          :current="page"
          :total="total"
          :page-size="pageSize"
          @update:current="changePage"
        />
      </template>
    </div>

    <!-- 发送系统消息 / 新建公告 -->
    <AdminFormDialog
      v-model:visible="send.visible"
      :title="send.title"
      icon="bi bi-send"
      :loading="send.loading"
      :confirm-text="send.target === 'all' ? '发布公告' : '发送'"
      @confirm="submitSend"
    >
      <div class="form-item">
        <label class="form-label">发送目标</label>
        <SelectMenu v-model="send.target" variant="field" :options="targetOptions" />
        <p class="form-hint">
          全体用户采用广播模式（仅一条记录、全体可见）；指定用户会为每人单独创建记录
        </p>
      </div>

      <div v-if="send.target !== 'all'" class="form-item">
        <label class="form-label">用户 ID</label>
        <input v-model="send.userIds" class="input" type="text" placeholder="多个用英文逗号分隔，如 1,2,3" />
        <p class="form-hint">请输入接收消息的用户 ID（可在「用户管理」中查看）</p>
      </div>

      <div class="form-item">
        <label class="form-label">通知标题</label>
        <input v-model="send.titleText" class="input" type="text" maxlength="128" placeholder="必填" />
      </div>

      <div class="form-item">
        <label class="form-label">通知内容</label>
        <textarea v-model="send.content" class="textarea" rows="4" placeholder="必填" />
      </div>

      <div class="form-item">
        <label class="check-line">
          <input v-model="send.asSystem" type="checkbox" />
          <span>以系统身份发送（标题自动加「【系统消息】」前缀）</span>
        </label>
        <label class="check-line" :class="{ 'is-disabled': send.target === 'all' }">
          <input v-model="send.sendEmail" type="checkbox" :disabled="send.target === 'all'" />
          <span>同时发送邮件通知（仅对已填写邮箱的用户生效）</span>
        </label>
        <p v-if="send.target === 'all'" class="form-hint">广播模式不支持邮件通知</p>
      </div>
    </AdminFormDialog>

    <!-- 编辑公告 -->
    <AdminFormDialog
      v-model:visible="edit.visible"
      :title="`编辑公告 #${edit.id}`"
      icon="bi bi-pencil-square"
      :loading="edit.loading"
      confirm-text="保存"
      @confirm="saveEdit"
    >
      <div class="form-item">
        <label class="form-label">通知标题</label>
        <input v-model="edit.title" class="input" type="text" maxlength="128" placeholder="必填" />
      </div>

      <div class="form-item">
        <label class="form-label">通知内容</label>
        <textarea v-model="edit.content" class="textarea" rows="4" placeholder="必填" />
      </div>
    </AdminFormDialog>

    <!-- 操作确认 -->
    <ConfirmDialog
      v-model:visible="confirm.visible"
      :title="confirm.title"
      :message="confirm.message"
      :confirm-text="confirm.confirmText"
      :danger="confirm.danger"
      :loading="confirm.loading"
      @confirm="runConfirm"
    />
  </div>
</template>

<script setup>
/**
 * 消息通知（/admin/message）
 *
 * 两个模块：
 *  1. 系统公告 —— 广播消息（uid=0）：发布、编辑、撤回、恢复、彻底删除
 *  2. 我的消息 —— 当前账号收到的通知：类型/已读筛选、标记已读、删除与回收站
 *
 * 后端约束（app/api/controller/notification.go、app/model/notification.go）：
 * - notification/all 的作用域由后端决定：普通用户只看自己的，root 可同时看到广播（uid=0）；
 *   显式传 uid 会精确过滤，故公告列表传 uid=0、个人消息传当前用户 id；
 *   因此后台**无法查看其它用户收到的消息**（后端没有该接口）；
 * - notification/count 固定按当前登录用户过滤，不能用于统计广播，
 *   公告数量改用列表接口返回的 count 字段；
 * - send-system 仅 root：target_type=all 走广播（一条 uid=0 记录、不支持邮件），
 *   partial / single 逐个创建记录，send_email 仅在指定用户时生效；
 * - 撤回广播（root 删除 uid=0 记录）对全体用户立即不可见；普通用户删除只是对自己隐藏；
 * - clear 清空回收站时，root 会连同广播记录一起清理。
 */
import { ref, reactive, computed, watchEffect, onMounted } from 'vue'
import { storeToRefs } from 'pinia'
import EmptyState from '@/components/EmptyState.vue'
import Pagination from '@/components/Pagination.vue'
import ConfirmDialog from '@/components/ConfirmDialog.vue'
import SelectMenu from '@/components/SelectMenu.vue'
import AdminFormDialog from '@/components/admin/AdminFormDialog.vue'
import { useUserStore } from '@/stores/user'
import {
  listNotifications,
  listBroadcasts,
  countNotifications,
  getUnreadCount,
  sendSystemMessage,
  updateNotification,
  readNotification,
  readAllNotifications,
  readBatchNotifications,
  removeNotifications,
  forceDeleteNotifications,
  restoreNotifications,
  clearNotificationRecycle
} from '@/api/notification'
import { fromNow } from '@/utils/time'
import { debounce } from '@/utils/helper'
import { toast } from '@/utils/toast'

const pageSize = 15

const views = [
  {
    key: 'broadcast',
    label: '系统公告',
    icon: 'bi bi-megaphone',
    desc: '发布与管理全体可见的广播消息，支持撤回与恢复'
  },
  {
    key: 'mine',
    label: '我的消息',
    icon: 'bi bi-envelope',
    desc: '当前账号收到的通知，可按类型与已读状态筛选'
  }
]

// 已读状态筛选（is_read 走 where 条件）
const readTabs = [
  { key: 'all', label: '全部', where: null },
  { key: 'unread', label: '未读', where: { is_read: 0 } },
  { key: 'read', label: '已读', where: { is_read: 1 } }
]

// 通知类型（与后端 NotificationType* 常量对应）
const typeOptions = [
  { value: '', label: '全部类型' },
  { value: 'comment', label: '评论/回复' },
  { value: 'like', label: '点赞' },
  { value: 'collect', label: '收藏' },
  { value: 'follow', label: '关注' },
  { value: 'system', label: '系统消息' }
]

const targetOptions = [
  { value: 'all', label: '全体用户（广播）' },
  { value: 'partial', label: '指定用户' }
]

// ===== 当前模块 =====
const view = ref('broadcast')
const activeView = computed(() => views.find((v) => v.key === view.value) || views[0])

// ===== 当前用户（个人消息需显式传自己的 uid）=====
const userStore = useUserStore()
const { user } = storeToRefs(userStore)
const currentUid = computed(() => Number(user.value?.id || 0))

// ===== 系统公告 =====
const bcList = ref([])
const bcTotal = ref(0)
const bcPage = ref(1)
const bcLoading = ref(false)
const trash = ref(false)
const bcKeyword = ref('')
const bcSearchKey = ref('')
const bcStats = reactive({ total: 0, trashed: 0, latest: 0 })

// ===== 我的消息 =====
const list = ref([])
const total = ref(0)
const page = ref(1)
const loading = ref(false)
const busy = ref(false)
const mineTrash = ref(false)
const readFilter = ref('all')
const typeFilter = ref('')
const keyword = ref('')
const searchKey = ref('')
const selectedIds = ref([])
const unreadCount = ref(0)
const mineStats = reactive({ total: 0, unread: 0, read: 0, trash: 0 })

// ===== 统计 =====
const loadingStats = ref(false)

const broadcastStatCards = computed(() => [
  { label: '公告总数', value: bcStats.total, icon: 'bi bi-megaphone', color: 'var(--primary)' },
  { label: '已撤回', value: bcStats.trashed, icon: 'bi bi-eye-slash', color: 'var(--text-muted)' },
  { label: '最近推送', value: bcStats.latest ? fromNow(bcStats.latest) : '—', icon: 'bi bi-clock', color: 'var(--success)' },
  { label: '我的未读', value: unreadCount.value, icon: 'bi bi-envelope', color: 'var(--warning)' }
])

const mineStatCards = computed(() => [
  { label: '全部消息', value: mineStats.total, icon: 'bi bi-envelope', color: 'var(--primary)' },
  { label: '未读', value: mineStats.unread, icon: 'bi bi-bell', color: 'var(--warning)' },
  { label: '已读', value: mineStats.read, icon: 'bi bi-check2-circle', color: 'var(--success)' },
  { label: '回收站', value: mineStats.trash, icon: 'bi bi-trash3', color: 'var(--text-muted)' }
])

const statCards = computed(() => (view.value === 'mine' ? mineStatCards.value : broadcastStatCards.value))

// ===== 弹窗 =====
const send = reactive({
  visible: false,
  loading: false,
  target: 'all',
  title: '发送系统消息',
  titleText: '',
  content: '',
  userIds: '',
  asSystem: true,
  sendEmail: false
})

const edit = reactive({
  visible: false,
  loading: false,
  id: 0,
  title: '',
  content: ''
})

const confirm = reactive({
  visible: false,
  title: '操作确认',
  message: '',
  confirmText: '确定',
  danger: false,
  loading: false,
  action: null
})

const bcEmptyText = computed(() => {
  if (bcSearchKey.value) return '没有匹配的公告'
  if (trash.value) return '没有已撤回的公告'
  return '还没有公告，发布一条吧'
})

const mineEmptyText = computed(() => {
  if (searchKey.value) return '没有匹配的消息'
  if (mineTrash.value) return '回收站是空的'
  if (readFilter.value === 'unread') return '没有未读消息'
  return '暂无消息'
})

// ---------- 展示辅助 ----------
function typeLabel(item) {
  const map = { comment: '评论/回复', like: '点赞', collect: '收藏', follow: '关注', system: '系统消息' }
  return map[item?.type] || item?.type || '通知'
}

function typeClass(item) {
  return item?.type === 'system' ? 'is-system' : ''
}

function bcTimeText(item) {
  if (trash.value) return `撤回于 ${fromNow(item.delete_time)}`
  return `发布于 ${fromNow(item.create_time)}`
}

function mineTimeText(item) {
  if (mineTrash.value) return `删除于 ${fromNow(item.delete_time)}`
  return fromNow(item.create_time)
}

// ---------- 统计加载 ----------
async function loadStats() {
  loadingStats.value = true
  try {
    await loadUnread()
    if (view.value === 'broadcast') await loadBroadcastStats()
    else await loadMineStats()
  } finally {
    loadingStats.value = false
  }
}

async function loadUnread() {
  try {
    const res = await getUnreadCount()
    unreadCount.value = Number(res?.data?.count || 0)
  } catch {
    unreadCount.value = 0
  }
}

async function loadBroadcastStats() {
  // count 接口固定按当前用户过滤，广播数量只能用列表接口的 count
  const [normalRes, trashRes] = await Promise.all([
    listBroadcasts({ page: 1, limit: 1, field: 'id,create_time' }),
    listBroadcasts({ page: 1, limit: 1, field: 'id', onlyTrashed: true })
  ])
  bcStats.total = Number(normalRes?.data?.count || 0)
  bcStats.trashed = Number(trashRes?.data?.count || 0)
  bcStats.latest = Number(normalRes?.data?.data?.[0]?.create_time || 0)
}

async function loadMineStats() {
  const [totalRes, unreadRes, readRes, trashRes] = await Promise.all([
    countNotifications(),
    countNotifications({ where: JSON.stringify({ is_read: 0 }) }),
    countNotifications({ where: JSON.stringify({ is_read: 1 }) }),
    countNotifications({ onlyTrashed: true })
  ])
  mineStats.total = Number(totalRes?.data || 0)
  mineStats.unread = Number(unreadRes?.data || 0)
  mineStats.read = Number(readRes?.data || 0)
  mineStats.trash = Number(trashRes?.data || 0)
}

// ---------- 系统公告 ----------
async function loadBroadcasts() {
  bcLoading.value = true
  try {
    const params = { page: bcPage.value, limit: pageSize }
    if (trash.value) params.onlyTrashed = true
    const kw = bcSearchKey.value.replace(/['"\\%_|]/g, '').trim()
    if (kw) params.like = `title|${kw}`
    const res = await listBroadcasts(params)
    bcList.value = res.data?.data || []
    bcTotal.value = res.data?.count || 0
  } catch {
    bcList.value = []
    bcTotal.value = 0
  } finally {
    bcLoading.value = false
  }
}

function reloadBroadcasts() {
  bcPage.value = 1
  loadBroadcasts()
}

const doBroadcastSearch = debounce(() => {
  bcSearchKey.value = bcKeyword.value
  reloadBroadcasts()
}, 350)

async function switchTrash(value) {
  if (trash.value === value) return
  trash.value = value
  bcKeyword.value = ''
  bcSearchKey.value = ''
  bcPage.value = 1
  await loadBroadcasts()
}

function changeBroadcastPage(p) {
  if (p < 1 || p === bcPage.value) return
  bcPage.value = p
  loadBroadcasts()
}

// ---------- 我的消息 ----------
async function loadMine() {
  loading.value = true
  try {
    const params = { page: page.value, limit: pageSize }
    // root 默认会连带广播（uid=0），显式传自己的 uid 只看个人消息
    if (currentUid.value) params.uid = currentUid.value
    if (mineTrash.value) {
      params.onlyTrashed = true
      params.order = 'delete_time desc'
    }

    const where = {}
    const tab = readTabs.find((t) => t.key === readFilter.value)
    if (tab?.where) Object.assign(where, tab.where)
    if (typeFilter.value) where.type = typeFilter.value
    if (Object.keys(where).length) params.where = JSON.stringify(where)

    const kw = searchKey.value.replace(/['"\\%_|]/g, '').trim()
    if (kw) params.like = `title|${kw}`

    const res = await listNotifications(params)
    list.value = res.data?.data || []
    total.value = res.data?.count || 0
    clearSelection()
  } catch {
    list.value = []
    total.value = 0
  } finally {
    loading.value = false
  }
}

function reloadMine() {
  page.value = 1
  loadMine()
}

const doMineSearch = debounce(() => {
  searchKey.value = keyword.value
  reloadMine()
}, 350)

async function switchReadFilter(key) {
  if (!mineTrash.value && readFilter.value === key) return
  mineTrash.value = false
  readFilter.value = key
  keyword.value = ''
  searchKey.value = ''
  reloadMine()
}

async function switchMineTrash() {
  mineTrash.value = !mineTrash.value
  keyword.value = ''
  searchKey.value = ''
  page.value = 1
  await loadMine()
}

function changePage(p) {
  if (p < 1 || p === page.value) return
  page.value = p
  loadMine()
}

// ---------- 选择 ----------
const selectedSet = computed(() => new Set(selectedIds.value))
const pageAllSelected = computed(() => list.value.length > 0 && list.value.every((i) => selectedSet.value.has(i.id)))
const someSelected = computed(() => selectedIds.value.length > 0 && !pageAllSelected.value)

const selectAllRef = ref(null)

watchEffect(() => {
  if (selectAllRef.value) selectAllRef.value.indeterminate = someSelected.value
})

function isSelected(id) {
  return selectedSet.value.has(id)
}

function toggleSelect(id) {
  const next = new Set(selectedIds.value)
  if (next.has(id)) next.delete(id)
  else next.add(id)
  selectedIds.value = [...next]
}

function toggleSelectAll() {
  selectedIds.value = pageAllSelected.value ? [] : list.value.map((i) => i.id)
}

function clearSelection() {
  selectedIds.value = []
}

// ---------- 发送系统消息 / 新建公告 ----------
function openSend(target = 'all') {
  send.target = target
  send.title = target === 'all' ? '发布系统公告' : '发送系统消息'
  send.titleText = ''
  send.content = ''
  send.userIds = ''
  send.asSystem = true
  send.sendEmail = false
  send.visible = true
}

async function submitSend() {
  const title = send.titleText.trim()
  const content = send.content.trim()
  if (!title) {
    toast.warning('请输入通知标题')
    return
  }
  if (!content) {
    toast.warning('请输入通知内容')
    return
  }

  const payload = { title, content, as_system: send.asSystem }
  if (send.target === 'all') {
    payload.target_type = 'all'
  } else {
    const ids = String(send.userIds || '')
      .split(',')
      .map((s) => Number(s.trim()))
      .filter((n) => Number.isInteger(n) && n > 0)
    if (!ids.length) {
      toast.warning('请输入有效的用户 ID')
      return
    }
    payload.target_type = ids.length === 1 ? 'single' : 'partial'
    payload.user_ids = ids
    payload.send_email = send.sendEmail
  }

  send.loading = true
  try {
    const res = await sendSystemMessage(payload)
    toast.success(send.target === 'all' ? '公告已发布，全体用户可见' : `推送完成：成功 ${res?.data?.success || 0} 个`)
    send.visible = false
    await Promise.all([loadStats(), view.value === 'broadcast' ? loadBroadcasts() : loadMine()])
  } catch {
    // 失败提示由请求拦截器统一给出（如无权限）
  } finally {
    send.loading = false
  }
}

// ---------- 编辑公告 ----------
function openEdit(item) {
  edit.id = Number(item.id)
  edit.title = item.title || ''
  edit.content = item.content || ''
  edit.visible = true
}

async function saveEdit() {
  const title = edit.title.trim()
  const content = edit.content.trim()
  if (!title) {
    toast.warning('请输入通知标题')
    return
  }
  if (!content) {
    toast.warning('请输入通知内容')
    return
  }

  edit.loading = true
  try {
    await updateNotification({ id: edit.id, title, content })
    toast.success('公告已更新')
    edit.visible = false
    await loadBroadcasts()
  } catch {
    /* 拦截器已提示 */
  } finally {
    edit.loading = false
  }
}

// ---------- 已读 ----------
async function markRead(item) {
  busy.value = true
  try {
    await readNotification(item.id)
    await Promise.all([loadMine(), loadStats()])
  } catch {
    /* 拦截器已提示 */
  } finally {
    busy.value = false
  }
}

async function batchRead() {
  const ids = [...selectedIds.value]
  busy.value = true
  try {
    await readBatchNotifications(ids)
    toast.success(`已标记 ${ids.length} 条为已读`)
    clearSelection()
    await Promise.all([loadMine(), loadStats()])
  } catch {
    /* 拦截器已提示 */
  } finally {
    busy.value = false
  }
}

function askReadAll() {
  openConfirm({
    title: '全部标记已读',
    message: `确定将当前账号的全部消息（${unreadCount.value} 条未读）标记为已读吗？`,
    confirmText: '标记已读',
    action: async () => {
      await readAllNotifications()
      toast.success('已全部标记为已读')
      await Promise.all([loadMine(), loadStats()])
    }
  })
}

// ---------- 删除 / 恢复 ----------
function openConfirm({ title, message, confirmText = '确定', danger = false, action }) {
  confirm.title = title
  confirm.message = message
  confirm.confirmText = confirmText
  confirm.danger = danger
  confirm.action = action
  confirm.visible = true
}

async function runConfirm() {
  if (typeof confirm.action !== 'function') {
    confirm.visible = false
    return
  }
  confirm.loading = true
  try {
    const ok = await confirm.action()
    if (ok !== false) confirm.visible = false
  } catch {
    // 请求失败时保持弹窗打开，错误提示已由请求拦截器统一给出
  } finally {
    confirm.loading = false
  }
}

// 公告撤回与个人消息删除的区别文案
function removeTitle() {
  return view.value === 'broadcast' ? '撤回公告' : '删除消息'
}

function askRemove(item) {
  openConfirm({
    title: removeTitle(),
    message:
      view.value === 'broadcast'
        ? `确定撤回公告「${item.title}」吗？撤回后对所有用户立即不可见，可在「已撤回」中恢复。`
        : `确定删除消息「${item.title}」吗？删除后可在回收站找回。`,
    confirmText: view.value === 'broadcast' ? '撤回' : '删除',
    danger: true,
    action: async () => {
      await removeNotifications([item.id])
      toast.success(view.value === 'broadcast' ? '公告已撤回' : '已移入回收站')
      await Promise.all([refreshList(), loadStats()])
    }
  })
}

async function restore(item) {
  busy.value = true
  try {
    await restoreNotifications([item.id])
    toast.success('已恢复')
    await Promise.all([refreshList(), loadStats()])
  } catch {
    /* 拦截器已提示 */
  } finally {
    busy.value = false
  }
}

function askForceDelete(item) {
  openConfirm({
    title: '彻底删除',
    message: `确定彻底删除「${item.title}」吗？此操作不可恢复！`,
    confirmText: '彻底删除',
    danger: true,
    action: async () => {
      await forceDeleteNotifications([item.id])
      toast.success('已彻底删除')
      await Promise.all([refreshList(), loadStats()])
    }
  })
}

function askBatchRemove() {
  const ids = [...selectedIds.value]
  openConfirm({
    title: '批量删除',
    message: `确定删除选中的 ${ids.length} 条消息吗？删除后可在回收站找回。`,
    confirmText: '删除',
    danger: true,
    action: async () => {
      await removeNotifications(ids)
      toast.success(`已删除 ${ids.length} 条`)
      clearSelection()
      await Promise.all([refreshList(), loadStats()])
    }
  })
}

async function batchRestore() {
  const ids = [...selectedIds.value]
  busy.value = true
  try {
    await restoreNotifications(ids)
    toast.success(`已恢复 ${ids.length} 条`)
    clearSelection()
    await Promise.all([refreshList(), loadStats()])
  } catch {
    /* 拦截器已提示 */
  } finally {
    busy.value = false
  }
}

function askBatchForceDelete() {
  const ids = [...selectedIds.value]
  openConfirm({
    title: '批量彻底删除',
    message: `确定彻底删除选中的 ${ids.length} 条消息吗？此操作不可恢复！`,
    confirmText: '彻底删除',
    danger: true,
    action: async () => {
      await forceDeleteNotifications(ids)
      toast.success(`已彻底删除 ${ids.length} 条`)
      clearSelection()
      await Promise.all([refreshList(), loadStats()])
    }
  })
}

function askClearRecycle() {
  openConfirm({
    title: '清空回收站',
    message: '确定清空回收站吗？其中所有记录将被彻底删除，不可恢复！',
    confirmText: '清空',
    danger: true,
    action: async () => {
      await clearNotificationRecycle()
      toast.success('回收站已清空')
      if (view.value === 'broadcast') {
        bcPage.value = 1
      } else {
        page.value = 1
      }
      await Promise.all([refreshList(), loadStats()])
    }
  })
}

// 刷新当前模块的列表（root 清空回收站会连同广播一起清理，两个模块都要能刷新）
function refreshList() {
  return view.value === 'broadcast' ? loadBroadcasts() : loadMine()
}

// ---------- 模块切换 ----------
async function switchView(key) {
  if (view.value === key) return
  view.value = key
  if (key === 'broadcast' && !bcList.value.length) await loadBroadcasts()
  if (key === 'mine' && !list.value.length) await loadMine()
  await loadStats()
}

onMounted(async () => {
  await Promise.all([loadBroadcasts(), loadStats()])
})
</script>

<style scoped>
.message-admin {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

/* ---------- 概览 ---------- */
.panel-head,
.list-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 16px;
}
.block-title {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
}
.block-desc {
  margin: 4px 0 0;
  font-size: 12px;
  color: var(--text-muted);
}
.head-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}

.stat-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 12px;
}
.stat-card {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px;
  background: var(--bg-muted);
  border-radius: var(--radius);
}
.stat-icon {
  width: 36px;
  height: 36px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 12px;
  background: var(--bg-card);
  font-size: 18px;
}
.stat-body {
  display: flex;
  flex-direction: column;
  min-width: 0;
}
.stat-value {
  font-size: 18px;
  font-weight: 700;
  line-height: 1.2;
}
.stat-label {
  font-size: 12px;
  color: var(--text-muted);
}

/* ---------- 模块切换 ---------- */
.view-tabs {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
  padding-bottom: 14px;
  border-bottom: 1px solid var(--border-soft);
}
.view-tabs .status-tab,
.status-tab {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  /* 与下拉 / 搜索框 / 按钮等高 */
  height: var(--control-h-sm);
  padding: 0 14px;
  font-size: 13px;
  border-radius: var(--radius-sm);
  border: 1px solid transparent;
  background: var(--bg-muted);
  color: var(--text-soft);
  cursor: pointer;
  transition: all 0.15s;
}
.view-tabs .status-tab:hover,
.status-tab:hover {
  color: var(--primary);
}
.view-tabs .status-tab.active,
.status-tab.active {
  background: var(--primary);
  color: #fff;
}

/* ---------- 工具栏 ---------- */
.list-filter {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
  padding-bottom: 14px;
  border-bottom: 1px solid var(--border-soft);
}
.status-tabs {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}
.filter-right {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  margin-left: auto;
}
.search-box {
  position: relative;
  width: 170px;
}
.search-box .bi {
  position: absolute;
  left: 10px;
  top: 50%;
  transform: translateY(-50%);
  font-size: 13px;
  color: var(--text-light);
}
.search-input {
  width: 100%;
  height: var(--control-h-sm);
  padding: 0 12px 0 30px;
  font-size: 13px;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background: var(--bg-card);
  color: var(--text);
  outline: none;
  transition: border-color 0.2s, box-shadow 0.2s;
}
.search-input:focus {
  border-color: var(--primary);
  box-shadow: 0 0 0 3px var(--accent-ring);
}

/* ---------- 批量 / 回收站 ---------- */
.batch-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 12px;
  padding: 10px 12px;
  background: var(--accent-wash);
  border: 1px solid var(--accent-soft);
  border-radius: var(--radius);
}
.batch-count {
  font-size: 13px;
  color: var(--text-soft);
}
.batch-count strong {
  color: var(--primary-deep);
}
.batch-actions {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 6px;
}

.trash-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 12px;
  padding: 10px 12px;
  font-size: 12px;
  color: var(--warning);
  background: var(--gold-wash);
  border-radius: var(--radius);
}

/* ---------- 列表 ---------- */
.loading {
  padding: 40px;
  text-align: center;
  color: var(--text-muted);
}
.empty-row {
  padding: 12px 0;
}

.list-head-row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 8px 4px;
}
.list-head-text {
  font-size: 12px;
  color: var(--text-muted);
}

.notice-list {
  display: flex;
  flex-direction: column;
}
.notice-row {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 12px 6px;
  border-bottom: 1px dashed var(--border-soft);
  border-radius: var(--radius-sm);
  transition: background 0.15s;
}
.notice-row:last-child {
  border-bottom: none;
}
.notice-row:hover {
  background: var(--bg-muted);
}
.notice-row.selected {
  background: var(--accent-wash);
}

.pick {
  display: flex;
  align-items: center;
  height: 22px;
  cursor: pointer;
}
.pick input {
  width: 15px;
  height: 15px;
  accent-color: var(--primary);
  cursor: pointer;
}

.type-chip {
  flex-shrink: 0;
  padding: 2px 8px;
  font-size: 11px;
  border-radius: 3px;
  color: var(--text-muted);
  background: var(--bg-muted);
}
.type-chip.is-system {
  color: var(--primary-deep);
  background: var(--accent-soft);
}

.notice-main {
  flex: 1;
  min-width: 0;
}
.notice-title-row {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
}
.notice-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--text);
}
.notice-title.is-unread {
  color: var(--primary-deep);
}
.unread-dot {
  width: 7px;
  height: 7px;
  flex-shrink: 0;
  border-radius: 50%;
  background: var(--danger);
}
.id-chip {
  padding: 1px 6px;
  font-size: 11px;
  color: var(--text-muted);
  background: var(--bg-muted);
  border-radius: 3px;
}
.notice-content {
  margin: 4px 0 0;
  font-size: 13px;
  line-height: 1.7;
  color: var(--text-soft);
  /* 内容较长时最多显示两行 */
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.notice-meta {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px;
  margin-top: 4px;
  font-size: 12px;
  color: var(--text-muted);
}
.meta-text {
  display: inline-flex;
  align-items: center;
  gap: 3px;
}

.notice-actions {
  display: flex;
  align-items: center;
  gap: 4px;
  flex-shrink: 0;
}
.notice-actions .danger:hover:not(:disabled) {
  border-color: var(--danger);
  color: var(--danger);
}
.notice-actions .btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* ---------- 弹窗 ---------- */
.form-item {
  margin-bottom: 14px;
}
.check-line {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 0;
  font-size: 13px;
  color: var(--text-soft);
  cursor: pointer;
}
.check-line input {
  width: 15px;
  height: 15px;
  accent-color: var(--primary);
  cursor: pointer;
}
.check-line.is-disabled {
  color: var(--text-muted);
  cursor: not-allowed;
}
.form-hint {
  margin: 6px 0 0;
  font-size: 12px;
  line-height: 1.6;
  color: var(--text-muted);
}

@media (max-width: 768px) {
  .list-filter {
    gap: 8px;
  }
  .filter-right,
  .search-box {
    width: 100%;
    margin-left: 0;
  }
  .notice-row {
    flex-wrap: wrap;
  }
  .notice-main {
    flex: 1 1 60%;
  }
  .notice-actions {
    width: 100%;
    justify-content: flex-end;
  }
  .form-grid {
    grid-template-columns: 1fr;
  }
  .stat-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}
</style>
