<template>
  <div class="author-page">
    <!-- 用户资料卡 -->
    <div class="card card-pad author-card">
      <div class="author-head">
        <AvatarFrame
          :src="profile.avatar"
          :frame="frame"
          :fallback="defaultAvatar"
          :size="'75px'"
          :frame-scale="1.6"
          alt="头像"
        />
        <div class="author-meta">
          <div class="author-name-row">
            <span class="author-name">{{ profile.nickname }}</span>
            <span v-if="level" class="author-level">Lv.{{ level }}</span>
            <span
              v-if="profile.title"
              :class="['author-title', titleClass]"
            >{{ profile.title }}</span>
          </div>
          <div class="author-desc">{{ profile.description || '这个人很懒，什么都没留下' }}</div>
          <a
            v-if="website && website.url"
            class="author-website"
            :href="website.url"
            target="_blank"
            rel="noopener noreferrer"
          >
            <i class="bi bi-link-45deg" /> {{ website.name || website.url }}
          </a>
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
        <button :class="['tab', tab === 'fans' && 'active']" @click="switchTab('fans')">TA的粉丝</button>
        <button :class="['tab', tab === 'follow' && 'active']" @click="switchTab('follow')">TA的关注</button>
        <button :class="['tab', tab === 'like' && 'active']" @click="switchTab('like')">TA的点赞</button>
        <button :class="['tab', tab === 'collect' && 'active']" @click="switchTab('collect')">TA的收藏</button>
      </div>

      <div v-if="loading" class="loading"><span class="spinner" /> 加载中...</div>
      <div v-else-if="denied" class="empty-row">
        <EmptyState :text="deniedText" />
      </div>
      <div v-else-if="!list.length" class="empty-row">
        <EmptyState :text="emptyText" />
      </div>

      <!-- 文章列表 -->
      <template v-else-if="tab === 'article'">
        <ArticleCard v-for="a in list" :key="a.id" :article="a" :abstract-limit="50" />
        <div v-if="list.length && !finished" class="load-more">
          <button class="btn btn-ghost btn-sm" :disabled="loading" @click="loadMore">
            {{ loading ? '加载中...' : '加载更多' }}
          </button>
        </div>
        <p v-else-if="list.length && finished" class="list-end">没有更多了</p>
      </template>

      <!-- 粉丝 / 关注 列表（仅本人可见） -->
      <ul v-else-if="tab === 'fans' || tab === 'follow'" class="user-list">
        <li v-for="item in list" :key="item.id" class="user-item">
          <router-link :to="`/author/${item.uid || item.user_id || item.id}`" class="user-link">
            <img :src="item.avatar || defaultAvatar" class="user-avatar" @error="onImgError" />
            <div class="user-info">
              <span class="user-name">{{ item.nickname || item.name || '匿名用户' }}</span>
              <span class="user-sub">{{ item.description || '' }}</span>
            </div>
            <span class="user-time">{{ fromNow(item.create_time) }}</span>
          </router-link>
        </li>
      </ul>

      <!-- 点赞 / 收藏 列表（本人与他人可见，含 文章/评论/动态 子分类） -->
      <template v-else>
        <div class="sub-tab-bar">
          <button
            v-for="st in LIKE_TABS"
            :key="st.key"
            :class="['sub-tab', subTab === st.key && 'active']"
            @click="switchSubTab(st.key)"
          >{{ st.label }}</button>
        </div>
        <ul class="like-list">
          <li v-for="(i, k) in list" :key="i.id || k" class="like-item" @click="goDetail(i)">
            <div class="like-main">
              <span class="like-badge" :class="badgeClass(i.target_type)">{{ typeLabel(i.target_type) }}</span>
              <span class="like-title" v-html="detailTitleHtml(i)" />
            </div>
            <span class="like-time">{{ fromNow(i.create_time) }}</span>
          </li>
        </ul>
      </template>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import ArticleCard from '@/components/ArticleCard.vue'
