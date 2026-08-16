<template>
  <article class="article-item">
    <!-- 封面图（左图右文布局） -->
    <div class="article-layout" :class="{ 'has-cover': cover }">
      <div v-if="cover" class="article-cover" @click="goDetail">
        <img :src="cover" :alt="article.title" loading="lazy" />
      </div>
      <div class="article-main">
        <h3 class="article-title">
          <router-link :to="`/archives/${article.id}`">{{ article.title }}</router-link>
          <span v-if="article.top" class="top-tag">置顶</span>
          <span v-else-if="article.status === 0" class="status-tag">草稿</span>
        </h3>
        <div class="article-meta">
          <span class="meta-date">{{ formatDate(article.publish_time || article.create_time) }}</span>
          <span v-if="group" class="meta-group">
            <router-link :to="`/category/${group.key || group.id}`">{{ group.name }}</router-link>
          </span>
          <span
            v-for="t in tagList"
            :key="t.id"
            class="meta-tag"
          >
            <router-link :to="`/tag/${t.id}`">#{{ t.name }}</router-link>
          </span>
        </div>
        <p class="article-abstract">{{ truncate(article.abstract || article.text || article.content, 140) }}</p>
        <div class="article-foot">
          <span class="meta-stat">
            <router-link v-if="author" :to="`/author/${author.id}`">{{ author.nickname }}</router-link>
          </span>
          <span class="meta-stat">{{ article.views || 0 }} 次阅读</span>
          <span class="meta-stat">{{ commentCount }} 评论</span>
        </div>
      </div>
    </div>
  </article>
</template>

<script setup>
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { formatDate } from '@/utils/time'
import { truncate } from '@/utils/helper'

const props = defineProps({
  article: { type: Object, required: true }
})

const router = useRouter()

// 封面
const cover = computed(() => {
  const c = props.article.covers
  if (!c) return ''
  if (Array.isArray(c)) return c[0] || ''
  return String(c).split(',')[0] || ''
})

// 分组（后端返回对象）
const group = computed(() => {
  const g = props.article.result?.group
  if (!g) return null
  return Array.isArray(g) ? g[0] : g
})

// 标签（后端返回数组对象）
const tagList = computed(() => {
  const t = props.article.result?.tags
  if (Array.isArray(t)) return t.slice(0, 3)
  return []
})

// 作者
const author = computed(() => {
  return props.article.result?.author || null
})

// 评论数直接取文章返回里的 result.comment.count
// （comment/count 不支持 bind_id/bind_type 过滤，会返回全站评论总数）
const commentCount = computed(() => props.article.result?.comment?.count || 0)

function goDetail() {
  router.push(`/archives/${props.article.id}`)
}
</script>

<style scoped>
.article-item {
  padding: 20px 0;
  border-bottom: 1px dashed var(--border);
}
.article-item:last-child {
  border-bottom: none;
}

.article-layout {
  display: flex;
  gap: 16px;
}
.article-layout.has-cover {
  align-items: flex-start;
}
.article-cover {
  width: 160px;
  height: 108px;
  flex-shrink: 0;
  border-radius: var(--radius);
  overflow: hidden;
  cursor: pointer;
  background: var(--bg-muted);
}
.article-cover img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.3s;
}
.article-cover:hover img {
  transform: scale(1.05);
}
.article-main {
  flex: 1;
  min-width: 0;
}

.article-title {
  font-size: 18px;
  font-weight: 600;
  margin-bottom: 8px;
  line-height: 1.4;
}
.article-title a {
  color: var(--text);
}
.article-title a:hover {
  color: var(--primary);
}
.top-tag {
  display: inline-block;
  margin-left: 8px;
  padding: 1px 6px;
  font-size: 11px;
  border-radius: 3px;
  background: rgba(192, 57, 43, 0.1);
  color: var(--accent);
  vertical-align: middle;
}
.status-tag {
  display: inline-block;
  margin-left: 8px;
  padding: 1px 6px;
  font-size: 11px;
  border-radius: 3px;
  background: var(--bg-muted);
  color: var(--text-muted);
  vertical-align: middle;
}

.article-meta {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px;
  font-size: 12px;
  color: var(--text-muted);
  margin-bottom: 8px;
}
.meta-date { color: var(--primary-deep); }
.meta-group a,
.meta-tag a {
  color: var(--text-soft);
}
.meta-group a:hover,
.meta-tag a:hover {
  color: var(--primary);
}

.article-abstract {
  font-size: 13px;
  color: var(--text-soft);
  line-height: 1.7;
  margin: 0 0 8px;
}

.article-foot {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 12px;
  color: var(--text-muted);
}
.article-foot a {
  color: var(--text-muted);
}
.article-foot a:hover {
  color: var(--primary);
}
.meta-stat { color: var(--text-light); }

@media (max-width: 480px) {
  .article-layout.has-cover {
    flex-direction: column;
  }
  .article-cover {
    width: 100%;
    height: 160px;
  }
}
</style>
