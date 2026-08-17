<template>
  <div v-if="article" class="article-detail">
    <h1 class="title">{{ article.title }}</h1>
    <div class="meta">
      <span>{{ formatDate(article.create_time) }}</span>
      <span class="dot">·</span>
      <span>{{ article.views || 0 }} 次阅读</span>
      <span class="dot">·</span>
      <span>{{ commentsCount }} 评论</span>
    </div>

    <div v-if="article.abstract" class="abstract">{{ article.abstract }}</div>

    <article
      ref="contentRef"
      class="content markdown-body"
      v-html="contentHtml"
      @click="onContentClick"
    />

    <div v-if="tagList.length" class="article-tags">
      <router-link
        v-for="t in tagList"
        :key="t.id"
        :to="`/tag/${t.id}`"
        class="tag tag-primary"
      >#{{ t.name }}</router-link>
    </div>

    <div class="article-actions">
      <button class="btn btn-sm" @click="toggleLike">
        <i class="bi" :class="liked ? 'bi-star-fill' : 'bi-star'" /> 点赞 <span v-if="likeCount">({{ likeCount }})</span>
      </button>
      <button class="btn btn-sm" @click="toggleCollect">
        {{ collected ? '收藏' : '收藏' }}
        <span v-if="collectCount">({{ collectCount }})</span>
      </button>
      <button v-if="rewardEnabled" class="btn btn-sm" @click="openReward">
        打赏
      </button>
    </div>

    <!-- 作者 -->
    <div v-if="author" class="author-card card card-pad">
      <img :src="author.avatar || defaultAvatar" class="author-avatar" />
      <div class="author-info">
        <div class="author-name">{{ author.nickname }}</div>
        <div class="author-desc">{{ author.description || '' }}</div>
      </div>
    </div>

    <!-- 评论 -->
    <SectionTitle title="评论">
      <template #extra>
        <span class="text-muted">{{ commentsCount }} 条评论</span>
      </template>
    </SectionTitle>
    <CommentTree
      :bind-id="article.id"
      bind-type="article"
      :author-id="article.result?.author?.id"
      @loaded="(n) => commentsCount = n"
    />
  </div>

  <EmptyState v-else-if="!loading" text="文章不存在或已被删除" />
  <div v-else-if="loading" class="loading">
    <span class="spinner" /> 加载中...
  </div>

  <!-- 打赏弹窗 -->
  <Teleport to="body">
    <Transition name="reward-fade">
      <div v-if="rewardVisible" class="reward-overlay" @click.self="closeReward">
        <div class="reward-dialog">
          <div class="reward-header">
            <span class="reward-title">感谢支持</span>
            <button class="close-btn" @click="closeReward"><i class="bi bi-x-lg" /></button>
          </div>
          <div v-if="rewardTabs.length > 1" class="reward-tabs">
            <button
              v-for="t in rewardTabs"
              :key="t.key"
              :class="['reward-tab', { active: rewardTab === t.key }]"
              @click="rewardTab = t.key"
            >{{ t.label }}</button>
          </div>
          <div class="reward-body">
            <p class="reward-tip">如果这篇文章对你有帮助，欢迎打赏支持作者～</p>
            <div class="reward-qr">
              <img
                v-if="rewardTab === 'wechat' && reward.wechat"
                :src="reward.wechat"
                alt="微信收款码"
              />
              <img
                v-else-if="rewardTab === 'alipay' && reward.alipay"
                :src="reward.alipay"
                alt="支付宝收款码"
              />
            </div>
            <div class="qr-label">
              {{ rewardTab === 'wechat' ? '微信扫码支持' : '支付宝扫码支持' }}
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import SectionTitle from '@/components/SectionTitle.vue'
import CommentTree from '@/components/CommentTree.vue'
import EmptyState from '@/components/EmptyState.vue'
import { getArticle } from '@/api/article'
import { getConfig } from '@/api/config'
import {
  like, unlike, isLiked,
  collect, uncollect, isCollected
} from '@/api/tags'
import { useUserStore } from '@/stores/user'
import { useRouter } from 'vue-router'
import { formatDate } from '@/utils/time'
import { renderMarkdown } from '@/utils/markdown'
import { toast } from '@/utils/toast'
import { openLightbox } from '@/utils/lightbox'

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()

const defaultAvatar = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 80"><circle cx="40" cy="40" r="40" fill="%23e8e6dd"/></svg>'

const article = ref(null)
const loading = ref(false)
const liked = ref(false)
const collected = ref(false)
const likeCount = ref(0)
const collectCount = ref(0)
const commentsCount = ref(0)

// 打赏配置（来自 Mellow_functions）
const reward = ref({ enabled: false, wechat: '', alipay: '' })
const rewardVisible = ref(false)
const rewardTab = ref('wechat')