import AvatarFrame from '@/components/AvatarFrame.vue'
import { getUser } from '@/api/users'
import { getAuthorArticles, countArticlesByAuthor } from '@/api/article'
import { myLikes, myCollects } from '@/api/tags'
import { call } from '@/api/request'
import { useUserStore } from '@/stores/user'
import { fromNow } from '@/utils/time'
import { toast } from '@/utils/toast'
import { renderEmoji } from '@/utils/emoji'
import EmptyState from '@/components/EmptyState.vue'

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()
const uid = computed(() => Number(route.params.id))

const defaultAvatar = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 80"><circle cx="40" cy="40" r="40" fill="%23e8e6dd"/><text x="50%25" y="55%25" text-anchor="middle" font-size="36" fill="%238a8a82" font-family="serif">用</text></svg>'

const profile = ref({})
const level = ref(0)

// 个人网站（来自 json.website，用户在 Contact 页设置）
const website = computed(() => (profile.value?.json && profile.value.json.website) || null)

// 头像框（来自 json.frame，用户在 Profile 页设置）
const frame = computed(() => (profile.value?.json && profile.value.json.frame) || '')

// 头衔（与 Profile 页一致的颜色映射）
const PRESET_TITLES = ['掌门', '长老', '护法', '内门弟子', '外门弟子', '炼气修士', '筑基修士', '结丹修士', '元婴老祖', '化神大能']
const titleColorMap = {
  '掌门': 'title-zhangmen',
  '长老': 'title-zhanglao',
  '护法': 'title-hufa',
  '内门弟子': 'title-neimen',
  '外门弟子': 'title-waimen',
  '炼气修士': 'title-lianqi',
  '筑基修士': 'title-zhuji',
  '结丹修士': 'title-jiedan',
  '元婴老祖': 'title-yuanying',
  '化神大能': 'title-huashen',
  '侠客': 'title-xiake',
  '学徒': 'title-xuetu'
}
function getTitleColorClass(title) {
  return titleColorMap[title] || 'title-default'
}
const titleClass = computed(() => getTitleColorClass(profile.value.title))
const stats = ref({ article: 0, follow: 0, fans: 0 })
const following = ref(false)
const isSelf = computed(() => userStore.isLogged && Number(userStore.user?.id) === uid.value)

const tab = ref('article')
const list = ref([])
const loading = ref(false)
const denied = ref(false)
const page = ref(1)
const pageSize = 10
const finished = ref(false)

const emptyText = computed(() => {
  if (tab.value === 'article') return 'TA还没有发布文章'
  if (tab.value === 'fans') return 'TA还没有粉丝'
  if (tab.value === 'follow') return 'TA还没有关注任何人'
  if (tab.value === 'like') return 'TA还没有点赞内容'
  return 'TA还没有收藏内容'
})

const deniedText = ref('仅本人可见')

function onImgError(e) {
  e.target.src = defaultAvatar
}

function switchTab(t) {
  if (tab.value === t) return
  tab.value = t
  if (t !== 'like' && t !== 'collect') subTab.value = 'all'
  page.value = 1
  finished.value = false
  denied.value = false
  load()
}

// 点赞/收藏子分类（全部 / 文章 / 评论 / 动态），默认全部
const LIKE_TABS = [
  { key: 'all', label: '全部' },
  { key: 'article', label: '文章' },
  { key: 'comment', label: '评论' },
  { key: 'moment', label: '动态' }
]
const subTab = ref('all')

function switchSubTab(t) {
  if (subTab.value === t) return
  subTab.value = t
  page.value = 1
  finished.value = false
  load()
}

function typeLabel(t) {
  if (t === 'article') return '文章'
  if (t === 'comment') return '评论'
  if (t === 'moments' || t === 'moment') return '动态'
  if (t === 'page') return '页面'
  if (t === 'users' || t === 'user') return '用户'
  return '内容'
}

