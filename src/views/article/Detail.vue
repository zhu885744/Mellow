<template>
  <div v-if="article" class="article-detail">
    <h1 class="title">
      <EmojiText :text="article.title" :size="24" />
    </h1>
    <div class="meta">
      <!-- 作者入口：小头像 + 昵称，点击进入作者主页（无 id 时退化为纯文本） -->
      <component
        :is="authorLink ? 'router-link' : 'span'"
        :to="authorLink || undefined"
        class="meta-author"
        :class="{ 'is-link': !!authorLink }"
      >
        <img :src="author?.avatar || defaultAvatar" class="meta-author__avatar" alt="" />
        <span class="meta-author__name">{{ author?.nickname || '匿名' }}</span>
      </component>
      <span class="dot">·</span>
      <span>{{ formatDate(article.create_time) }}</span>
      <span class="dot">·</span>
      <span>{{ article.views || 0 }} 次阅读</span>
      <template v-if="commentShow">
        <span class="dot">·</span>
        <span>{{ commentsCount }} 评论</span>
      </template>
    </div>

    <!-- 审核状态提示：只有作者本人 / 管理员能看到未审核文章，这里说明可见范围 -->
    <div v-if="auditTip" class="audit-banner" :class="auditTip.type">
      <i :class="auditTip.icon" aria-hidden="true" />
      <span>
        {{ auditTip.text }}
        <!-- 驳回原因：管理员审核未通过时填写 -->
        <template v-if="auditTip.reason">
          <br />驳回原因：{{ auditTip.reason }}
        </template>
      </span>
    </div>

    <div v-if="article.abstract" class="abstract">
      <EmojiText :text="article.abstract" :size="18" />
    </div>

    <!-- 当前可见范围：作者 / 管理员可直接查看时也把设置值显示出来，避免误以为设置没生效 -->
    <div v-if="scopeNotice" class="scope-notice">
      <i class="bi bi-eye" aria-hidden="true" />
      <span>{{ scopeNotice }}</span>
    </div>

    <!-- 可见范围：登录可见 / 付费可见时后端已清空正文，这里展示引导并支持积分兑换 -->
    <ContentLock
      v-if="articleLocked"
      :state="article.scope_state"
      :integral="Number(article.scope_integral) || 0"
      bind-type="article"
      :bind-id="article.id"
      @unlocked="load"
    />

    <article
      v-else
      ref="contentRef"
      :class="['content', isRichText ? 'rich-text' : 'markdown-body']"
      v-html="contentHtml"
      @click="onContentClick"
    />

    <div v-if="tagList.length" class="article-tags">
      <router-link
        v-for="t in tagList"
        :key="t.id"
        :to="`/topic/${t.id}`"
        class="tag tag-primary"
      >#{{ t.name }}</router-link>
    </div>

    <div class="article-actions">
      <button ref="likeBtn" class="btn btn-sm like-btn" @click="toggleLike">
        <i ref="likeIcon" class="bi" :class="liked ? 'bi-star-fill' : 'bi-star'" /> 点赞 <span v-if="likeCount">({{ likeCount }})</span>
      </button>
      <button class="btn btn-sm" @click="toggleCollect">
        <i ref="collectIcon" class="bi" :class="collected ? 'bi-bookmark-fill' : 'bi-bookmark'" /> {{ collected ? '已收藏' : '收藏' }}
        <span v-if="collectCount">({{ collectCount }})</span>
      </button>
      <button v-if="canReward" class="btn btn-sm like-btn" @click="openReward">
        <i class="bi bi-coin"></i>打赏
      </button>
      <button class="btn btn-sm like-btn" @click="shareArticle">
        <i class="bi bi-share" /> 分享
      </button>
      <!-- 举报：自己的文章不显示；提交后只通知管理员，作者不会收到提示 -->
      <button v-if="canReport" class="btn btn-sm like-btn" title="举报这篇文章" @click="reportVisible = true">
        <i class="bi bi-flag" /> 举报
      </button>
    </div>

    <ReportDialog
      :visible="reportVisible"
      target-type="article"
      :target-id="route.params.id"
      :target-label="`文章「${(article?.title || '').slice(0, 20)}」`"
      :loading="reporting"
      @update:visible="(v) => (reportVisible = v)"
      @confirm="submitReport"
    />

    <!-- 文末：上一篇 / 下一篇（按发布顺序切换，只统计已发布且审核通过的文章） -->
    <nav v-if="prevArticle || nextArticle" class="article-nav" aria-label="文章导航">
      <component
        :is="prevArticle ? 'router-link' : 'span'"
        :to="prevArticle ? `/archives/${prevArticle.id}` : undefined"
        class="article-nav__item article-nav__item--prev"
        :class="{ 'is-disabled': !prevArticle }"
      >
        <span class="article-nav__label">
          <i class="bi bi-arrow-left" aria-hidden="true" />
          上一篇
        </span>
        <span class="article-nav__title">{{ prevArticle?.title || '已经是第一篇了' }}</span>
      </component>

      <component
        :is="nextArticle ? 'router-link' : 'span'"
        :to="nextArticle ? `/archives/${nextArticle.id}` : undefined"
        class="article-nav__item article-nav__item--next"
        :class="{ 'is-disabled': !nextArticle }"
      >
        <span class="article-nav__label">
          下一篇
          <i class="bi bi-arrow-right" aria-hidden="true" />
        </span>
        <span class="article-nav__title">{{ nextArticle?.title || '已经是最后一篇了' }}</span>
      </component>
    </nav>

    <!-- 评论（json.comment.show：1 显示 / 2 不显示；allow：1 允许 / 2 禁止，禁止时仅隐藏输入框） -->
    <template v-if="commentShow">
      <SectionTitle title="评论">
        <template #extra>
          <span v-if="commentAllow" class="text-muted">{{ commentsCount }} 条评论</span>
          <span v-else class="text-muted">评论已关闭</span>
        </template>
      </SectionTitle>
      <CommentTree
        :bind-id="article.id"
        bind-type="article"
        :author-id="article.result?.author?.id"
        :allow-comment="commentAllow"
        :highlight-id="route.query.comment"
        @loaded="(n) => commentsCount = n"
      />
    </template>
  </div>

  <EmptyState v-else-if="!loading" text="文章不存在或已被删除" />
  <div v-else-if="loading" class="loading">
    <span class="spinner" /> 加载中...
  </div>

  <!-- 打赏弹窗：积分打赏（作者自己看自己的文章不显示入口） -->
  <RewardDialog
    v-model:visible="rewardVisible"
    bind-type="article"
    :bind-id="route.params.id"
    :to-uid="authorUid"
    :to-name="author?.nickname || ''"
  />
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import SectionTitle from '@/components/SectionTitle.vue'
import CommentTree from '@/components/CommentTree.vue'
import ReportDialog from '@/components/ReportDialog.vue'
import RewardDialog from '@/components/RewardDialog.vue'
import { createReport } from '@/api/report'
import EmptyState from '@/components/EmptyState.vue'
import EmojiText from '@/components/EmojiText.vue'
import ContentLock from '@/components/ContentLock.vue'
import { getArticle } from '@/api/article'
import {
  like, unlike, isLiked,
  collect, uncollect, isCollected
} from '@/api/tags'
import { useUserStore } from '@/stores/user'
import { useRouter } from 'vue-router'
import { formatDate } from '@/utils/time'
import { renderMarkdown } from '@/utils/markdown'
import { sanitizeHtml, isRichTextEditor } from '@/utils/html'
import { toast } from '@/utils/toast'
import { copyText } from '@/utils/helper'
import { openLightbox } from '@/utils/lightbox'
import { popIcon, popOut, burstHeart } from '@/utils/likeFx'

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()

