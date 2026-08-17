<template>
  <div class="sidebar">
    <!-- 用户卡片 -->
    <div class="user-card card card-pad">
      <template v-if="userStore.isLogged">
        <AvatarFrame
          :src="user?.avatar"
          :frame="user?.json?.frame"
          :fallback="defaultAvatar"
          :size="'75px'"
          :frame-scale="1.6"
          alt="用户头像"
        />
        <div class="user-name">{{ user?.nickname }}</div>
        <div class="user-desc">{{ user?.description || '这个人很懒，什么都没留下' }}</div>
        <div class="user-actions">
          <router-link :to="`/user`" class="btn btn-sm btn-ghost"><i class="bi bi-person" /> 用户中心</router-link>
          <router-link :to="`/author/${user?.id}`" class="btn btn-sm btn-ghost"><i class="bi bi-person-square" /> 用户主页</router-link>
        </div>
        <div class="signin-entry">
          <button class="btn btn-sm btn-primary btn-block" @click="openCheckin">
            <i class="bi bi-calendar-check" /> 每日签到
          </button>
          <button class="btn btn-sm btn-ghost btn-block" @click="userStore.logout"><i class="bi bi-box-arrow-right" />退出登录</button>
        </div>
      </template>
      <template v-else>
        <AvatarFrame :src="touxiang" :size="'80px'" alt="未登录头像" />
        <div class="user-name">未登录</div>
        <div class="user-desc">登录后享受更多功能</div>
        <div class="user-actions">
          <router-link to="/auth/login" class="btn btn-sm btn-primary">登录</router-link>
          <router-link to="/auth/register" class="btn btn-sm">注册</router-link>
        </div>
      </template>
    </div>

    <!-- 通知 -->
    <div v-if="userStore.isLogged" class="card card-pad-sm notify-card">
      <div class="card-title">
        <span class="notify-title">
          消息通知
          <span v-if="notif.count > 0" class="notif-badge">{{ notif.count > 99 ? '99+' : notif.count }}</span>
        </span>
        <router-link to="/user/notifications" class="more-link">查看全部 <i class="bi bi-arrow-right" /></router-link>
      </div>
      <button
        v-if="notif.latest"
        class="notif-preview"
        :class="{ unread: !notif.latest.is_read }"
        @click="openLatest"
      >
        <span class="notif-preview-icon" :class="`type-${notif.latest.type}`">
          <i :class="notifIcon(notif.latest.type)" />
        </span>
        <span class="notif-preview-body">
          <span class="notif-preview-content">{{ notif.latest.content || notif.latest.title }}</span>
          <span class="notif-preview-meta">
            <span>{{ typeLabel(notif.latest.type) }}</span>
            <span>·</span>
            <span>{{ fromNow(notif.latest.create_time) }}</span>
          </span>
        </span>
      </button>
      <p v-else class="notif-empty">暂无消息</p>
    </div>

    <!-- 分类/导航 -->
    <div class="card card-pad-sm">
      <div class="card-title">
        <span>分类导航</span>
        <router-link to="/categories" class="more-link">查看全部 <i class="bi bi-arrow-right" /></router-link>
      </div>
      <div class="tag-cloud">
        <router-link
          v-for="g in groups"
          :key="g.id"
          :to="`/category/${g.id}`"
          class="tag tag-primary"
        >{{ g.name }}</router-link>
        <span v-if="!groups.length" class="empty" style="padding: 12px 0;">暂无分类</span>
      </div>
    </div>

    <!-- 标签云 -->
    <div class="card card-pad-sm">
      <div class="card-title">
        <span>标签云</span>
        <router-link to="/tags" class="more-link">查看全部 <i class="bi bi-arrow-right" /></router-link>
      </div>
      <div class="tag-cloud">
        <router-link
          v-for="t in tags"
          :key="t.id"
          :to="`/tag/${t.id}`"
          class="tag tag-primary"
        >{{ t.name }}</router-link>
        <span v-if="!tags.length" class="empty" style="padding: 12px 0;">暂无标签</span>
      </div>
    </div>

    <!-- 文章归档 -->
    <div class="card card-pad-sm">
      <div class="card-title"><span>文章归档</span></div>
      <ul class="archive-list">
        <li>
          <router-link to="/archives" class="archive-item">
            <span>所有文章</span>
            <span class="text-muted">{{ totalCount }}</span>
          </router-link>
        </li>
      </ul>
    </div>

    <!-- 站点信息 -->
    <div class="card card-pad-sm stats-card">
      <div class="stat-row">
        <span>文章</span>
        <strong>{{ stats.article }}</strong>
      </div>
      <div class="stat-row">
        <span>动态</span>
        <strong>{{ stats.moment }}</strong>
      </div>
      <div class="stat-row">
        <span>友链</span>
        <strong>{{ stats.link }}</strong>
      </div>
    </div>

    <!-- 签到弹窗 -->
    <CheckinDialog ref="checkinDialog" />
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useUserStore } from '@/stores/user'
import { useNotificationStore } from '@/stores/notification'
import { getArticleGroups } from '@/api/article'
import { readNotification } from '@/api/tags'
import { call } from '@/api/request'
import { fromNow } from '@/utils/time'

