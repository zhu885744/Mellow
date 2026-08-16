<template>
  <div class="home">
    <!-- 首页导航 -->
    <SectionTitle title="首页导航">
      <template #extra>
        <span class="text-muted">Pages</span>
      </template>
    </SectionTitle>

    <div class="nav-grid">
      <router-link
        v-for="p in navPages"
        :key="p.id"
        :to="`/page/${p.key || p.id}`"
        class="nav-card"
      >
        <h3 class="nav-card__title">{{ p.title }}</h3>
        <p class="nav-card__desc">{{ p.description || truncate(p.content, 60) }}</p>
      </router-link>
      <div v-if="loading.pages" class="loading">
        <span class="spinner" />
      </div>
      <EmptyState v-else-if="!navPages.length" text="暂无导航页" />
    </div>

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
      <div v-if="loading.articles" class="loading">
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
import { call } from '@/api/request'
import { truncate } from '@/utils/helper'

const loading = ref({ articles: false, pages: false })
const articles = ref([])
const navPages = ref([])

async function loadArticles() {
  loading.value.articles = true
  try {
    const res = await listArticles({
      page: 1,
      limit: 8,
      where: JSON.stringify({ status: 1 }),
      order: 'create_time desc'
    })
    articles.value = res.data?.data || []
  } catch {
    articles.value = []
  } finally {
    loading.value.articles = false
  }
}

async function loadPages() {
  loading.value.pages = true
  try {
    const res = await call('pages', 'all', {
      method: 'GET',
      params: {
        page: 1,
        limit: 6,
        field: 'id,title,description,content,key',
        order: 'create_time desc'
      }
    })
    navPages.value = res.data?.data || []
  } catch {
    navPages.value = []
  } finally {
    loading.value.pages = false
  }
}

onMounted(() => {
  loadArticles()
  loadPages()
})
</script>

<style scoped>
.home {
  padding-bottom: 32px;
}
.nav-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
  margin-bottom: 16px;
}
.nav-card {
  display: block;
  padding: 24px 20px;
  background: var(--bg-card);
  border: 1px solid var(--border-soft);
  border-radius: var(--radius-lg);
  transition: all 0.25s;
  text-decoration: none;
  color: inherit;
  min-height: 140px;
  display: flex;
  flex-direction: column;
}
.nav-card:hover {
  border-color: var(--primary);
  box-shadow: var(--shadow);
  transform: translateY(-2px);
}
.nav-card__title {
  font-family: var(--font-serif);
  font-size: 18px;
  font-weight: 600;
  margin-bottom: 12px;
  color: var(--text);
}
.nav-card__desc {
  font-size: 13px;
  line-height: 1.7;
  color: var(--text-soft);
  flex: 1;
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

@media (max-width: 768px) {
  .nav-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}
@media (max-width: 480px) {
  .nav-grid {
    grid-template-columns: 1fr;
  }
}
</style>