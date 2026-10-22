<template>
  <div class="author-page">
    <!-- 用户资料卡（手机端顶部横幅使用 users.json.cover，见下方 640px 适配） -->
    <div class="card card-pad author-card" :style="coverStyle">
      <div class="author-head">
        <AvatarFrame
          :src="profile.avatar"
          :frame="frame"
          :animated="frameRender.animated"
          :fallback="defaultAvatar"
          :size="'75px'"
          :frame-hole="frameRender.hole"
          :frame-offset-x="frameRender.offsetX"
          :frame-offset-y="frameRender.offsetY"
          alt="头像"
        />
        <div class="author-meta">
          <div class="author-name-row">
            <span class="author-name">{{ profile.nickname }}</span>
            <span v-if="level" class="author-level">Lv.{{ level }}</span>
            <!-- 有装扮样式用 TitleBadge 还原后台配色（文字色 / 背景 / 边框 / 发光 / 图标 / 动效） -->
            <TitleBadge
              v-if="profile.title || titlePayload"
              :payload="titlePayload || {}"
              :text="profile.title"
              size="md"
            />
            <span
              v-else-if="profile.title"
              :class="['author-title', titleClass]"
            >{{ profile.title }}</span>
            <!-- 佩戴中的勋章：users.json.wearing_badge，佩戴时后端已把名称/图标/配色/稀有度冗余写入 -->
            <WearingBadge v-if="profile.json?.wearing_badge" :badge="profile.json.wearing_badge" />
            <!-- 封禁标识（后端 users/one 的 result.ban）：申诉中 / 申诉驳回期间也保持显示 -->
            <span v-if="isBanned" class="author-ban-tag" :class="{ 'is-appeal': banStatus !== 0 }">
              <i class="bi" :class="banStatus === 0 ? 'bi-slash-circle' : 'bi-hourglass-split'" />
              {{ banStatusText }}
            </span>
          </div>
          <!-- 用户 ID：仅手机端展示（参考移动端个人主页的 ID 行） -->
          <div v-if="profile.id" class="author-id">ID {{ profile.id }}</div>
          <div class="author-desc">{{ profile.description || '这个人很懒，什么都没留下' }}</div>
          <!-- 勋章：只展示已获得的（公开接口 badge/held），未获得的属于「任务进度」，不在这里露出 -->
          <div v-if="badges.length" class="author-badges">
            <AchievementBadge
              v-for="item in badges"
              :key="item.id"
              :badge="item"
              size="sm"
              held
            />
          </div>
          <a
            v-if="website && website.url"
            class="author-website"
            :href="website.url"
            target="_blank"
            rel="noopener noreferrer"
          >
            <i class="bi bi-link-45deg" /> {{ website.name || website.url }}
          </a>
          <!-- 社交数据卡片：文章 / 动态 / 关注 / 粉丝 / 获赞
               数字来自后端 user-follows/stats（只统计对外公开的内容：audit=1 且 status=1），
               关注 / 粉丝随关注按钮实时增减，其余为只读展示（不做跳转） -->
          <div class="author-stats">
            <div class="stat" @click="switchTab('article')">
              <strong>{{ stats.article }}</strong>
              <span>文章</span>
            </div>
            <div class="stat is-static">
              <strong>{{ stats.moment }}</strong>
              <span>动态</span>
            </div>
            <div class="stat" @click="switchTab('follow')">
              <strong>{{ stats.follow }}</strong>
              <span>关注</span>
            </div>
            <div class="stat" @click="switchTab('fans')">
              <strong>{{ stats.fans }}</strong>
              <span>粉丝</span>
            </div>
            <div class="stat is-static">
              <strong>{{ stats.likes }}</strong>
              <span>获赞</span>
            </div>
          </div>
          <div class="author-actions">
            <!-- 四种按钮状态各用一套配色（后端 user-follows/relation）：
                 关注=主色 / 回关=警示色（提醒你回应）/ 互相关注=成功色 / 已关注=幽灵弱化 -->
            <button
              v-if="!isSelf"
              class="btn btn-sm"
              :class="followButtonClass"
              :title="followButtonTitle"
              :disabled="followBusy"
              @click="toggleFollow"
            >{{ followButtonText }}</button>
            <!-- 拉黑：双向屏蔽（彼此内容不进对方动态流 + 不能互相私信），拉黑时会自动解除关注关系 -->
            <button
              v-if="!isSelf"
              class="btn btn-sm"
              :class="blocked ? 'btn-ghost' : 'btn-outline-danger'"
              :title="
                blocked
                  ? '解除拉黑后，对方的内容会重新出现在你的动态流里'
                  : '拉黑后彼此的内容都不再出现在对方的动态流里，且不能互相私信'
              "
              :disabled="followBusy"
              @click="toggleBlock"
            >{{ blocked ? '已拉黑' : '拉黑' }}</button>
            <!-- 打赏：给这位用户送积分（自己的主页不显示，后端同样拒绝自打赏） -->
            <button
              v-if="!isSelf"
              class="btn btn-sm btn-ghost"
              title="用积分打赏 TA"
              @click="openReward"
            ><i class="bi bi-coin" aria-hidden="true" /> 打赏</button>
            <button
              v-if="!isSelf"
              class="btn btn-sm btn-ghost"
              title="举报该用户（仅管理员可见，对方不会收到通知）"
              @click="reportVisible = true"
            ><i class="bi bi-flag" aria-hidden="true" /> 举报</button>
            <template v-else>
              <router-link to="/user/profile" class="btn btn-sm btn-ghost">编辑资料</router-link>
              <button class="btn btn-sm btn-outline-danger" @click="userStore.logout">
                <i class="bi bi-box-arrow-right" /> 退出登录
              </button>
            </template>
          </div>
        </div>
      </div>

      <!-- 更换背景：仅本人可见，点进「我的资料 → 主页封面」上传图片或选颜色 -->
      <RouterLink v-if="isSelf" to="/user/profile" class="author-cover-edit">
        <i class="bi bi-image" aria-hidden="true" /> 更换背景
      </RouterLink>

      <!-- 封禁提示条：该账号处于封禁中，展示关键信息并提供详情 / 申诉入口 -->
      <div v-if="isBanned" class="author-ban-bar">
        <i class="bi bi-exclamation-octagon" />
        <div class="author-ban-bar__text">
          <strong>{{ banBarTitle }}</strong>
          <span>{{ banSummary }}</span>
        </div>
        <button type="button" class="btn btn-sm btn-outline-danger" @click="openBanDialog">
          查看详情<template v-if="isSelf"> / 申诉</template>
        </button>
      </div>
    </div>

    <!-- 可能认识的人：仅在自己的主页展示（基于「共同关注」的二度推荐，见后端 user-follows/suggest）。
         只展示聚合出来的「N 个共同关注」，不暴露任何具体的关注关系明细。 -->
    <div v-if="isSelf && suggestions.length" class="card card-pad suggest-card">
      <div class="suggest-head">
        <h3 class="suggest-title"><i class="bi bi-person-plus" aria-hidden="true" /> 可能认识的人</h3>
        <span class="suggest-tip">根据你们共同关注的人推荐</span>
      </div>
      <ul class="suggest-list">
        <li v-for="u in suggestions" :key="u.id" class="suggest-item">
          <router-link :to="`/author/${u.id}`" class="suggest-link">
            <img :src="u.avatar || defaultAvatar" class="suggest-avatar" alt="" @error="onImgError" loading="lazy" />
            <div class="suggest-info">
              <span class="suggest-name">{{ u.nickname || '匿名用户' }}</span>
              <span class="suggest-sub">
                <template v-if="u.mutual_count">{{ u.mutual_count }} 个共同关注</template>
                <template v-else>{{ u.description || '这个人很懒，什么都没留下' }}</template>
              </span>
            </div>
          </router-link>
          <button
            type="button"
            class="btn btn-sm"
            :class="u.following ? 'btn-ghost' : 'btn-primary'"
            :disabled="followBusy"
            @click="followSuggestion(u)"
          >{{ u.following ? '已关注' : '关注' }}</button>
        </li>
      </ul>
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

      <!-- 文章列表 -->
      <template v-else-if="tab === 'article'">
        <div v-if="!list.length" class="empty-row">
          <EmptyState :text="emptyText" />
        </div>
        <template v-else>
          <ArticleCard v-for="a in list" :key="a.id" :article="a" :abstract-limit="50" />
          <div v-if="!finished" class="load-more">
            <button class="btn btn-ghost btn-sm" :disabled="loading" @click="loadMore">
              {{ loading ? '加载中...' : '加载更多' }}
            </button>
          </div>
          <p v-else class="list-end">没有更多了</p>
        </template>
      </template>

      <!-- 粉丝 / 关注 列表（仅本人可见） -->
      <template v-else-if="tab === 'fans' || tab === 'follow'">
        <div v-if="!list.length" class="empty-row">
          <EmptyState :text="emptyText" />
        </div>
        <ul v-else class="user-list">
          <li v-for="item in list" :key="item.id" class="user-item">
            <router-link :to="`/author/${item.uid || item.user_id || item.id}`" class="user-link">
              <img :src="item.avatar || defaultAvatar" class="user-avatar" @error="onImgError" loading="lazy" />
              <div class="user-info">
                <span class="user-name">{{ item.nickname || item.name || '匿名用户' }}</span>
                <span class="user-sub">{{ item.description || '' }}</span>
              </div>
              <!-- 互关标识：后端 attachRelation 批量算好（未登录时不显示） -->
              <span v-if="item.mutual" class="user-mutual" title="你们互相关注">已互关</span>
              <span v-else-if="item.is_following" class="user-mutual is-following" title="你已关注 TA">已关注</span>
              <span class="user-time">{{ fromNow(item.create_time) }}</span>
            </router-link>
          </li>
        </ul>
      </template>

      <!-- 点赞 / 收藏 列表（本人与他人可见，含 文章/评论/动态 子分类） -->
      <template v-else>
        <div class="sub-tab-bar">
          <button
            v-for="st in currentSubTabs"
            :key="st.key"
            :class="['sub-tab', subTab === st.key && 'active']"
            @click="switchSubTab(st.key)"
          >{{ st.label }}</button>
        </div>
        <div v-if="!list.length" class="empty-row">
          <EmptyState :text="emptyText" />
        </div>
        <ul v-else class="like-list">
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

    <!-- 封禁信息弹窗：本人可提交申诉，查看他人主页时只展示信息 -->
    <BanAppealDialog ref="banDialogRef" :ban="banInfo" :appealable="isSelf" />

    <!-- 举报用户：提交后只通知管理员，被举报人不会收到任何提示 -->
    <ReportDialog
      :visible="reportVisible"
      target-type="user"
      :target-id="uid"
      :target-label="`用户「${profile.nickname || '匿名'}」`"
      :loading="reporting"
      @update:visible="(v) => (reportVisible = v)"
      @confirm="submitReport"
    />

    <!-- 打赏用户：bind_type=user 时 bind_id 就是接收者 uid -->
    <RewardDialog
      v-model:visible="rewardVisible"
      bind-type="user"
      :bind-id="uid"
      :to-uid="uid"
      :to-name="profile.nickname || ''"
    />
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import ArticleCard from '@/components/ArticleCard.vue'
import AvatarFrame from '@/components/AvatarFrame.vue'
import TitleBadge from '@/components/TitleBadge.vue'
import WearingBadge from '@/components/WearingBadge.vue'
import AchievementBadge from '@/components/AchievementBadge.vue'
import { getUserBadges } from '@/api/badge'
import BanAppealDialog from '@/components/BanAppealDialog.vue'
import ReportDialog from '@/components/ReportDialog.vue'
import RewardDialog from '@/components/RewardDialog.vue'
import { blockUser, unblockUser, blockStatus } from '@/api/user-blocks'
import { createReport } from '@/api/report'
import { getUser } from '@/api/users'
import { getAuthorArticles } from '@/api/article'
import { myLikes, myCollects } from '@/api/tags'
import { call } from '@/api/request'
import { useUserStore } from '@/stores/user'
import { fromNow, formatDate } from '@/utils/time'
import { banTypeText } from '@/utils/user'
import { pickUserTitlePayload } from '@/utils/helper'
import { resolveFrameRender } from '@/utils/frameRender'
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

