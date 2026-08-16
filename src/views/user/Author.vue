<template>
  <div class="author-page">
    <!-- 用户资料卡 -->
    <div class="card card-pad author-card">
      <div class="author-head">
        <img :src="profile.avatar || defaultAvatar" class="author-avatar" @error="onImgError" />
        <div class="author-meta">
          <div class="author-name-row">
            <span class="author-name">{{ profile.nickname }}</span>
            <span v-if="level" class="author-level">Lv.{{ level }}</span>
          </div>
          <div class="author-desc">{{ profile.description || '这个人很懒，什么都没留下' }}</div>
          <div class="author-stats">
            <div class="stat" @click="switchTab('article')">
              <strong>{{ stats.article }}</strong>
              <span>文章</span>
            </div>
            <div class="stat" @click="switchTab('follow')">
              <strong>{{ stats.follow }}</strong>
              <span>关注</span>
            </div>
            <div class="stat" @click="switchTab('fans')">
              <strong>{{ stats.fans }}</strong>
              <span>粉丝</span>
            </div>
          </div>
          <div class="author-actions">
            <button
              v-if="!isSelf"
              class="btn btn-sm"
              :class="following ? 'btn-ghost' : 'btn-primary'"
              @click="toggleFollow"
            >{{ following ? '已关注' : '关注' }}</button>
            <router-link v-else to="/user/profile" class="btn btn-sm btn-ghost">编辑资料</router-link>
          </div>
        </div>
      </div>
    </div>

    <!-- 内容区 -->
    <div class="card card-pad">
      <div class="tab-bar">
        <button :class="['tab', tab === 'article' && 'active']" @click="switchTab('article')">TA的文章</button>
        <button :class="['tab', tab === 'like' && 'active']" @click="switchTab('like')">TA的点赞</button>
        <button :class="['tab', tab === 'collect' && 'active']" @click="switchTab('collect')">TA的收藏</button>
      </div>

      <div v-if="loading" class="loading"><span class="spinner" /> 加载中...</div>
      <div v-else-if="!list.length" class="empty-row">
        <EmptyState :text="emptyText" />
      </div>

      <!-- 文章列表 -->
      <template v-else-if="tab === 'article'">
        <ArticleCard v-for="a in list" :key="a.id" :article="a" />
      </template>

      <!-- 点赞 / 收藏列表 -->
      <ul v-else class="like-list">
        <li v-for="(i, k) in list" :key="k" class="like-item">
          <router-link :to="targetLink(i)" class="like-link">
            <span class="like-title">{{ i.result?.title || i.target?.title || formatText(i) }}</span>
            <span class="like-type">{{ typeLabel(i.type) }}</span>
            <span class="like-time">{{ fromNow(i.create_time) }}</span>
          </router-link>
        </li>
      </ul>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import ArticleCard from '@/components/ArticleCard.vue'
import { getUser } from '@/api/users'
import { getAuthorArticles, countArticlesByAuthor } from '@/api/article'
import { myLikes, myCollects } from '@/api/tags'
import { call } from '@/api/request'
import { useUserStore } from '@/stores/user'
import { fromNow } from '@/utils/time'
import { toast } from '@/utils/toast'
import EmptyState from '@/components/EmptyState.vue'

const route = useRoute()
const userStore = useUserStore()
const uid = computed(() => Number(route.params.id))

const defaultAvatar = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 80"><circle cx="40" cy="40" r="40" fill="%23e8e6dd"/><text x="50%25" y="55%25" text-anchor="middle" font-size="36" fill="%238a8a82" font-family="serif">用</text></svg>'

const profile = ref({})
const level = ref(0)
const stats = ref({ article: 0, follow: 0, fans: 0 })
const following = ref(false)
const isSelf = computed(() => userStore.isLogged && Number(userStore.user?.id) === uid.value)

const tab = ref('article')
const list = ref([])
const loading = ref(false)
const page = ref(1)
const pageSize = 10
const finished = ref(false)

const emptyText = computed(() => {
  if (tab.value === 'article') return 'TA还没有发布文章'
  if (tab.value === 'like') return 'TA还没有点赞内容'
  return 'TA还没有收藏内容'
})

function onImgError(e) {
  e.target.src = defaultAvatar
}

function switchTab(t) {
  if (t === 'follow' || t === 'fans') {
    toast.info('关注/粉丝列表暂不支持查看')
    return
  }
  if (tab.value === t) return
  tab.value = t
  page.value = 1
  finished.value = false
  load()
}

function typeLabel(t) {
  if (t === 'article') return '文章'
  if (t === 'moments' || t === 'moment') return '动态'
  if (t === 'page') return '页面'
  return '内容'
}

function formatText(i) {
  return (i.result?.content || i.target?.content || '').slice(0, 30) || '内容'
}

function targetLink(i) {
  const type = i.type
  const id = i.target_id || i.id
  if (type === 'moments' || type === 'moment') return `/moments`
  return `/archives/${id}`
}

async function loadProfile() {
  try {
    const res = await getUser(uid.value)
    const u = res.data || {}
    profile.value = {
      nickname: u.nickname || '匿名用户',
      avatar: u.avatar || '',
      description: u.description || u.remarks || ''
    }
    // 等级：兼容 result.level.current 与 users_rating.grade 两种结构
    const lv = u.result?.level?.current || u.users_rating?.users_grade
    level.value = lv?.value || u.users_rating?.grade || u.grade || 0
    stats.value = {
      article: u.article_total || 0,
      follow: u.follow || u.follow_count || 0,
      fans: u.followed || u.followed_count || 0
    }
    // 文章数单独统计（用户对象未直接提供或不可靠）
    try {
      const c = await countArticlesByAuthor(uid.value)
      stats.value.article = c.data || 0
    } catch {}
  } catch {
    profile.value = { nickname: '用户不存在', avatar: '', description: '' }
  }
}

