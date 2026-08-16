<template>
  <div class="sidebar">
    <!-- 用户卡片 -->
    <div class="user-card card card-pad">
      <template v-if="userStore.isLogged">
        <img
          :src="user?.avatar || defaultAvatar"
          class="user-avatar"
          @error="onAvatarError"
        />
        <div class="user-name">{{ user?.nickname }}</div>
        <div class="user-desc">{{ user?.description || '这个人很懒，什么都没留下' }}</div>
        <div class="user-actions">
          <router-link :to="`/user`" class="btn btn-sm btn-ghost">用户中心</router-link>
          <button class="btn btn-sm btn-ghost" @click="userStore.logout">退出</button>
        </div>
      </template>
      <template v-else>
        <img :src="defaultAvatar" class="user-avatar" />
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
        <span>消息中心</span>
        <span v-if="notif.count > 0" class="badge">{{ notif.count }}</span>
      </div>
      <div class="notify-actions">
        <router-link to="/user/notifications" class="btn btn-sm btn-block">查看全部</router-link>
        <button class="btn btn-sm btn-block" :disabled="notif.count === 0" @click="markAll">
          全部已读
        </button>
      </div>
    </div>

    <!-- 分类/导航 -->
    <div class="card card-pad-sm">
      <div class="card-title"><span>分类导航</span></div>
      <ul class="cat-list">
        <li v-for="g in groups" :key="g.id">
          <router-link :to="`/articles?group=${g.id}`" class="cat-item">
            <span class="cat-name">{{ g.name }}</span>
            <span class="cat-count">{{ g.count || 0 }}</span>
          </router-link>
        </li>
        <li v-if="!groups.length" class="empty" style="padding: 16px;">暂无分类</li>
      </ul>
    </div>

    <!-- 标签云 -->
    <div class="card card-pad-sm">
      <div class="card-title"><span>标签云</span></div>
      <div class="tag-cloud">
        <router-link
          v-for="t in tags"
          :key="t.id"
          :to="`/articles?tag=${t.id}`"
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
      <div class="stat-row">
        <span>运行</span>
        <strong>{{ runtimeDays }} 天</strong>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useUserStore } from '@/stores/user'
import { useNotificationStore } from '@/stores/notification'
import { getArticleGroupTree } from '@/api/article'
import { call } from '@/api/request'
import { toast } from '@/utils/toast'

const userStore = useUserStore()
const notif = useNotificationStore()
const { user } = storeToRefs(userStore)

const defaultAvatar = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 80"><circle cx="40" cy="40" r="40" fill="%23e8e6dd"/><text x="50%25" y="55%25" text-anchor="middle" font-size="36" fill="%238a8a82" font-family="serif">用</text></svg>'

function onAvatarError(e) {
  e.target.src = defaultAvatar
}

const groups = ref([])
const tags = ref([])
const totalCount = ref(0)
const stats = ref({ article: 0, moment: 0, link: 0 })
const startTime = ref(Date.now())

async function loadGroups() {
  try {
    const res = await getArticleGroupTree()
    const tree = res.data || []
    // 拍平树
    const flat = []
    const walk = (nodes, level = 0) => {
      nodes.forEach((n) => {
        flat.push({ id: n.id, name: '— '.repeat(level) + n.name, count: n.article_count })
        if (n.children?.length) walk(n.children, level + 1)
      })
    }
    walk(tree)
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
      call('article', 'count', { method: 'GET', params: { where: JSON.stringify({ status: 1 }) } }),
      call('moments', 'count', { method: 'GET', params: { where: JSON.stringify({ audit: 1, status: 1 }) } }),
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

async function markAll() {
  if (notif.count === 0) return
  try {
    await notif.readAll()
    toast.success('已全部标记为已读')
  } catch {}
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
.user-avatar {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  margin: 0 auto 12px;
  object-fit: cover;
  border: 2px solid var(--border);
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
  justify-content: center;
  gap: 8px;
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

.cat-list {
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.cat-item {
  display: flex;
  justify-content: space-between;
  padding: 8px 4px;
  border-radius: var(--radius-sm);
  font-size: 13px;
  color: var(--text-soft);
  transition: all 0.15s;
}
.cat-item:hover {
  background: var(--bg-muted);
  color: var(--primary);
}
.cat-count {
  font-size: 11px;
  color: var(--text-light);
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

.notify-actions {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.notify-card {
  padding: 14px;
}
</style>