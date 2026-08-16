<template>
  <article class="article-item">
    <h3 class="article-title">
      <router-link :to="`/articles/${article.id}`">{{ article.title }}</router-link>
      <span v-if="article.status === 0" class="status-tag">草稿</span>
    </h3>
    <div class="article-meta">
      <span class="meta-date">{{ formatDate(article.create_time) }}</span>
      <span class="meta-tag" v-for="t in parseTags(article.tags)" :key="t">{{ t }}</span>
      <span class="meta-stat">{{ article.views || 0 }} 次阅读</span>
      <span class="meta-stat">{{ commentCount }} 评论</span>
    </div>
    <p class="article-abstract">{{ truncate(article.abstract || article.content, 140) }}</p>
  </article>
</template>

<script setup>
import { computed, ref, onMounted } from 'vue'
import { formatDate } from '@/utils/time'
import { parseTagsField, truncate } from '@/utils/helper'
import { call } from '@/api/request'

const props = defineProps({
  article: { type: Object, required: true }
})

const parseTags = (tags) => parseTagsField(tags).slice(0, 2)
const commentCount = ref(0)

onMounted(async () => {
  try {
    const res = await call('comment', 'count', {
      method: 'GET',
      params: { bind_id: props.article.id, bind_type: 'article' }
    })
    commentCount.value = res.data || 0
  } catch {}
})
</script>

<style scoped>
.article-item {
  padding: 24px 0;
  border-bottom: 1px dashed var(--border);
}
.article-item:last-child {
  border-bottom: none;
}

.article-title {
  font-size: 18px;
  font-weight: 600;
  margin-bottom: 8px;
}
.article-title a {
  color: var(--text);
}
.article-title a:hover {
  color: var(--primary);
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
  gap: 12px;
  font-size: 12px;
  color: var(--text-muted);
  margin-bottom: 8px;
}
.meta-date { color: var(--primary-deep); }
.meta-tag {
  color: var(--text-soft);
}
.meta-stat { color: var(--text-light); }

.article-abstract {
  font-size: 13px;
  color: var(--text-soft);
  line-height: 1.7;
  margin: 0;
}
</style>