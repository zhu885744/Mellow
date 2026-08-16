<template>
  <div>
    <!-- 分类信息卡片 -->
    <div v-if="loading" class="loading">
      <span class="spinner" /> 加载中...
    </div>
    <EmptyState v-else-if="error" :text="errorMsg" />
    <div v-else>
      <div class="category-info card card-pad">
        <img
          v-if="categoryInfo.avatar"
          :src="categoryInfo.avatar"
          class="category-avatar"
          @error="onAvatarError"
        />
        <div class="category-info-main">
          <h1 class="category-title">
            {{ categoryInfo.name }}
            <span class="category-count">({{ articleCount }})</span>
          </h1>
          <p v-if="categoryInfo.description" class="category-desc">{{ categoryInfo.description }}</p>
        </div>
      </div>

      <!-- 文章列表 -->
      <SectionTitle :title="categoryInfo.name">
        <template #extra>
          <span class="text-muted">共 {{ total }} 篇</span>
        </template>
      </SectionTitle>

      <div class="article-list">
        <ArticleCard v-for="a in articles" :key="a.id" :article="a" />
        <EmptyState v-if="!articles.length" text="该分类下暂无文章" />
      </div>

      <Pagination
        :current="page"
        :total="total"
        :page-size="limit"
        @update:current="(p) => { page = p; loadArticles() }"
      />
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import SectionTitle from '@/components/SectionTitle.vue'
import ArticleCard from '@/components/ArticleCard.vue'
import Pagination from '@/components/Pagination.vue'
import EmptyState from '@/components/EmptyState.vue'
import { getArticleGroups } from '@/api/article'
import { call } from '@/api/request'

const route = useRoute()

const loading = ref(true)
const error = ref(false)
const errorMsg = ref('')
const categoryInfo = ref({})
const articles = ref([])
const page = ref(1)
const total = ref(0)
const limit = 10
const articleCount = ref(0)

const defaultAvatar = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40"><circle cx="20" cy="20" r="20" fill="%23e8e6dd"/></svg>'

function onAvatarError(e) {
  e.target.style.display = 'none'
}

// 获取分类信息（通过 key 或 id 匹配）
async function loadCategory() {
  const key = route.params.key
  try {
    const res = await getArticleGroups()
    const list = res.data?.data || []
    const matched =
      list.find((c) => c.key === key) ||
      list.find((c) => String(c.id) === String(key))
    if (matched) {
      categoryInfo.value = matched
      error.value = false
      return matched
    }
    error.value = true
    errorMsg.value = '未找到该分类'
    return null
  } catch {
    error.value = true
    errorMsg.value = '获取分类信息失败'
    return null
  }
}

// 获取分类下文章数量
async function loadArticleCount(groupId) {
  try {
    const res = await call('article', 'count', {
      method: 'GET',
      params: { where: { audit: 1 }, like: `group|%7C${groupId}%7C` }
    })
    articleCount.value = res.data || 0
  } catch {
    articleCount.value = 0
  }
}

// 获取分类下文章列表
async function loadArticles() {
  const groupId = categoryInfo.value.id
  if (!groupId) return
  try {
    const res = await call('article', 'all', {
      method: 'GET',
      params: {
        page: page.value,
        limit,
        where: { audit: 1 },
        like: `group|%7C${groupId}%7C`,
        order: 'top desc, publish_time desc'
      }
    })
    articles.value = res.data?.data || []
    total.value = res.data?.count || 0
  } catch {
    articles.value = []
    total.value = 0
  }
}

async function init() {
  loading.value = true
  error.value = false
  const matched = await loadCategory()
  if (matched) {
    await Promise.all([loadArticleCount(matched.id), loadArticles()])
  }
  loading.value = false
}

watch(() => route.params.key, () => {
  page.value = 1
  init()
})

onMounted(init)
</script>

<style scoped>
.loading {
  padding: 64px;
  text-align: center;
  color: var(--text-muted);
}
.category-info {
  display: flex;
  align-items: center;
  gap: 20px;
  margin-bottom: 24px;
  background: linear-gradient(135deg, rgba(184, 153, 104, 0.08), var(--bg-card));
}
.category-avatar {
  width: 80px;
  height: 80px;
  border-radius: var(--radius);
  object-fit: cover;
  flex-shrink: 0;
  background: var(--bg-muted);
}
.category-info-main {
  flex: 1;
  min-width: 0;
}
.category-title {
  font-family: var(--font-serif);
  font-size: 24px;
  font-weight: 600;
  margin-bottom: 6px;
}
.category-count {
  font-size: 16px;
  font-weight: normal;
  color: var(--text-muted);
}
.category-desc {
  font-size: 13px;
  color: var(--text-muted);
  margin: 0;
  line-height: 1.6;
}
.article-list {
  padding: 8px 0;
}
</style>