// 个人网站（来自 json.website，用户在「个人资料」页设置）
const website = computed(() => (profile.value?.json && profile.value.json.website) || null)

// 头像框（来自 json.frame，佩戴头像框时由服务端回写；frame_animated 为动效开关）
const frame = computed(() => (profile.value?.json && profile.value.json.frame) || '')
// 头像框渲染参数：以装扮 payload 为准（users.json 上的副本只作兜底）
const frameRender = computed(() => resolveFrameRender(profile.value?.json))

// 主页封面（来自 json.cover）：用户在「我的资料」里二选一
//   { type: 'image', value: 'https://...' }  自定义图片
//   { type: 'color', value: '#c7482a' }      自定义颜色
// 兼容早期只存字符串（图片地址）的写法。
const cover = computed(() => {
  const raw = profile.value?.json && profile.value.json.cover
  if (!raw) return null
  if (typeof raw === 'string') return { type: 'image', value: raw }
  if (typeof raw === 'object' && raw.value) {
    return { type: raw.type === 'color' ? 'color' : 'image', value: raw.value }
  }
  return null
})

// 交给 CSS 变量 --author-cover：图片用 url()，纯色用「同色渐变」
// （background-image 不接受裸颜色值，必须包成渐变）。
// 未设置封面时不写该变量，由 CSS 里的主题色渐变兜底。
const coverStyle = computed(() => {
  const item = cover.value
  if (!item) return {}
  if (item.type === 'color') {
    return { '--author-cover': `linear-gradient(0deg, ${item.value}, ${item.value})` }
  }
  return { '--author-cover': `url("${item.value}")` }
})

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
// 头衔样式：装扮系统写入的 payload；无装扮时返回 null，走上面的色板兜底
const titlePayload = computed(() => pickUserTitlePayload(profile.value))
// 社交数据卡片：文章 / 动态 / 关注 / 粉丝 / 获赞（后端 user-follows/stats 一次拿全）
const stats = ref({ article: 0, moment: 0, follow: 0, fans: 0, likes: 0 })
// 我与目标用户的关系：is_following（我关注了 TA）/ is_follower（TA 关注了我）/ mutual（互关）
const relation = ref({ is_following: false, is_follower: false, mutual: false })
// 关注 / 取关进行中：防连点（后端有幂等处理，但前端不该重复发请求）
const followBusy = ref(false)
// 我是否已拉黑 TA（拉黑是双向屏蔽：彼此内容互不进流 + 不能互相私信）
const blocked = ref(false)
// 举报弹窗
const reportVisible = ref(false)
const reporting = ref(false)