import { useRouter } from 'vue-router'
import CheckinDialog from '@/components/CheckinDialog.vue'
import AvatarFrame from '@/components/AvatarFrame.vue'
import touxiang from '@/assets/img/touxiang.webp'

const userStore = useUserStore()
const notif = useNotificationStore()
const { user } = storeToRefs(userStore)

const checkinDialog = ref(null)
function openCheckin() {
  checkinDialog.value?.show()
}

const defaultAvatar = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 80"><circle cx="40" cy="40" r="40" fill="%23e8e6dd"/><text x="50%25" y="55%25" text-anchor="middle" font-size="36" fill="%238a8a82" font-family="serif">用</text></svg>'

const groups = ref([])
const tags = ref([])
const totalCount = ref(0)
const stats = ref({ article: 0, moment: 0, link: 0 })
const startTime = ref(Date.now())

async function loadGroups() {
  try {
    const res = await getArticleGroups()
    const list = res.data?.data || []
    // 基于 pid 构建层级，按 pid 排序（pid=0 为顶级）
    const flat = []
    const walk = (parentId, level) => {
      list
        .filter((n) => n.pid === parentId)
        .forEach((n) => {
          flat.push({ id: n.id, name: n.name })
          walk(n.id, level + 1)
        })
    }
    walk(0, 0)
    // 处理孤儿节点
    list
      .filter((n) => !flat.find((f) => f.id === n.id))
      .forEach((n) => flat.push({ id: n.id, name: n.name }))
    groups.value = flat
  } catch {
    groups.value = []
  }
}

async function loadTags() {
  try {
    const res = await call('tags', 'all', {
      method: 'GET',
      params: { limit: 20, order: 'create_time desc', field: 'id,name' }
    })
    tags.value = res.data?.data || []
  } catch {}
}

async function loadStats() {
  try {
    const [a, m, l] = await Promise.all([
      call('article', 'count', { method: 'GET', params: { where: { audit: 1 } } }),
      call('moments', 'count', { method: 'GET', params: { where: { audit: 1, status: 1 } } }),
      call('links', 'count', { method: 'GET' })
    ])
    stats.value = {
      article: a.data || 0,
      moment: m.data || 0,
      link: l.data || 0
    }
    totalCount.value = a.data || 0
  } catch {}
}

const runtimeDays = computed(() => {
  const diff = Date.now() - startTime.value
  return Math.floor(diff / (1000 * 60 * 60 * 24)) + 1
})

const router = useRouter()

const typeMap = {
  comment: { icon: 'bi bi-chat-dots', label: '评论' },
  like: { icon: 'bi bi-hand-thumbs-up', label: '点赞' },
  follow: { icon: 'bi bi-people', label: '关注' },
  collect: { icon: 'bi bi-star', label: '收藏' },
  system: { icon: 'bi bi-megaphone', label: '系统' }
}
function typeLabel(t) {
  return typeMap[t]?.label || '通知'
}
function notifIcon(t) {
  return typeMap[t]?.icon || 'bi bi-bell'
}

async function openLatest() {
  const n = notif.latest
  if (!n) return
  // 未读则先标记已读，并刷新侧边栏的最新消息/角标
  if (!n.is_read) {
    try {
      await readNotification(n.id)
      n.is_read = 1
      await notif.refresh()
    } catch {}
  }
  // 跳转关联内容
  if (n.bind_type === 'article' && n.bind_id) {
    router.push(`/archives/${n.bind_id}`)
  } else if (n.bind_type === 'moments' && n.bind_id) {
    router.push('/moments')
  } else if (n.bind_type === 'user' && n.bind_id) {
    router.push('/user/notifications')
  } else {
    router.push('/user/notifications')
  }
}