function badgeClass(t) {
  if (t === 'article') return 'badge-article'
  if (t === 'comment') return 'badge-comment'
  if (t === 'moment' || t === 'moments') return 'badge-moment'
  return 'badge-other'
}

// 详情标题：优先 _detail（enrich 后），再回退 result.author.nickname（user 类型）
function detailTitle(i) {
  const d = i._detail
  if (d) {
    if (d.title) return d.title
    // 动态/评论取完整 content（不截断），避免切断 [emoji:url] 表情标记，
    // 显示截断交由 CSS 单行省略处理
    if (d.content) return d.content
  }
  if (i.target_type === 'user' && i.result?.author?.nickname) {
    return i.result.author.nickname
  }
  return '内容'
}

// 标题 HTML（含 [emoji:url] 表情渲染）
function detailTitleHtml(i) {
  return renderEmoji(detailTitle(i), { size: 18 })
}

// 点击跳转（参考 Cardify-inis goToLikedContent）
function goDetail(i) {
  const type = i.target_type
  const id = i.target_id || i.id
  if (type === 'comment') {
    const bind = i._detail?.bind_type || i.bind_type || i.result?.bind_type
    const bid = i._detail?.bind_id || i.bind_id || i.result?.bind_id
    if (bind === 'article' && bid) return router.push(`/archives/${bid}`)
    if ((bind === 'moment' || bind === 'moments') && bid) return router.push(`/moments/${bid}`)
    if (bind === 'page' && bid) return router.push(`/page/${bid}`)
    return
  }
  if (type === 'moment' || type === 'moments') return router.push(`/moments/${id}`)
  if (type === 'page') return router.push(`/page/${id}`)
  return router.push(`/archives/${id}`)
}

// 点赞/收藏列表：按 target_type 批量补充被操作对象详情（参考 Cardify-inis fetchBatchDetails）
const endpointMap = {
  article: { ctrl: 'article', field: 'id,title,abstract,content,views,create_time' },
  comment: { ctrl: 'comment', field: 'id,content,bind_id,bind_type,uid,create_time' },
  moment: { ctrl: 'moments', field: 'id,content,images,location,uid,create_time' },
  page: { ctrl: 'article', field: 'id,title,content,views,create_time' }
}

async function enrichTargets(items) {
  const grouped = {}
  for (const it of items) {
    const type = it.target_type
    const id = it.target_id
    if (!type || !id) continue
    ;(grouped[type] = grouped[type] || []).push(id)
  }
  const detailMaps = {}
  await Promise.all(
    Object.entries(grouped).map(async ([type, ids]) => {
      const meta = endpointMap[type]
      if (!meta) return
      const uniq = [...new Set(ids.map(Number).filter(Boolean))]
      try {
        const res = await call(meta.ctrl, 'all', {
          method: 'GET',
          params: {
            where: JSON.stringify({ id: { $in: uniq } }),
            limit: uniq.length,
            field: meta.field
          }
        })
        const rows = res.data?.data || res.data?.list || []
        const m = new Map()
        for (const r of rows) if (r && r.id !== undefined) m.set(String(r.id), r)
        detailMaps[type] = m
      } catch {
        // 单组失败不影响整体
      }
    })
  )
  for (const it of items) {
    const m = detailMaps[it.target_type]
    if (m && m.has(String(it.target_id))) {
      it._detail = m.get(String(it.target_id))
    }
  }
}

async function loadProfile() {
  try {
    const res = await getUser(uid.value)
    const u = res.data || {}
    profile.value = {
      nickname: u.nickname || '匿名用户',
      avatar: u.avatar || '',
      description: u.description || u.remarks || '',
      title: u.title || '',
      json: u.json || {}
    }
    // 等级：兼容 result.level.current 与 users_rating.grade 两种结构
    const lv = u.result?.level?.current || u.users_rating?.users_grade
    level.value = lv?.value || u.users_rating?.grade || u.grade || 0
    stats.value = {
      article: u.article_total || 0,
      follow: 0,
      fans: 0
    }
    // 文章数单独统计（用户对象未直接提供或不可靠）
    try {
      const c = await countArticlesByAuthor(uid.value)
      stats.value.article = c.data || 0
    } catch {}
    // 关注 / 粉丝数走 user-follows/counts 接口（参考 Cardify-inis）
    loadFollowCounts()
  } catch {
    profile.value = { nickname: '用户不存在', avatar: '', description: '' }
  }
}