// 打赏弹窗（接收者由后端按用户 uid 解析）
const rewardVisible = ref(false)

function openReward() {
  rewardVisible.value = true
}
// 可能认识的人：仅本人的主页展示
const suggestions = ref([])
const isSelf = computed(() => userStore.isLogged && Number(userStore.user?.id) === uid.value)

// 关注按钮文案：互相关注 > 已关注 > 回关（对方关注了我，我还没回）> 关注
const followButtonText = computed(() => {
  if (relation.value.mutual) return '互相关注'
  if (relation.value.is_following) return '已关注'
  if (relation.value.is_follower) return '回关'
  return '关注'
})

/**
 * 关注按钮配色：让「需要你回应」和「已互相关注」一眼能区分出来 ——
 *   回关      → 警示色（金色，提示有待处理的互动）
 *   互相关注  → 成功色（绿色，表示双向关系已建立）
 *   已关注    → 幽灵按钮（弱化，避免和主要操作抢视线）
 *   关注      → 主色（行动号召）
 * 颜色都取自全局变量（assets/styles.css 的 .btn-success / .btn-warning），不新造配色。
 */
const followButtonClass = computed(() => {
  if (relation.value.mutual) return 'btn-success'
  if (relation.value.is_following) return 'btn-ghost'
  if (relation.value.is_follower) return 'btn-warning'
  return 'btn-primary'
})