onMounted(() => {
  loadGroups()
  loadTags()
  loadStats()
  if (userStore.isLogged) notif.startPolling()
})

watch(
  () => userStore.isLogged,
  (v) => {
    if (v) notif.startPolling()
    else notif.stopPolling()
  }
)
</script>

<style scoped>
.sidebar {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.user-card {
  text-align: center;
}
.user-name {
  font-size: 16px;
  font-weight: 600;
  margin-bottom: 4px;
}
.user-desc {
  font-size: 12px;
  color: var(--text-muted);
  margin-bottom: 16px;
  min-height: 18px;
}
.user-actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 8px;
}
.signin-entry {
  margin-top: 12px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.card-title {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 13px;
  font-weight: 600;
  color: var(--text);
  margin-bottom: 12px;
}
.badge {
  display: inline-block;
  min-width: 18px;
  height: 18px;
  border-radius: 9px;
  background: var(--danger);
  color: #fff;
  font-size: 11px;
  line-height: 18px;
  text-align: center;
  padding: 0 6px;
}
.more-link {
  color: var(--text-muted);
  font-size: 12px;
  font-weight: normal;
}
.more-link:hover {
  color: var(--primary);
}

.tag-cloud {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
.tag-cloud .tag {
  font-size: 11px;
  padding: 3px 8px;
}

.archive-list .archive-item {
  display: flex;
  justify-content: space-between;
  padding: 8px 4px;
  font-size: 13px;
  color: var(--text-soft);
}
.archive-list .archive-item:hover {
  color: var(--primary);
}

.stats-card .stat-row {
  display: flex;
  justify-content: space-between;
  padding: 6px 0;
  font-size: 13px;
  color: var(--text-soft);
}
.stats-card .stat-row + .stat-row {
  border-top: 1px dashed var(--border-soft);
}
.stats-card strong {
  color: var(--primary-deep);
  font-weight: 600;
}

.notify-title {
  position: relative;
}
.notif-badge {
  position: absolute;
  top: -8px;
  left: calc(100% + 4px);
  min-width: 18px;
  height: 18px;
  padding: 0 5px;
  border-radius: 9px;
  background: var(--danger);
  color: #fff;
  font-size: 11px;
  line-height: 18px;
  text-align: center;
  box-shadow: 0 0 0 2px var(--bg-card);
  animation: notifPulse 2s ease-in-out infinite;
}
@keyframes notifPulse {
  0%,
  100% {
    box-shadow: 0 0 0 2px var(--bg-card), 0 0 0 0 rgba(217, 84, 77, 0.35);
  }
  50% {
    box-shadow: 0 0 0 2px var(--bg-card), 0 0 0 5px rgba(217, 84, 77, 0);
  }
}
.notify-card {
  padding: 14px;
}
.notif-preview {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  width: 100%;
  padding: 10px;
  border: 1px solid var(--border-soft);
  border-radius: 8px;
  background: var(--bg-muted);
  text-align: left;
  cursor: pointer;
  font-family: inherit;
  transition: border-color 0.15s, background 0.15s;
}
.notif-preview:hover {
  border-color: var(--primary);
  background: var(--bg-card);
}
.notif-preview.unread {
  background: rgba(184, 153, 104, 0.08);
}
.notif-preview-icon {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  background: var(--bg-muted);
}
.notif-preview-icon.type-comment {
  background: rgba(184, 153, 104, 0.14);
  color: var(--primary-deep);
}
.notif-preview-icon.type-like {
  background: rgba(217, 84, 77, 0.12);
  color: var(--danger);
}
.notif-preview-icon.type-follow {
  background: rgba(108, 154, 77, 0.12);
  color: var(--success);
}
.notif-preview-icon.type-collect {
  background: rgba(212, 161, 72, 0.12);
  color: #c7902f;
}
.notif-preview-icon.type-system {
  background: rgba(74, 144, 226, 0.12);
  color: #4a90e2;
}
.notif-preview-body {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 3px;
}
.notif-preview-content {
  font-size: 12px;
  color: var(--text);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.notif-preview.unread .notif-preview-content {
  font-weight: 600;
}
.notif-preview-meta {
  display: flex;
  gap: 4px;
  font-size: 11px;
  color: var(--text-muted);
}
.notif-empty {
  font-size: 12px;
  color: var(--text-muted);
  padding: 8px 4px;
}
</style>