async function loadFollowCounts() {
  try {
    const [followingRes, followersRes] = await Promise.all([
      call('user-follows', 'counts', {
        method: 'GET',
        params: { target_type: 'following', target_ids: [uid.value] }
      }),
      call('user-follows', 'counts', {
        method: 'GET',
        params: { target_type: 'followers', target_ids: [uid.value] }
      })
    ])
    if (followingRes.data?.counts) {
      stats.value.follow = followingRes.data.counts[uid.value] || 0
    }
    if (followersRes.data?.counts) {
      stats.value.fans = followersRes.data.counts[uid.value] || 0
    }
  } catch {}
}

async function loadFollowState() {
  if (isSelf.value) return
  try {
    const res = await call('user-follows', 'is-following', {
      method: 'GET',
      params: { follow_uid: uid.value }
    })
    following.value = !!(res.data && res.data.is_following)
  } catch {}
}

async function toggleFollow() {
  if (!userStore.isLogged) {
    toast.info('请先登录')
    return
  }
  try {
    if (following.value) {
      await call('user-follows', 'unfollow', { method: 'PUT', data: { follow_uid: uid.value } })
      following.value = false
      stats.value.fans = Math.max(0, stats.value.fans - 1)
    } else {
      await call('user-follows', 'follow', { method: 'POST', data: { follow_uid: uid.value } })
      following.value = true
      stats.value.fans += 1
    }
  } catch {}
}

// 获取目标用户的隐私设置（默认全部公开）
function getTargetPrivacy() {
  const p = profile.value?.json?.privacy
  return {
    follows: p?.follows || 'all',
    collects: p?.collects === 1 ? 1 : 0,
    likes: p?.likes === 1 ? 1 : 0
  }
}

// 粉丝 / 关注列表：受目标用户隐私设置控制（参考 Cardify-inis）
async function loadFollowList(kind) {
  if (!isSelf.value) {
    // 非本人：依据隐私设置判断是否可见
    const privacy = getTargetPrivacy()
    // 关注列表受 following 限制；粉丝列表受 followers 限制
    const visible = kind === 'follow'
      ? (privacy.follows === 'all' || privacy.follows === 'following')
      : (privacy.follows === 'all' || privacy.follows === 'followers')
    if (!visible) {
      denied.value = true
      deniedText.value = '对方设置了私密，无法查看'
      list.value = []
      finished.value = true
      return
    }
  }
  const res = await call('user-follows', kind === 'fans' ? 'followers' : 'following', {
    method: 'GET',
    params: { uid: uid.value, page: page.value, limit: pageSize }
  })
  // 后端私密拦截时返回 private:true
  if (res.data?.private) {
    denied.value = true
    deniedText.value = '对方设置了私密，无法查看'
    list.value = []
    finished.value = true
    return
  }
  // 参考 Cardify-inis：行含 result.follower（粉丝）/ result.followee（关注）
  const data = res.data?.list || res.data?.data || []
  const items = data.map((it) => {
    const o = kind === 'fans' ? it.result?.follower : it.result?.followee
    // 对方用户 id：粉丝列表用 item.uid，关注列表用 item.follow_uid（参考 Cardify-inis goToUser）
    const targetUid = kind === 'fans' ? (it.uid || o?.uid) : (it.follow_uid || o?.uid)
    return {
      id: it.id,
      uid: targetUid || o?.user_id || it.user_id,
      nickname: o?.nickname,
      avatar: o?.avatar,
      description: o?.description || o?.remarks,
      create_time: it.create_time
    }
  })
  list.value = page.value === 1 ? items : [...list.value, ...items]
  finished.value = items.length < pageSize
}