// 按钮悬浮说明写全，避免「已关注」这种短文案让人不知道该点会发生什么
const followButtonTitle = computed(() => {
  if (relation.value.mutual) return '你们互相关注，点击取消关注（互相关注关系会解除）'
  if (relation.value.is_following) return '你已关注 TA，点击取消关注'
  if (relation.value.is_follower) return 'TA 关注了你，点击回关（回关后你们互相关注）'
  return '关注 TA，TA 的动态会出现在你的关注流里'
})

// ---------- 封禁信息（后端 users/one 的 result.ban，见 model.Users.banInfo） ----------
const banInfo = ref(null)
const banDialogRef = ref(null)
// 自动弹窗对同一个主页只弹一次，避免切 Tab、重复加载时反复打扰
const banShown = ref(false)

const isBanned = computed(() => Boolean(banInfo.value?.is_banned))

// 封禁状态：0 封禁中 / 3 申诉中 / 5 申诉驳回 —— 申诉期间封禁继续生效，
// 所以标识要一直显示到真正解封为止（后端 BanStatusRestricted 口径）
const banStatus = computed(() => {
  const info = banInfo.value
  if (!info?.is_banned) return 0
  return Number(info.status ?? info.record?.status ?? 0) || 0
})

const banStatusText = computed(() => {
  if (banStatus.value === 3) return '申诉中'
  if (banStatus.value === 5) return '申诉驳回'
  return '封禁中'
})

const banBarTitle = computed(() => {
  if (banStatus.value === 3) return '该账号处于封禁中（申诉审核中）'
  if (banStatus.value === 5) return '该账号处于封禁中（申诉未通过）'
  return '该账号处于封禁中'
})

