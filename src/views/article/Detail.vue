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

    <article class="content markdown-body" v-html="contentHtml" />

    <div v-if="tagList.length" class="article-tags">
      <router-link
        v-for="t in tagList"
        :key="t"
        :to="`/articles?tag=${t}`"
        class="tag tag-primary"
      >{{ t }}</router-link>
    </div>

    <div class="article-actions">
      <button class="btn btn-sm" @click="toggleLike">
        {{ liked ? '★' : '☆' }} 点赞 <span v-if="likeCount">({{ likeCount }})</span>
      </button>
      <button class="btn btn-sm" @click="toggleCollect">
        {{ collected ? '收藏' : '收藏' }}
        <span v-if="collectCount">({{ collectCount }})</span>
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
    <CommentTree :bind-id="article.id" bind-type="article" />
  </div>

  <EmptyState v-else-if="!loading" text="文章不存在或已被删除" />
  <div v-else-if="loading" class="loading">
    <span class="spinner" /> 加载中...
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import SectionTitle from '@/components/SectionTitle.vue'
import CommentTree from '@/components/CommentTree.vue'
import EmptyState from '@/components/EmptyState.vue'
import { getArticle } from '@/api/article'
import { call } from '@/api/request'
import {
  like, unlike, isLiked, likesCount,
  collect, uncollect, isCollected, collectsCount
} from '@/api/tags'
import { useUserStore } from '@/stores/user'
import { useRouter } from 'vue-router'
import { formatDate } from '@/utils/time'
import { renderMarkdown } from '@/utils/markdown'
import { parseTagsField } from '@/utils/helper'
import { toast } from '@/utils/toast'

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

const contentHtml = computed(() => renderMarkdown(article.value?.content || ''))
const author = computed(() => article.value?.result?.author || article.value?.user || null)
const tagList = computed(() => {
  const arr = parseTagsField(article.value?.tags)
  // 提取标签名（实际更多使用 result.tags）
  if (article.value?.result?.tags?.length) {
    return article.value.result.tags.map((t) => t.name || t)
  }
  return arr
})

async function load() {
  loading.value = true
  try {
    const res = await getArticle(route.params.id)
    article.value = res.data

    // 评论数
    const cRes = await call('comment', 'count', {
      method: 'GET',
      params: { bind_id: route.params.id, bind_type: 'article' }
    })
    commentsCount.value = cRes.data || 0
  } catch {
    article.value = null
  } finally {
    loading.value = false
  }

  // 点赞 / 收藏状态
  if (userStore.isLogged) {
    try {
      const [l, c, lc, cc] = await Promise.all([
        isLiked('article', route.params.id).catch(() => null),
        isCollected('article', route.params.id).catch(() => null),
        likesCount('article', route.params.id).catch(() => null),
        collectsCount('article', route.params.id).catch(() => null)
      ])
      liked.value = !!(l?.data)
      collected.value = !!(c?.data)
      likeCount.value = lc?.data?.count || 0
      collectCount.value = cc?.data?.count || 0
    } catch {}
  } else {
    try {
      const [lc, cc] = await Promise.all([
        likesCount('article', route.params.id).catch(() => null),
        collectsCount('article', route.params.id).catch(() => null)
      ])
      likeCount.value = lc?.data?.count || 0
      collectCount.value = cc?.data?.count || 0
    } catch {}
  }
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
onMounted(load)
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

/* Markdown 渲染样式 */
.markdown-body :deep(h1),
.markdown-body :deep(h2),
.markdown-body :deep(h3),
.markdown-body :deep(h4) {
  margin: 1.5em 0 0.8em;
  font-weight: 600;
}
.markdown-body :deep(p) {
  margin: 0.8em 0;
}
.markdown-body :deep(a) {
  color: var(--link);
}
.markdown-body :deep(code) {
  background: var(--bg-muted);
  padding: 1px 6px;
  border-radius: 3px;
  font-size: 13px;
  color: var(--primary-deep);
}
.markdown-body :deep(pre) {
  background: #2c2a26;
  color: #f0eee5;
  padding: 16px;
  border-radius: var(--radius);
  overflow-x: auto;
  font-size: 13px;
  line-height: 1.6;
}
.markdown-body :deep(pre code) {
  background: transparent;
  padding: 0;
  color: inherit;
}
.markdown-body :deep(blockquote) {
  border-left: 4px solid var(--primary-soft);
  padding: 4px 16px;
  margin: 16px 0;
  color: var(--text-muted);
  background: var(--bg-soft);
  border-radius: 0 var(--radius) var(--radius) 0;
}
.markdown-body :deep(ul),
.markdown-body :deep(ol) {
  padding-left: 24px;
  margin: 8px 0;
}
.markdown-body :deep(li) {
  list-style: disc;
}
.markdown-body :deep(img) {
  border-radius: var(--radius);
  margin: 12px 0;
}
</style>