const defaultAvatar =
  'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 80"><circle cx="40" cy="40" r="40" fill="%23e8e6dd"/></svg>'

const article = ref(null)
const loading = ref(false)
const liked = ref(false)
const collected = ref(false)
const likeCount = ref(0)
const collectCount = ref(0)
const commentsCount = ref(0)

// 评论开关：取自文章 json.comment（后端已按全局 ARTICLE 配置做继承）
// show: 1 显示 / 2 不显示（整块隐藏）    allow: 1 允许 / 2 禁止（仅隐藏输入发布模块，列表照常展示）
const commentAllow = computed(() => Number(article.value?.result?.comment?.allow ?? 1) !== 2)
const commentShow = computed(() => Number(article.value?.result?.comment?.show ?? 1) !== 2)

// 审核状态提示（草稿 / 待审核 / 未通过；普通访客拿不到这类文章，只有作者与管理员可见）
const auditTip = computed(() => {
  const item = article.value
  if (!item) return null
  if (Number(item.status) === 0) {
    return { type: 'is-draft', icon: 'bi bi-pencil-square', text: '草稿，仅自己可见' }
  }
  const audit = Number(item.audit)
  if (audit === 0) {
    return { type: 'is-audit', icon: 'bi bi-clock-history', text: '待审核，通过后其他访客才能看到' }
  }
  if (audit === 2) {
    return {
      type: 'is-reject',
      icon: 'bi bi-exclamation-triangle',
      text: '未通过审核，仅自己（与管理员）可见',
      reason: String(item.reason || '').trim()
    }
  }
  return null
})

