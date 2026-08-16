<template>
  <div class="home">
    <!-- 最新文章 -->
    <SectionTitle title="最新文章">
      <template #extra>
        <router-link to="/articles" class="more-link">查看全部 →</router-link>
      </template>
    </SectionTitle>

    <div class="article-list">
      <ArticleCard
        v-for="a in articles"
        :key="a.id"
        :article="a"
      />
      <div v-if="loading" class="loading">
        <span class="spinner" /> 加载中...
      </div>
      <EmptyState v-else-if="!articles.length" text="还没有文章" />
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import SectionTitle from '@/components/SectionTitle.vue'
import ArticleCard from '@/components/ArticleCard.vue'
import EmptyState from '@/components/EmptyState.vue'
import { listArticles } from '@/api/article'

const loading = ref(false)
const articles = ref([])

async function loadArticles() {
  loading.value = true
  try {
    const res = await listArticles({
      page: 1,
      limit: 8,
      where: { audit: 1 },
      order: 'top desc, publish_time desc'
    })
    articles.value = res.data?.data || []
  } catch {
    articles.value = []
  } finally {
    loading.value = false
  }
}

onMounted(loadArticles)
</script>

<style scoped>
.home {
  padding-bottom: 32px;
}

.article-list {
  padding: 0;
}

.loading {
  padding: 32px;
  text-align: center;
  color: var(--text-muted);
  font-size: 13px;
}
.more-link {
  color: var(--text-muted);
  font-size: 12px;
}
.more-link:hover {
  color: var(--primary);
}
</style>