async function load() {
  loading.value = true
  denied.value = false
  try {
    let res
    if (tab.value === 'article') {
      res = await getAuthorArticles(uid.value, { page: page.value, limit: pageSize })
      list.value = page.value === 1 ? (res.data?.data || []) : [...list.value, ...(res.data?.data || [])]
      finished.value = (res.data?.data || []).length < pageSize
    } else if (tab.value === 'fans' || tab.value === 'follow') {
      await loadFollowList(tab.value)
    } else if (tab.value === 'like') {
      if (!isSelf.value) {
        // 非本人：依据隐私设置判断是否可见
        const privacy = getTargetPrivacy()
        if (privacy.likes !== 1) {
          denied.value = true
          deniedText.value = '对方设置了私密，无法查看'
          list.value = []
          finished.value = true
          return
        }
        const likeParams = { page: page.value, limit: pageSize, uid: uid.value }
        if (subTab.value !== 'all') likeParams.target_type = subTab.value
        res = await myLikes(likeParams)
        if (res?.data?.private) {
          denied.value = true
          deniedText.value = '对方设置了私密，无法查看'
          list.value = []
          finished.value = true
          return
        }
        const items = res.data?.list || res.data?.data || []
        await enrichTargets(items)
        list.value = page.value === 1 ? items : [...list.value, ...items]
        finished.value = items.length < pageSize
        return
      }
      // 按子分类传 target_type（article/comment/moment），参考 Cardify-inis
      // 默认"全部"不传 target_type，查回所有类型；选具体分类再按 target_type 过滤
      const likeParams = { page: page.value, limit: pageSize }
      if (subTab.value !== 'all') likeParams.target_type = subTab.value
      res = await myLikes(likeParams)
      const items = res.data?.list || res.data?.data || []
      await enrichTargets(items)
      list.value = page.value === 1 ? items : [...list.value, ...items]
      finished.value = items.length < pageSize
    } else if (tab.value === 'collect') {
      if (!isSelf.value) {
        // 非本人：依据隐私设置判断是否可见
        const privacy = getTargetPrivacy()
        if (privacy.collects !== 1) {
          denied.value = true
          deniedText.value = '对方设置了私密，无法查看'
          list.value = []
          finished.value = true
          return
        }
        const collectParams = { page: page.value, limit: pageSize, uid: uid.value }
        if (subTab.value !== 'all') collectParams.target_type = subTab.value
        res = await myCollects(collectParams)
        if (res?.data?.private) {
          denied.value = true
          deniedText.value = '对方设置了私密，无法查看'
          list.value = []
          finished.value = true
          return
        }
        const items = res.data?.list || res.data?.data || []
        await enrichTargets(items)
        list.value = page.value === 1 ? items : [...list.value, ...items]
        finished.value = items.length < pageSize
        return
      }
      const collectParams = { page: page.value, limit: pageSize }
      if (subTab.value !== 'all') collectParams.target_type = subTab.value
      res = await myCollects(collectParams)
      const items = res.data?.list || res.data?.data || []
      await enrichTargets(items)
      list.value = page.value === 1 ? items : [...list.value, ...items]
      finished.value = items.length < pageSize
    }
  } catch (e) {
    // 接口返回了错误信息（如「请先登录！」）时，显示接口返回的提示，而非空状态文案
    if (e?.msg) {
      denied.value = true
      deniedText.value = e.msg
      list.value = []
      finished.value = true
    } else {
      list.value = page.value === 1 ? [] : list.value
    }
  } finally {
    loading.value = false
  }
}