// 打赏对象：文章作者（自己的文章不显示入口，后端同样会拒绝自打赏）
const rewardVisible = ref(false)
const authorUid = computed(() => Number(article.value?.uid || article.value?.result?.author?.id || 0))
const canReward = computed(() => authorUid.value > 0 && Number(userStore.user?.id) !== authorUid.value)

function openReward() {
  rewardVisible.value = true
}

const isRichText = computed(() => isRichTextEditor(article.value?.editor))

// 可见范围：scope_state 为 login / pay 时说明后端已按可见范围清空正文
const articleLocked = computed(() => {
  const state = article.value?.scope_state
  return state === 'login' || state === 'pay'
})

// 当前可见范围：**只给未登录访客看**。
// 登录用户要么直接能看（公开 / 作者 / 管理员 / 已兑换），要么 ContentLock 已经给出兑换引导，
// 再挂一条范围提示只会重复。
const scopeNotice = computed(() => {
  if (userStore.isLogged) return ''
  const scope = Number(article.value?.scope)
  if (scope === 2) return '当前可见范围：登录可见'
  if (scope === 3) {
    const integral = Number(article.value?.scope_integral) || 0
    return `当前可见范围：付费可见 · ${integral} 积分`
  }
  return ''
})

// 富文本：content 本身是 HTML，清洗后原样渲染；markdown（vditor 等）：走 markdown 渲染
const contentHtml = computed(() => {
  const content = article.value?.content || ''
  if (!content) return ''
  return isRichText.value ? sanitizeHtml(content) : renderMarkdown(content)
})
const contentRef = ref(null)
const likeBtn = ref(null)
const likeIcon = ref(null)

// 点击文章内容中的图片时打开灯箱（事件委托，兼容 v-html 渲染的图片）
function onContentClick(e) {
  const img = e.target.closest('img')
  if (!img || !img.src) return
  const srcs = Array.from(contentRef.value?.querySelectorAll('img') || [])
    .map((el) => el.src)
    .filter(Boolean)
  openLightbox(srcs, srcs.indexOf(img.src))
}

const author = computed(() => article.value?.result?.author || null)
// 作者主页链接（无 id 时标题区退化为不可点击的纯文本）
const authorLink = computed(() => {
  const id = author.value?.id
  return id ? `/author/${id}` : ''
})
// 上一篇 / 下一篇：后端在详情里按发布顺序给出相邻文章（只含已发布且审核通过的）
const prevArticle = computed(() => article.value?.prev || null)
const nextArticle = computed(() => article.value?.next || null)
const tagList = computed(() => {
  const t = article.value?.result?.tags
  if (Array.isArray(t)) return t
  return []
})

