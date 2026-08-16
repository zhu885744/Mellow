<template>
  <div>
    <!-- 标签列表（无 key 时显示网格，参考 Cardify-inis tags.vue） -->
    <template v-if="!route.params.key">
      <SectionTitle title="标签">
        <template #extra>
          <span class="text-muted">共 {{ allTags.length }} 个标签</span>
        </template>
      </SectionTitle>
      <div v-if="tagLoading" class="loading">
        <span class="spinner" /> 加载中...
      </div>
      <div v-else class="tag-cloud">
        <router-link
          v-for="t in allTags"
          :key="t.id"
          :to="`/tag/${t.id}`"
          class="tag-chip"
        >#{{ t.name }}<span class="tag-count">{{ t.count || 0 }}</span></router-link>
        <EmptyState v-if="!allTags.length" text="暂无标签" />
      </div>
    </template>

    <!-- 单个标签的文章列表 -->
    <template v-else>
      <div v-if="loading" class="loading">
        <span class="spinner" /> 加载中...
      </div>
      <EmptyState v-else-if="error" :text="errorMsg" />
      <div v-else>
        <div class="tag-info" :style="tagInfo.cover ? { backgroundImage: `url(${tagInfo.cover})` } : {}">
          <h1 class="tag-title">
            #{{ tagInfo.name }}
            <span class="tag-count-pill">({{ articleCount }})</span>
          </h1>
          <p v-if="tagInfo.description" class="tag-desc">{{ tagInfo.description }}</p>
        </div>

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
    </template>
  </div>
</template>

<script setup>
import { ref, onMounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import SectionTitle from '@/components/SectionTitle.vue'
import ArticleCard from '@/components/ArticleCard.vue'
import Pagination from '@/components/Pagination.vue'
import EmptyState from '@/components/EmptyState.vue'
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

// 标签网格列表
const allTags = ref([])
const tagLoading = ref(false)

// 获取全部标签（参考 tags.vue：tags/all 一次拿全）
async function loadAllTags() {
  tagLoading.value = true
  try {
    const res = await call('tags', 'all', {
      method: 'GET',
      params: { order: 'count desc, id desc' }
    })
    const list = res.data?.data || []
    // 参考 tags.vue：tags/all 不返回文章数，需逐个请求 article/count 计算
    await Promise.all(
      list.map(async (t) => {
        try {
          const c = await call('article', 'count', {
            method: 'GET',
            params: { where: { audit: 1 }, like: `tags|%7C${t.id}%7C` }
          })
          t.count = c.data || 0
        } catch {
          t.count = 0
        }
      })
    )
    allTags.value = list
  } catch {
    allTags.value = []
  } finally {
    tagLoading.value = false
  }
}

// 获取标签信息（通过 id / key / name 匹配，支持中文名访问）
async function loadTag() {
  const key = route.params.key
  try {
    const res = await call('tags', 'all', { method: 'GET' })
    const list = res.data?.data || []
    const matched =
      list.find((t) => String(t.id) === String(key)) ||
      list.find((t) => t.key === key) ||
      list.find((t) => t.name === decodeURIComponent(key))
    if (matched) {
      tagInfo.value = matched
      error.value = false
      return matched
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
// GET /api/article/count?like=tags|%7C1%7C&where[audit]=1
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
// GET /api/article/all?like=tags|%7C1%7C&page=1&limit=10&order=create_time desc
// 后端把 like(字段|值) 转成 tags LIKE '%|1|%'
async function loadArticles() {
  const tagId = tagInfo.value?.id
  if (!tagId) return
  try {
    const res = await call('article', 'all', {
      method: 'GET',
      params: {
        page: page.value,
        limit,
        like: `tags|%7C${tagId}%7C`,
        order: 'create_time desc'
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
  if (!route.params.key) {
    loading.value = false
    await loadAllTags()
    return
  }
  loading.value = true
  error.value = false
  const matched = await loadTag()
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
.tag-cloud {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  padding: 8px 0 24px;
}
.tag-chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 14px;
  border-radius: 999px;
  background: var(--bg-card);
  border: 1px solid var(--border);
  color: var(--text-soft);
  font-size: 13px;
  transition: all 0.2s;
}
.tag-chip:hover {
  border-color: var(--primary);
  color: var(--primary);
  background: rgba(184, 153, 104, 0.08);
}
.tag-count {
  font-size: 11px;
  color: var(--text-muted);
}
.tag-info {
  margin-bottom: 24px;
  padding: 28px 24px;
  border-radius: var(--radius);
  background: linear-gradient(135deg, rgba(184, 153, 104, 0.12), var(--bg-card));
  background-size: cover;
  background-position: center;
  position: relative;
  overflow: hidden;
}
.tag-info::before {
  content: '';
  position: absolute;
  inset: 0;
  background: rgba(255, 255, 255, 0.6);
  pointer-events: none;
}
.tag-title,
.tag-desc {
  position: relative;
}
.tag-title {
  font-family: var(--font-serif);
  font-size: 24px;
  font-weight: 600;
  margin-bottom: 6px;
}
.tag-count-pill {
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