// 封禁摘要：限制范围 · 时长 · 原因 · 到期
const banSummary = computed(() => {
  const record = banInfo.value?.record
  if (!record) return '该账号已被限制使用'
  const days = Number(record.duration) || 0
  const parts = [banTypeText(record.ban_type), days === 0 ? '永久封禁' : `${days} 天`]
  if (record.reason) parts.push(`原因：${record.reason}`)
  if (Number(record.expires_at) > 0) parts.push(`到期：${formatDate(record.expires_at)}`)
  // 申诉中把申诉时间也带上，方便对照处理进度
  if (banStatus.value === 3 && Number(record.appeal_time) > 0) {
    parts.push(`申诉时间：${formatDate(record.appeal_time)}`)
  }
  return parts.join(' · ')
})

function openBanDialog() {
  banDialogRef.value?.show()
}

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
  subTab.value = 'all'
  page.value = 1
  finished.value = false
  denied.value = false
  load()
}

// 点赞子分类（点赞支持 文章/评论/动态），默认全部
const LIKE_TABS = [
  { key: 'all', label: '全部' },
  { key: 'article', label: '文章' },
  { key: 'comment', label: '评论' },
  { key: 'moment', label: '动态' }
]
// 收藏子分类（收藏不支持评论，仅 文章/动态），默认全部
const COLLECT_TABS = [
  { key: 'all', label: '全部' },
  { key: 'article', label: '文章' },
  { key: 'moment', label: '动态' }
]
const subTab = ref('all')
// 根据当前是点赞还是收藏，返回对应的子分类
const currentSubTabs = computed(() => (tab.value === 'collect' ? COLLECT_TABS : LIKE_TABS))

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

// 已获得的勋章（公开接口，用户主页只展示拿到的）
const badges = ref([])

async function loadBadges() {
  try {
    const res = await getUserBadges(uid.value)
    badges.value = Array.isArray(res.data) ? res.data : []
  } catch {
    badges.value = []
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

    // 封禁信息：被封禁时页面显示「封禁中」标识
    banInfo.value = u.result?.ban || null
    // 查看他人被封禁的主页 → 自动弹出封禁详情（只展示信息，不提供申诉）；
    // 自己被封禁时由全局弹窗（MainLayout 的 BanAppealDialog）负责提醒，这里不再重复弹
    if (isBanned.value && !isSelf.value && !banShown.value) {
      banShown.value = true
      await nextTick()
      banDialogRef.value?.show()
    }
    // 社交数据卡片（文章 / 动态 / 关注 / 粉丝 / 获赞）统一由后端 user-follows/stats 提供：
    // 口径只统计公开内容，且不会像原来那样「文章数用 countArticlesByAuthor、关注/粉丝用 counts」各算一份
    loadSocialStats()
    loadBadges()
  } catch {
    profile.value = { nickname: '用户不存在', avatar: '', description: '' }
  }
}

/**
 * 社交数据卡片（文章 / 动态 / 关注 / 粉丝 / 获赞）
 *
 * 后端 user-follows/stats 一次拿全，只统计**对外公开**的内容（audit=1 且 status=1）；
 * 获赞数需要跨表统计，后端缓存 5 分钟，关注 / 取关时会主动清掉缓存。
 */
async function loadSocialStats() {
  try {
    const res = await call('user-follows', 'stats', {
      method: 'GET',
      params: { uid: uid.value }
    })
    const d = res.data || {}
    stats.value = {
      article: Number(d.article) || 0,
      moment: Number(d.moment) || 0,
      follow: Number(d.follow) || 0,
      fans: Number(d.fans) || 0,
      likes: Number(d.likes) || 0
    }
  } catch {}
}

/**
 * 我与 TA 的关注关系（看自己主页 / 未登录时不需要）
 * 后端 user-follows/relation → 按钮显示「关注 / 已关注 / 互关 / 回关」
 */
async function loadRelation() {
  if (isSelf.value || !userStore.isLogged) {
    relation.value = { is_following: false, is_follower: false, mutual: false }
    return
  }
  try {
    const res = await call('user-follows', 'relation', {
      method: 'GET',
      params: { follow_uid: uid.value }
    })
    relation.value = {
      is_following: !!res.data?.is_following,
      is_follower: !!res.data?.is_follower,
      mutual: !!res.data?.mutual
    }
  } catch {}
}

/**
 * 关注 / 取关
 * 关注后：对方粉丝数 +1；若对方本来就关注我 → 直接变成「互关」
 */