async function load() {
  loading.value = true
  try {
    const res = await getArticle(route.params.id)
    article.value = res.data

    // 评论数直接取详情返回里的 result.comment.count
    // （comment/count 不支持 bind_id/bind_type 过滤，会返回全站评论总数）
    commentsCount.value = res.data?.result?.comment?.count || 0
  } catch {
    article.value = null
  } finally {
    loading.value = false
  }

  // 点赞 / 收藏状态
  try {
    if (userStore.isLogged) {
      const [l, c] = await Promise.all([
        isLiked('article', route.params.id).catch(() => null),
        isCollected('article', route.params.id).catch(() => null)
      ])
      // is-liked 返回 { data: { is_liked, count } }
      liked.value = !!(l?.data?.is_liked ?? l?.data)
      collected.value = !!(c?.data?.is_collected ?? c?.data)
      // 已登录：优先用接口返回的精确计数，缺失时回退到文章详情自带计数
      likeCount.value = l?.data?.count ?? article.value?.result?.like?.length ?? article.value?.likes ?? 0
      collectCount.value = c?.data?.count ?? article.value?.result?.collect?.length ?? article.value?.favorites ?? 0
    } else {
      // 未登录：直接使用文章详情接口返回的计数（参考 archives.vue 做法，
      // 不调用 user-likes/counts、user-collects/counts 批量接口，避免 target_ids 报错）
      likeCount.value = article.value?.result?.like?.length ?? article.value?.likes ?? 0
      collectCount.value = article.value?.result?.collect?.length ?? article.value?.favorites ?? 0
    }
  } catch {}
}

function requireLogin() {
  if (!userStore.isLogged) {
    toast.warning('请先登录')
    router.push({ name: 'login', query: { redirect: route.fullPath } })
    return false
  }
  return true
}

async function toggleLike() {
  if (!requireLogin()) return
  if (liked.value) {
    // 取消点赞：图标收缩动画 + 乐观提示
    popOut(likeIcon.value)
    try {
      await unlike('article', route.params.id)
      liked.value = false
      likeCount.value = Math.max(0, likeCount.value - 1)
      toast.info('已取消点赞')
    } catch {}
  } else {
    // 点赞：立即弹跳 + 飘心
    popIcon(likeIcon.value)
    burstHeart(likeBtn.value)
    try {
      await like('article', route.params.id)
      liked.value = true
      likeCount.value += 1
      toast.success('点赞成功')
    } catch {}
  }
}

async function toggleCollect() {
  if (!requireLogin()) return
  try {
    if (collected.value) {
      await uncollect('article', route.params.id)
      collected.value = false
      collectCount.value = Math.max(0, collectCount.value - 1)
      toast.info('已取消收藏')
    } else {
      await collect('article', route.params.id)
      collected.value = true
      collectCount.value += 1
      toast.success('收藏成功')
    }
  } catch {}
}

// 分享：复制「文章标题 + 当前链接」
async function shareArticle() {
  if (!article.value) return
  const text = `【${article.value.title}】${window.location.href}`
  const ok = await copyText(text)
  if (ok) {
    toast.success('已复制链接和标题，去分享吧')
  } else {
    toast.error('复制失败，请手动复制')
  }
}

// ---------- 举报 ----------
// 未登录不显示入口；自己的文章也不显示（后端同样会拒「举报自己」）
const reportVisible = ref(false)
const reporting = ref(false)
const canReport = computed(() => {
  const me = userStore.user?.id
  if (!me) return false
  return String(article.value?.uid || '') !== String(me)
})

async function submitReport({ reason, detail, images }) {
  reporting.value = true
  try {
    await createReport({ target_type: 'article', target_id: route.params.id, reason, detail, images })
    reportVisible.value = false
    toast.success('举报已提交，我们会尽快处理')
  } catch {
    /* 拦截器已提示（重复举报 / 超过每日上限等） */
  } finally {
    reporting.value = false
  }
}

watch(() => route.params.id, load)
onMounted(() => {
  load()
})
onUnmounted(() => {
  document.body.style.overflow = ''
})
</script>