const rewardEnabled = computed(() =>
  reward.value.enabled && (reward.value.wechat || reward.value.alipay)
)
const rewardTabs = computed(() => {
  const tabs = []
  if (reward.value.wechat) tabs.push({ key: 'wechat', label: '微信' })
  if (reward.value.alipay) tabs.push({ key: 'alipay', label: '支付宝' })
  return tabs
})

async function loadReward() {
  try {
    const res = await getConfig('Mellow_functions')
    const config = res.data?.json || {}
    reward.value = {
      enabled: config.reward?.enabled !== false,
      wechat: config.reward?.wechat || '',
      alipay: config.reward?.alipay || ''
    }
  } catch {
    // 读取失败时静默，不阻塞文章加载
  }
}

function openReward() {
  rewardVisible.value = true
  rewardTab.value = rewardTabs.value[0]?.key || 'wechat'
  document.body.style.overflow = 'hidden'
}

function closeReward() {
  rewardVisible.value = false
  document.body.style.overflow = ''
}

const contentHtml = computed(() => renderMarkdown(article.value?.content || ''))
const contentRef = ref(null)

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
  try {
    if (liked.value) {
      await unlike('article', route.params.id)
      liked.value = false
      likeCount.value = Math.max(0, likeCount.value - 1)
      toast.info('已取消点赞')
    } else {
      await like('article', route.params.id)
      liked.value = true
      likeCount.value += 1
      toast.success('点赞成功')
    }
  } catch {}
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

watch(() => route.params.id, load)
onMounted(() => {
  load()
  loadReward()
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
.abstract {
  padding: 16px 20px;
  background: var(--bg-muted);
  border-left: 3px solid var(--primary);
  font-size: 13px;
  color: var(--text-soft);
  border-radius: 0 var(--radius) var(--radius) 0;
  margin-bottom: 24px;
}
.content {
  font-size: 15px;
  line-height: 1.8;
  color: var(--text);
  word-break: break-word;
}

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
.reward-btn {
  border-color: var(--danger);
  color: var(--danger);
}
.reward-btn:hover {
  background: var(--danger);
  color: #fff;
}

/* 打赏弹窗 */
.reward-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
}
.reward-dialog {
  width: 100%;
  max-width: 340px;
  background: var(--bg-card);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-md);
  overflow: hidden;
}
.reward-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  background: linear-gradient(135deg, rgba(212, 161, 72, 0.12), rgba(184, 153, 104, 0.05));
  border-bottom: 1px solid var(--border-soft);
}
.reward-title {
  font-size: 16px;
  font-weight: 600;
  color: var(--text);
}
.reward-tabs {
  display: flex;
  border-bottom: 1px solid var(--border-soft);
}
.reward-tab {
  flex: 1;
  padding: 10px;
  background: none;
  border: none;
  color: var(--text-muted);
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  border-bottom: 2px solid transparent;
  transition: color 0.2s;
}
.reward-tab:hover,
.reward-tab.active {
  color: var(--primary);
}
.reward-tab.active {
  border-bottom-color: var(--primary);
}
.reward-body {
  padding: 24px 20px;
  text-align: center;
}
.reward-tip {
  font-size: 13px;
  color: var(--text-muted);
  margin-bottom: 16px;
}
.reward-qr {
  display: flex;
  justify-content: center;
}
.reward-qr img {
  width: 200px;
  height: 200px;
  object-fit: contain;
  background: #fff;
  border: 1px solid var(--border-soft);
  border-radius: var(--radius);
  padding: 8px;
}
.qr-label {
  margin-top: 12px;
  font-size: 13px;
  font-weight: 500;
  color: var(--primary-deep);
}

.reward-fade-enter-active,
.reward-fade-leave-active {
  transition: opacity 0.25s;
}
.reward-fade-enter-active .reward-dialog,
.reward-fade-leave-active .reward-dialog {
  transition: transform 0.25s, opacity 0.25s;
}
.reward-fade-enter-from,
.reward-fade-leave-to {
  opacity: 0;
}
.reward-fade-enter-from .reward-dialog,
.reward-fade-leave-to .reward-dialog {
  transform: scale(0.95) translateY(-10px);
  opacity: 0;
}
.author-card {
  display: flex;
  gap: 16px;
  margin: 24px 0;
}
.author-avatar {
  width: 56px;
  height: 56px;
  border-radius: 50%;
  object-fit: cover;
}
.author-info {
  flex: 1;
}
.author-name {
  font-size: 15px;
  font-weight: 500;
  margin-bottom: 4px;
}
.author-desc {
  font-size: 12px;
  color: var(--text-muted);
}
.loading {
  padding: 64px;
  text-align: center;
  color: var(--text-muted);
}