async function toggleFollow() {
  if (!userStore.isLogged) {
    toast.info('请先登录')
    return
  }
  if (followBusy.value) return
  followBusy.value = true
  try {
    if (relation.value.is_following) {
      // 取消前先记下是不是互关：互相关注被取消要给出完整提示（不只是「已关注」四个字）
      const wasMutual = relation.value.mutual
      await call('user-follows', 'unfollow', { method: 'PUT', data: { follow_uid: uid.value } })
      relation.value.is_following = false
      relation.value.mutual = false
      stats.value.fans = Math.max(0, stats.value.fans - 1)
      toast.success(wasMutual ? '已取消关注，你们的互相关注关系已解除' : '已取消关注')
    } else {
      // 对方本来就关注我 → 这次是「回关」，提示要说清已经是互相关注
      const wasFollower = relation.value.is_follower
      await call('user-follows', 'follow', { method: 'POST', data: { follow_uid: uid.value } })
      relation.value.is_following = true
      relation.value.mutual = wasFollower
      stats.value.fans += 1
      toast.success(wasFollower ? '回关成功，你们现在是互相关注' : '关注成功，TA 的动态会出现在你的关注流里')
    }
  } catch {
    /* 拦截器已提示 */
  } finally {
    followBusy.value = false
  }
}

/**
 * 可能认识的人（仅本人主页展示）
 *
 * 后端 user-follows/suggest：基于「我关注的人也在关注谁」做二度推荐，
 * 已经关注过的不会出现在列表里；这里只维护「点击关注后」的按钮态与关注数。
 */
async function loadSuggestions() {
  if (!isSelf.value) {
    suggestions.value = []
    return
  }
  try {
    const res = await call('user-follows', 'suggest', { method: 'GET' })
    suggestions.value = (res.data?.list || []).map((u) => ({ ...u, following: false }))
  } catch {
    suggestions.value = []
  }
}

async function followSuggestion(user) {
  if (followBusy.value || user.following) return
  followBusy.value = true
  try {
    await call('user-follows', 'follow', { method: 'POST', data: { follow_uid: user.id } })
    user.following = true
    stats.value.follow += 1
    toast.success('已关注')
  } catch {
    /* 拦截器已提示 */
  } finally {
    followBusy.value = false
  }
}

/** 是否已拉黑 TA（看自己主页 / 未登录时不需要） */
async function loadBlockState() {
  if (isSelf.value || !userStore.isLogged) {
    blocked.value = false
    return
  }
  try {
    const res = await blockStatus(uid.value)
    blocked.value = !!res.data?.blocked
  } catch {
    blocked.value = false
  }
}

/**
 * 拉黑 / 解除拉黑
 *
 * 拉黑是**双向**屏蔽：彼此的内容都不再出现在对方的动态流里，且不能互相私信；
 * 后端同时会解除双方的关注关系，所以这里要刷新关系与数据卡片，避免界面显示「已关注」。
 */
async function toggleBlock() {
  if (!userStore.isLogged) {
    toast.info('请先登录')
    return
  }
  if (followBusy.value) return
  followBusy.value = true
  try {
    if (blocked.value) {
      await unblockUser(uid.value)
      blocked.value = false
      toast.success('已解除拉黑，对方的内容会重新出现在你的动态流里')
    } else {
      await blockUser(uid.value)
      blocked.value = true
      // 拉黑会解除双方的关注关系：本地先同步，避免按钮仍显示「已关注 / 互相关注」
      relation.value = {
        is_following: false,
        is_follower: relation.value.is_follower,
        mutual: false
      }
      toast.success('已拉黑，彼此的内容都不会再出现在对方的动态流里')
    }
    loadSocialStats()
    loadRelation()
  } catch {
    /* 拦截器已提示 */
  } finally {
    followBusy.value = false
  }
}

/** 举报该用户（只通知管理员，被举报人不会收到任何提示） */
async function submitReport({ reason, detail, images }) {
  reporting.value = true
  try {
    await createReport({ target_type: 'user', target_id: uid.value, reason, detail, images })
    reportVisible.value = false
    toast.success('举报已提交，我们会尽快处理')
  } catch {
    /* 拦截器已提示（重复举报 / 超过每日上限等） */
  } finally {
    reporting.value = false
  }
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
      create_time: it.create_time,
      // 互关标识：后端 attachRelation 针对当前这一页批量算好（未登录时全为 false）
      is_following: !!it.is_following,
      is_follower: !!it.is_follower,
      mutual: !!it.mutual
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
  loadRelation()
  loadBlockState()
  loadSuggestions()
  load()
})