// 文章列表加载更多（翻页）
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
  denied.value = false
  tab.value = 'article'
  subTab.value = 'all'
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
.author-meta {
  flex: 1;
  min-width: 0;
}
.author-name-row {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
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
.author-title {
  font-size: 12px;
  padding: 2px 8px;
  border-radius: 4px;
  font-weight: 600;
  color: #fff;
}
/* 头衔配色（与 Profile 页 10 个头衔一致） */
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
.title-xiake { background: linear-gradient(135deg, #4a9e6f, #2f7d52); }
.title-xuetu { background: linear-gradient(135deg, #9aa0a6, #6c757d); }
.title-default { background: #6c757d; }
.author-desc {
  font-size: 13px;
  color: var(--text-soft);
  margin: 8px 0 14px;
  line-height: 1.6;
  overflow-wrap: break-word;
}
.author-website {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 13px;
  color: var(--primary-deep);
  text-decoration: none;
  margin-bottom: 14px;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.author-website:hover {
  text-decoration: underline;
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
  flex-wrap: wrap;
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

.sub-tab-bar {
  display: flex;
  gap: 6px;
  margin-bottom: 8px;
  flex-wrap: wrap;
}
.sub-tab {
  padding: 6px 14px;
  font-size: 13px;
  border: 1px solid var(--border-soft);
  border-radius: 999px;
  background: transparent;
  color: var(--text-soft);
  cursor: pointer;
  transition: all 0.15s;
}
.sub-tab:hover {
  color: var(--primary);
  border-color: var(--primary);
}
.sub-tab.active {
  background: var(--primary);
  border-color: var(--primary);
  color: #fff;
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

.like-list,
.user-list {
  display: flex;
  flex-direction: column;
}
.like-item,
.user-item {
  border-bottom: 1px dashed var(--border-soft);
}
.like-item:last-child,
.user-item:last-child {
  border-bottom: none;
}
.like-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 4px;
  cursor: pointer;
}
.like-item:hover .like-title {
  color: var(--primary);
}
.like-main {
  flex: 1;
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 10px;
}
.like-title {
  flex: 1;
  font-weight: 500;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 14px;
}
.like-badge {
  flex-shrink: 0;
  font-size: 11px;
  padding: 2px 8px;
  border-radius: 3px;
  color: #fff;
}
.badge-article {
  background: var(--primary);
}
.load-more {
  display: flex;
  justify-content: center;
  margin-top: 16px;
}
.list-end {
  text-align: center;
  margin-top: 16px;
  font-size: 12px;
  color: var(--text-muted);
}
.badge-comment {
  background: #5b9bd5;
}
.badge-moment {
  background: #6aa84f;
}
.badge-other {
  background: var(--text-muted);
}
.like-time {
  flex-shrink: 0;
  font-size: 11px;
  color: var(--text-muted);
}

.user-link {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 4px;
  color: var(--text);
}
.user-link:hover .user-name {
  color: var(--primary);
}
.user-avatar {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  object-fit: cover;
  border: 1px solid var(--border);
  flex-shrink: 0;
}
.user-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
}
.user-name {
  font-size: 14px;
  font-weight: 600;
}
.user-sub {
  font-size: 12px;
  color: var(--text-muted);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.user-time {
  font-size: 11px;
  color: var(--text-muted);
}

/* ========== 移动端适配 ========== */
@media (max-width: 768px) {
  /* 顶部 tab 栏改为横向滚动，避免 5 个 tab 在手机上换行堆叠 */
  .tab-bar {
    flex-wrap: nowrap;
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
    scrollbar-width: none;
  }
  .tab-bar::-webkit-scrollbar {
    display: none;
  }
  .tab {
    flex-shrink: 0;
    white-space: nowrap;
  }
  /* 头像区更紧凑 */
  .author-head {
    gap: 14px;
  }
  .author-name {
    font-size: 18px;
  }
  .author-stats {
    gap: 22px;
  }
  /* 卡片内边距收紧，与移动端容器留白保持一致 */
  .author-page > .card {
    padding: 16px;
  }
}
</style>