/* Markdown 渲染样式（基础排版） */
.markdown-body {
  font-size: 15px;
  line-height: 1.8;
  color: var(--text);
  word-break: break-word;
  overflow-wrap: anywhere;
}
.markdown-body :deep(h1),
.markdown-body :deep(h2),
.markdown-body :deep(h3),
.markdown-body :deep(h4),
.markdown-body :deep(h5),
.markdown-body :deep(h6) {
  margin: 1.6em 0 0.8em;
  font-weight: 600;
  line-height: 1.4;
  color: var(--text);
}
.markdown-body :deep(h1) { font-size: 1.7em; }
.markdown-body :deep(h2) {
  font-size: 1.4em;
  padding-bottom: 0.3em;
  border-bottom: 1px solid var(--border-soft);
}
.markdown-body :deep(h3) { font-size: 1.2em; }
.markdown-body :deep(h4) { font-size: 1.05em; }
.markdown-body :deep(h5) { font-size: 0.95em; color: var(--text-soft); }
.markdown-body :deep(h6) { font-size: 0.88em; color: var(--text-muted); }

.markdown-body :deep(p) {
  margin: 0.85em 0;
}
.markdown-body :deep(strong) {
  font-weight: 600;
  color: var(--text);
}
.markdown-body :deep(em) {
  font-style: italic;
}
.markdown-body :deep(del) {
  color: var(--text-muted);
}
.markdown-body :deep(a) {
  color: var(--link);
  text-decoration: none;
  border-bottom: 1px solid transparent;
  transition: border-color 0.2s, color 0.2s;
}
.markdown-body :deep(a:hover) {
  color: var(--link-hover);
  border-bottom-color: var(--link-hover);
}

.markdown-body :deep(hr) {
  border: none;
  border-top: 1px solid var(--border-soft);
  margin: 2em 0;
}

/* 行内代码 */
.markdown-body :deep(code) {
  background: var(--bg-muted);
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 0.88em;
  font-family: var(--font-mono, ui-monospace, SFMono-Regular, Menlo, Consolas, monospace);
  color: var(--primary-deep);
  word-break: break-all;
}
/* 代码块 */
.markdown-body :deep(pre) {
  background: #2c2a26;
  color: #f0eee5;
  padding: 16px;
  border-radius: var(--radius);
  overflow-x: auto;
  font-size: 13px;
  line-height: 1.6;
  margin: 1em 0;
}
.markdown-body :deep(pre code) {
  background: transparent;
  padding: 0;
  border-radius: 0;
  font-size: inherit;
  color: inherit;
  word-break: normal;
}
.markdown-body :deep(pre)::-webkit-scrollbar {
  height: 8px;
}
.markdown-body :deep(pre)::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.2);
  border-radius: 8px;
}

/* 引用 */
.markdown-body :deep(blockquote) {
  border-left: 4px solid var(--primary-soft);
  padding: 6px 16px;
  margin: 1em 0;
  color: var(--text-muted);
  background: var(--bg-soft);
  border-radius: 0 var(--radius) var(--radius) 0;
}
.markdown-body :deep(blockquote p) {
  margin: 0.4em 0;
}
.markdown-body :deep(blockquote blockquote) {
  margin: 0.5em 0;
}

/* 列表 */
.markdown-body :deep(ul),
.markdown-body :deep(ol) {
  padding-left: 24px;
  margin: 0.8em 0;
}
.markdown-body :deep(li) {
  margin: 0.3em 0;
}
.markdown-body :deep(ul ul),
.markdown-body :deep(ol ol),
.markdown-body :deep(ul ol),
.markdown-body :deep(ol ul) {
  margin: 0.3em 0;
}
/* 任务列表 */
.markdown-body :deep(li.task-list-item) {
  list-style: none;
  margin-left: -20px;
}
.markdown-body :deep(li.task-list-item input) {
  margin-right: 8px;
  vertical-align: middle;
}

/* 图片 / 视频 */
.markdown-body :deep(img) {
  display: block;
  max-width: 100%;
  margin: 1em auto;
  border-radius: var(--radius);
  cursor: zoom-in;
}
.markdown-body :deep(video) {
  display: block;
  max-width: 100%;
  margin: 1em auto;
  border-radius: var(--radius);
}

/* 表格 */
.markdown-body :deep(table) {
  width: 100%;
  border-collapse: collapse;
  margin: 1em 0;
  font-size: 0.9em;
  overflow: hidden;
  border-radius: var(--radius);
}
.markdown-body :deep(th),
.markdown-body :deep(td) {
  border: 1px solid var(--border);
  padding: 8px 12px;
  text-align: left;
}
.markdown-body :deep(thead th) {
  background: var(--bg-muted);
  font-weight: 600;
}
.markdown-body :deep(tbody tr:nth-child(even)) {
  background: var(--bg-soft);
}

.markdown-body :deep(kbd) {
  background: var(--bg-muted);
  border: 1px solid var(--border);
  border-bottom-width: 2px;
  border-radius: 4px;
  padding: 1px 6px;
  font-size: 0.85em;
  font-family: var(--font-mono, ui-monospace, monospace);
}

</style>