watch(() => route.params.id, () => {
  // 切换用户主页：重置封禁状态，新主页若被封禁会重新自动弹窗
  banInfo.value = null
  banShown.value = false
  suggestions.value = []
  blocked.value = false
  loadProfile()
  loadRelation()
  loadBlockState()
  loadSuggestions()
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
/* 封面横幅（桌面 / 手机共用）：优先用 users.json.cover（组件里由 :style 写成 --author-cover），
   未设置时用主色渐变兜底；底部叠一层暗色，让压边的头像与文字更清楚。
   --author-card-pad 必须与各断点下卡片的内边距保持一致，横幅才能「满幅出血」铺满卡片顶部 */
.author-page > .author-card {
  --author-card-pad: 24px;
  --author-cover-h: 156px;
  position: relative;
  overflow: hidden;
  padding: 0 var(--author-card-pad) var(--author-card-pad);
}
.author-card::before {
  content: '';
  display: block;
  height: var(--author-cover-h);
  margin: 0 calc(-1 * var(--author-card-pad));
  background-color: var(--primary-deep);
  background-image:
    linear-gradient(180deg, rgba(0, 0, 0, 0) 46%, rgba(0, 0, 0, 0.26) 100%),
    var(--author-cover, linear-gradient(135deg, var(--primary) 0%, var(--primary-deep) 100%));
  background-size: cover, cover;
  background-position: center;
}
/* 头像上浮压住横幅下沿；描一圈卡片底色，任何封面上都清晰（头像框装饰不受影响） */
.author-head .avatar-frame {
  margin-top: -34px;
  background: var(--bg-card);
  border-radius: 50%;
  box-shadow: 0 0 0 3px var(--bg-card);
}
/* 「更换背景」：仅本人可见，贴在封面右下角（横幅高度随断点变，用变量算位置） */
.author-cover-edit {
  position: absolute;
  top: calc(var(--author-cover-h) - 36px);
  right: 10px;
  z-index: 1;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  height: 28px;
  padding: 0 10px;
  border: none;
  border-radius: 4px;
  background: rgba(0, 0, 0, 0.55);
  color: #fff;
  font-size: 12px;
  line-height: 1;
  text-decoration: none;
  cursor: pointer;
  backdrop-filter: blur(4px);
  transition: background-color 0.18s, color 0.18s;
}
.author-cover-edit:hover {
  background: rgba(0, 0, 0, 0.72);
  color: #fff;
}
.author-cover-edit .bi {
  font-size: 13px;
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
/* 用户 ID：默认不展示，仅手机端页面显示（见文件末尾的 640px 适配） */
.author-id {
  display: none;
}
.author-level {
  font-size: 12px;
  padding: 2px 8px;
  border-radius: 4px;
  background: var(--accent-soft);
  color: var(--primary-deep);
}
.author-title {
  font-size: 12px;
  padding: 2px 8px;
  border-radius: 4px;
  font-weight: 600;
  color: #fff;
}

/* ---------- 封禁标识与提示条 ---------- */
.author-ban-tag {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 8px;
  font-size: 12px;
  font-weight: 600;
  border-radius: 999px;
  color: var(--danger);
  background: rgba(199, 72, 42, 0.12);
}
/* 申诉中 / 申诉驳回：改用琥珀色，与「封禁中」区分开（但同样属于封禁状态） */
.author-ban-tag.is-appeal {
  color: var(--warning);
  background: var(--gold-wash);
}
.author-ban-bar {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-top: 16px;
  padding: 12px 14px;
  border-radius: var(--radius);
  background: rgba(199, 72, 42, 0.08);
  border: 1px solid rgba(199, 72, 42, 0.24);
}
.author-ban-bar > i {
  flex-shrink: 0;
  font-size: 18px;
  color: var(--danger);
}
.author-ban-bar__text {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.author-ban-bar__text strong {
  font-size: 14px;
  color: var(--danger);
}
.author-ban-bar__text span {
  font-size: 12px;
  line-height: 1.6;
  color: var(--text-muted);
  word-break: break-word;
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
/* 勋章行：只读展示，横向换行排列（手机上会自动折成两行） */
.author-badges {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin: 0 0 14px;
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
  gap: 18px;
  /* 五项（文章/动态/关注/粉丝/获赞）在窄屏要能换行，不能挤成一行 */
  flex-wrap: wrap;
  margin-bottom: 14px;
}
.author-stats .stat {
  display: flex;
  flex-direction: column;
  cursor: pointer;
}
/* 动态 / 获赞只是展示数字，不做跳转 → 不给手型光标，避免误导点击 */
.author-stats .stat.is-static {
  cursor: default;
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
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
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
/* 互关标识（后端 attachRelation 批量返回）：互关用主色，单向关注用弱化样式 */
.user-mutual {
  flex-shrink: 0;
  margin-right: 8px;
  padding: 1px 6px;
  font-size: 11px;
  border-radius: 999px;
  color: var(--primary-deep);
  background: var(--accent-soft);
  border: 1px solid var(--primary-soft);
}
.user-mutual.is-following {
  color: var(--text-muted);
  background: var(--bg-muted);
  border-color: var(--border-soft);
}

/* ========== 可能认识的人（仅本人主页） ========== */
.suggest-card {
  margin-bottom: 16px;
}
.suggest-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 6px;
}
.suggest-title {
  margin: 0;
  font-size: 15px;
  font-weight: 600;
}
.suggest-tip {
  font-size: 12px;
  color: var(--text-muted);
}
.suggest-list {
  list-style: none;
  margin: 0;
  padding: 0;
}
.suggest-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 2px;
  border-bottom: 1px dashed var(--border-soft);
}
.suggest-item:last-child {
  border-bottom: none;
}
.suggest-link {
  flex: 1;
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 10px;
  color: var(--text);
}
.suggest-link:hover .suggest-name {
  color: var(--primary);
}
.suggest-avatar {
  width: 38px;
  height: 38px;
  border-radius: 50%;
  object-fit: cover;
  border: 1px solid var(--border);
  flex-shrink: 0;
}
.suggest-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
}
.suggest-name {
  font-size: 14px;
  font-weight: 600;
}
.suggest-sub {
  font-size: 12px;
  color: var(--text-muted);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
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
  /* 卡片内边距收紧，与移动端容器留白保持一致
     （资料卡自己用 --author-card-pad 控制，避免把封面横幅顶出一条内边距空白） */
  .author-page > .card:not(.author-card) {
    padding: 16px;
  }
  .author-page > .author-card {
    --author-card-pad: 16px;
  }
}

/* ========== 手机端个人主页（参考移动端 UI：横幅 + 头像压边 + 内联数据 + 横向标签页）========== */
@media (max-width: 640px) {
  /* 资料卡：横幅与头像压边在基础样式里已生效，这里只按手机端尺寸调变量 */
  .author-page > .author-card {
    --author-card-pad: 14px;
    --author-cover-h: 112px;
    margin-bottom: 12px;
  }
  /* 信息换到头像下方（头像仍由基础样式的负 margin 压住横幅下沿） */
  .author-head {
    flex-wrap: wrap;
    align-items: flex-start;
    gap: 0 10px;
  }
  .author-meta {
    flex: 1 1 100%;
    min-width: 0;
  }
  .author-name-row {
    gap: 8px;
    margin-top: 10px;
  }
  .author-name {
    font-size: 19px;
  }
  /* ID 行：手机端才显示 */
  .author-id {
    display: block;
    margin-top: 4px;
    font-size: 12px;
    color: var(--text-muted);
    font-variant-numeric: tabular-nums;
  }
  .author-desc {
    margin: 6px 0 10px;
  }
  /* 数据行：数字 + 文案并排，用竖线分隔 */
  .author-stats {
    align-items: center;
    gap: 0;
    margin-bottom: 12px;
  }
  .author-stats .stat {
    flex-direction: row;
    align-items: baseline;
    gap: 4px;
  }
  .author-stats .stat + .stat {
    margin-left: 14px;
    padding-left: 14px;
    border-left: 1px solid var(--border-soft);
  }
  .author-stats .stat strong {
    font-size: 15px;
  }
  /* 操作按钮：等宽并排，方便拇指点击 */
  .author-actions {
    gap: 8px;
  }
  .author-actions .btn {
    flex: 1;
    min-width: 0;
  }
  /* 内容区与标签页：内边距收紧
     注意：必须排除资料卡（.author-card 同时也是 .card）—— 它自己用 padding-top: 0
     让封面横幅铺满卡片顶部，这里若一并命中，两条规则特异性相同会由书写顺序决定胜负，
     横幅顶部就会多出一条内边距空白。 */
  .author-page > .card:not(.author-card) {
    padding: 12px 14px 14px;
  }
  .tab-bar {
    gap: 4px;
    margin-bottom: 6px;
  }
  .tab {
    padding: 9px 12px;
    font-size: 13px;
  }
}
</style>