<style scoped>
.article-detail {
  padding: 8px 0;
}
.title {
  font-family: var(--font-serif);
  font-size: 26px;
  font-weight: 600;
  margin-bottom: 12px;
  line-height: 1.4;
}
.meta {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  color: var(--text-muted);
  margin-bottom: 16px;
}
.meta .dot {
  color: var(--border);
}
/* 作者入口：小头像 + 昵称 */
.meta-author {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
  color: inherit;
  text-decoration: none;
  transition: color 0.2s;
}
.meta-author.is-link {
  cursor: pointer;
}
.meta-author.is-link:hover {
  color: var(--primary);
}
.meta-author__avatar {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  object-fit: cover;
  flex-shrink: 0;
  background: var(--bg-muted);
}
.meta-author__name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 12em;
}
.abstract {
  padding: 16px 20px;
  background: var(--bg-muted);
  border-left: 3px solid var(--primary);
  font-size: 13px;
  color: var(--text-soft);
  border-radius: 0 var(--radius) var(--radius) 0;
  margin-bottom: 24px;
}
/* 当前可见范围提示（仅作者 / 管理员可直接查看时出现） */
.scope-notice {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 16px;
  padding: 6px 12px;
  font-size: 12px;
  line-height: 1.6;
  color: var(--primary-deep);
  background: var(--accent-soft);
  border-radius: var(--radius-sm);
}
/* 审核状态提示条（草稿 / 待审核 / 未通过） */
.audit-banner {
  display: flex;
  align-items: center;
  gap: 6px;
  margin: 0 0 16px;
  padding: 10px 14px;
  font-size: 13px;
  border: 1px dashed var(--border);
  border-radius: var(--radius);
}
.audit-banner.is-draft {
  background: var(--bg-muted);
  color: var(--text-muted);
}
.audit-banner.is-audit {
  background: var(--gold-wash);
  border-color: var(--gold-line);
  color: var(--warning);
}
.audit-banner.is-reject {
  background: var(--accent-soft);
  border-color: var(--primary-soft);
  color: var(--danger);
}
/* .content 基础排版由全局 .markdown-body 提供 */

.article-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin: 24px 0 16px;
}
.article-actions {
  display: flex;
  gap: 12px;
  justify-content: center;
  padding: 16px 0;
  border-top: 1px dashed var(--border);
  border-bottom: 1px dashed var(--border);
}
.like-btn {
  position: relative;
}
/* 文末：上一篇 / 下一篇 */
.article-nav {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  margin: 28px 0 8px;
}
.article-nav__item {
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 0;
  padding: 14px 16px;
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  color: inherit;
  text-decoration: none;
  -webkit-tap-highlight-color: transparent;
  transition: border-color 0.2s, background-color 0.2s, transform 0.2s;
}
.article-nav__item--next {
  text-align: right;
}
a.article-nav__item:hover {
  border-color: var(--primary-soft);
  background: var(--bg-muted);
  /* 覆盖全局 a:hover 的链接色，标题颜色单独控制 */
  color: var(--text);
}
a.article-nav__item:hover .article-nav__title {
  color: var(--primary);
}
a.article-nav__item:active {
  transform: translateY(1px);
}
/* 到头了：保留位置与占位文案，避免整块突然只剩一边 */
.article-nav__item.is-disabled {
  opacity: 0.55;
  cursor: default;
}
.article-nav__label {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  color: var(--text-light);
}
.article-nav__item--next .article-nav__label {
  justify-content: flex-end;
}
.article-nav__title {
  font-size: 14px;
  line-height: 1.5;
  color: var(--text);
  /* 最多两行：长标题不会把左右两块撑得高低不齐 */
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  transition: color 0.2s;
}
.loading {
  padding: 64px;
  text-align: center;
  color: var(--text-muted);
}

/* 窄屏：上一篇 / 下一篇改为上下堆叠，右对齐的那块也回归左对齐 */
@media (max-width: 640px) {
  .article-nav {
    grid-template-columns: 1fr;
    gap: 10px;
    margin: 22px 0 8px;
  }
  .article-nav__item--next {
    text-align: left;
  }
  .article-nav__item--next .article-nav__label {
    justify-content: flex-start;
  }
}

/* Markdown 排版样式统一使用全局 styles.css 中的 .markdown-body */
</style>