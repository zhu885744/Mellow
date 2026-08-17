<template>
  <div>
    <div v-if="loading" class="loading">
      <span class="spinner" /> 加载中...
    </div>
    <EmptyState v-else-if="error" :text="errorMsg" />
    <div v-else>
      <div class="tag-info card card-pad">
        <img
          v-if="tagInfo.avatar"
          :src="tagInfo.avatar"
          class="tag-avatar"
          @error="onAvatarError"
        />
        <div class="tag-info-main">
          <h1 class="tag-title">
            #{{ tagInfo.name }}
            <span class="tag-count-pill">({{ articleCount }})</span>
          </h1>
          <p class="tag-desc">{{ tagInfo.description || '该标签无描述' }}</p>
        </div>
      </div>

      <SectionTitle :title="tagInfo.name">
        <template #extra>
          <span class="text-muted">共 {{ total }} 篇</span>
        </template>
      </SectionTitle>

      <div class="article-list">
        <ArticleCard v-for="a in articles" :key="a.id" :article="a" :abstract-limit="50" />
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
import { call } from '@/api/request'

function onAvatarError(e) {
  e.target.style.display = 'none'
}

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

// 标签文章数 like 参数：后端 Like 字符串分支支持 "字段名|搜索值" 管道分隔格式，
// 值用竖线包裹（|id|）可精确匹配 tags 字段里 "|1|3|5|" 的存储格式，避免 id=1 误匹配到 11/12
// 注意：这里需要额外的竖线（tags||id|），因为 Like 用 SplitN(str, "|", 2) 分割，第一个 | 是分隔符
function tagLike(tagId) {
  return `tags||${tagId}|`
}

// 获取标签信息（tags/all?field=...&where={"id":key} 单独查询，分页也能命中）
async function loadTag() {
  const key = route.params.key
  try {
    // 优先按 id 精确查询
    let res = await call('tags', 'all', {
      method: 'GET',
      params: {
        field: 'id,name,avatar,description',
        where: JSON.stringify({ id: key }),
        limit: 1
      }
    })
    let matched = res.data?.data?.[0]
    // 兜底：按 name 匹配（支持中文名访问）
    if (!matched) {
      res = await call('tags', 'all', {
        method: 'GET',
        params: {
          field: 'id,name,avatar,description',
          where: JSON.stringify({ name: decodeURIComponent(key) }),
          limit: 1
        }
      })
      matched = res.data?.data?.[0]
    }
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
// GET /api/article/count?like=["tags","|id|"]&where={"audit":1}
async function loadArticleCount(tagId) {
  try {
    const res = await call('article', 'count', {
      method: 'GET',
      params: { where: { audit: 1 }, like: tagLike(tagId) }
    })
    articleCount.value = res.data || 0
  } catch {
    articleCount.value = 0
  }
}

// 获取标签下文章列表
// GET /api/article/all?page=1&like=["tags","|id|"]&field=id,title,abstract,covers,views,create_time,publish_time&order=create_time desc
// where 非 root 用户后端自动加 audit=1，无需前端处理
async function loadArticles() {
  const tagId = tagInfo.value?.id
  if (!tagId) return
  try {
    const res = await call('article', 'all', {
      method: 'GET',
      params: {
        page: page.value,
        limit,
        like: tagLike(tagId),
        field: 'id,title,abstract,covers,views,create_time,publish_time',
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
  loading.value = true
  error.value = false
  const matched = await loadTag()
  if (matched) {
    await Promise.all([loadArticleCount(matched.id), loadArticles()])
  }
  loading.value = false
}

// 从 /tag/1 跳转到 /tag/2 时组件复用，监听参数变化重新加载
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
  display: flex;
  align-items: center;
  gap: 20px;
  margin-bottom: 24px;
  background: linear-gradient(135deg, rgba(184, 153, 104, 0.08), var(--bg-card));
}
.tag-avatar {
  width: 80px;
  height: 80px;
  border-radius: var(--radius);
  object-fit: cover;
  flex-shrink: 0;
  background: var(--bg-muted);
}
.tag-info-main {
  flex: 1;
  min-width: 0;
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
