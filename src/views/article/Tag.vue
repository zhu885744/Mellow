<template>
  <div>
    <!-- 标签信息卡片 -->
    <div v-if="loading" class="loading">
      <span class="spinner" /> 加载中...
    </div>
    <EmptyState v-else-if="error" :text="errorMsg" />
    <div v-else>
      <div class="tag-info card card-pad">
        <div class="tag-info-main">
          <h1 class="tag-title">
            <span class="tag-hash">#</span>{{ tagInfo.name }}
            <span class="tag-count">({{ articleCount }})</span>
          </h1>
          <p v-if="tagInfo.description" class="tag-desc">{{ tagInfo.description }}</p>
        </div>
      </div>

      <!-- 文章列表 -->
      <SectionTitle :title="tagInfo.name">
        <template #extra>
          <span class="text-muted">共 {{ total }} 篇</span>
        </template>
      </SectionTitle>

      <div class="article-list">
        <ArticleCard v-for="a in articles" :key="a.id" :article="a" />
        <EmptyState v-if="!articles.length" text="该标签下暂无文章" />
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
import { getTag } from '@/api/tags'
import { call } from '@/api/request'

const route = useRoute()

const loading = ref(true)
const error = ref(false)
const errorMsg = ref('')
const tagInfo = ref({})
const articles = ref([])
const page = ref(1)
const total = ref(0)
const limit = 10
const articleCount = ref(0)

// 获取标签信息
async function loadTag() {
  const key = route.params.key
  try {
    // 尝试按 id 查询，失败则按 name 查询
    let res = await getTag(key)
    if (res.code === 200 && res.data) {
      tagInfo.value = res.data
      error.value = false
      return res.data
    }
    // 按 name 兜底
    const res2 = await call('tags', 'one', {
      method: 'GET',
      params: { name: key }
    })
    if (res2.code === 200 && res2.data) {
      tagInfo.value = res2.data
      error.value = false
      return res2.data
    }
    error.value = true
    errorMsg.value = '未找到该标签'
    return null
  } catch {
    error.value = true
    errorMsg.value = '获取标签信息失败'
    return null
  }
}

// 获取标签下文章数量
async function loadArticleCount(tagId) {
  try {
    const res = await call('article', 'count', {
      method: 'GET',
      params: { where: { audit: 1 }, like: `tags|%7C${tagId}%7C` }
    })
    articleCount.value = res.data || 0
  } catch {
    articleCount.value = 0
  }
}

// 获取标签下文章列表
async function loadArticles() {
  const tagId = tagInfo.value.id
  if (!tagId) return
  try {
    const res = await call('article', 'all', {
      method: 'GET',
      params: {
        page: page.value,
        limit,
        where: { audit: 1 },
        like: `tags|%7C${tagId}%7C`,
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
  const tag = await loadTag()
  if (tag) {
    await Promise.all([loadArticleCount(tag.id), loadArticles()])
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
.tag-info {
  margin-bottom: 24px;
  background: linear-gradient(135deg, rgba(184, 153, 104, 0.08), var(--bg-card));
}
.tag-info-main {
  min-width: 0;
}
.tag-title {
  font-family: var(--font-serif);
  font-size: 24px;
  font-weight: 600;
  margin-bottom: 6px;
}
.tag-hash {
  color: var(--primary);
  margin-right: 4px;
}
.tag-count {
  font-size: 16px;
  font-weight: normal;
  color: var(--text-muted);
}
.tag-desc {
  font-size: 13px;
  color: var(--text-muted);
  margin: 0;
  line-height: 1.6;
}
.article-list {
  padding: 8px 0;
}
</style>