async function loadFollowState() {
  if (isSelf.value) return
  try {
    const res = await call('user-follows', 'is-following', {
      method: 'GET',
      params: { follow_uid: uid.value }
    })
    following.value = !!(res.data && res.data.status)
  } catch {}
}

async function toggleFollow() {
  if (!userStore.isLogged) {
    toast.info('请先登录')
    return
  }
  try {
    if (following.value) {
      await call('user-follows', 'unfollow', { method: 'POST', data: { follow_uid: uid.value } })
      following.value = false
      stats.value.fans = Math.max(0, stats.value.fans - 1)
    } else {
      await call('user-follows', 'follow', { method: 'POST', data: { follow_uid: uid.value } })
      following.value = true
      stats.value.fans += 1
    }
  } catch {}
}

async function load() {
  loading.value = true
  try {
    let res
    if (tab.value === 'article') {
      res = await getAuthorArticles(uid.value, { page: page.value, limit: pageSize })
      list.value = page.value === 1 ? (res.data?.data || []) : [...list.value, ...(res.data?.data || [])]
      finished.value = (res.data?.data || []).length < pageSize
    } else if (tab.value === 'like') {
      if (!userStore.isLogged) {
        toast.info('登录后查看 TA 的点赞')
        list.value = []
        finished.value = true
        return
      }
      res = await myLikes({ page: page.value, limit: pageSize, where: JSON.stringify({ login: uid.value }) })
      list.value = page.value === 1 ? (res.data?.data || []) : [...list.value, ...(res.data?.data || [])]
      finished.value = (res.data?.data || []).length < pageSize
    } else if (tab.value === 'collect') {
      if (!userStore.isLogged) {
        toast.info('登录后查看 TA 的收藏')
        list.value = []
        finished.value = true
        return
      }
      res = await myCollects({ page: page.value, limit: pageSize, where: JSON.stringify({ login: uid.value }) })
      list.value = page.value === 1 ? (res.data?.data || []) : [...list.value, ...(res.data?.data || [])]
      finished.value = (res.data?.data || []).length < pageSize
    }
  } catch {
    list.value = page.value === 1 ? [] : list.value
  } finally {
    loading.value = false
  }
}

function loadMore() {
  if (loading.value || finished.value) return
  page.value += 1
  load()
}

onMounted(() => {
  loadProfile()
  loadFollowState()
  load()
})

watch(() => route.params.id, () => {
  loadProfile()
  loadFollowState()
  page.value = 1
  finished.value = false
  tab.value = 'article'
  load()
})
</script>

<style scoped>
.author-card {
  margin-bottom: 16px;
}
.author-head {
  display: flex;
  gap: 20px;
  align-items: flex-start;
}
.author-avatar {
  width: 96px;
  height: 96px;
  border-radius: 50%;
  object-fit: cover;
  border: 2px solid var(--border);
  flex-shrink: 0;
}
.author-meta {
  flex: 1;
  min-width: 0;
}
.author-name-row {
  display: flex;
  align-items: center;
  gap: 10px;
}
.author-name {
  font-size: 20px;
  font-weight: 700;
}
.author-level {
  font-size: 12px;
  padding: 2px 8px;
  border-radius: 4px;
  background: rgba(184, 153, 104, 0.14);
  color: var(--primary-deep);
}
.author-desc {
  font-size: 13px;
  color: var(--text-soft);
  margin: 8px 0 14px;
  line-height: 1.6;
}
.author-stats {
  display: flex;
  gap: 28px;
  margin-bottom: 14px;
}
.author-stats .stat {
  display: flex;
  flex-direction: column;
  cursor: pointer;
}
.author-stats .stat strong {
  font-size: 18px;
  font-weight: 700;
  color: var(--primary-deep);
}
.author-stats .stat span {
  font-size: 12px;
  color: var(--text-muted);
}
.author-actions {
  display: flex;
  gap: 10px;
}

.tab-bar {
  display: flex;
  gap: 8px;
  border-bottom: 1px solid var(--border-soft);
  margin-bottom: 8px;
}
.tab {
  padding: 10px 14px;
  font-size: 14px;
  background: transparent;
  border: none;
  border-bottom: 2px solid transparent;
  color: var(--text-soft);
  cursor: pointer;
  transition: all 0.15s;
}
.tab:hover {
  color: var(--primary);
}
.tab.active {
  color: var(--primary-deep);
  border-bottom-color: var(--primary);
  font-weight: 600;
}

.loading {
  padding: 40px;
  text-align: center;
  color: var(--text-muted);
}
.empty-row {
  text-align: center;
  padding: 32px 0;
}

.like-list {
  display: flex;
  flex-direction: column;
}
.like-item {
  border-bottom: 1px dashed var(--border-soft);
}
.like-item:last-child {
  border-bottom: none;
}
.like-link {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 4px;
  color: var(--text);
  font-size: 14px;
}
.like-link:hover .like-title {
  color: var(--primary);
}
.like-title {
  flex: 1;
  font-weight: 500;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.like-type {
  font-size: 11px;
  padding: 2px 8px;
  background: var(--bg-muted);
  color: var(--text-soft);
  border-radius: 3px;
}
.like-time {
  font-size: 11px;
  color: var(--text-muted);
}
</style>
