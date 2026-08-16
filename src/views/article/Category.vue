<template>
  <div>
    <!-- 分类列表（无 key 时显示网格，参考 Cardify-inis category.vue） -->
    <template v-if="!route.params.key">
      <SectionTitle title="分类">
        <template #extra>
          <span class="text-muted">共 {{ allCategories.length }} 个分类</span>
        </template>
      </SectionTitle>
      <div v-if="catLoading" class="loading">
        <span class="spinner" /> 加载中...
      </div>
      <div v-else class="cat-grid">
        <router-link
          v-for="c in allCategories"
          :key="c.id"
          :to="`/category/${c.key || c.id}`"
          class="cat-card"
        >
          <img v-if="c.avatar" :src="c.avatar" class="cat-cover" @error="onImgError" />
          <div v-else class="cat-cover cat-cover-empty">{{ c.name?.[0] || '·' }}</div>
          <div class="cat-name">{{ c.name }}</div>
          <div class="cat-count">{{ c.count || 0 }} 篇</div>
        </router-link>
        <EmptyState v-if="!allCategories.length" text="暂无分类" />
      </div>
    </template>

    <!-- 单个分类的文章列表 -->
    <template v-else>
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
              <span class="category-count">({{ total }})</span>
            </h1>
            <p v-if="categoryInfo.description" class="category-desc">{{ categoryInfo.description }}</p>
          </div>
        </div>

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
const categoryInfo = ref({})
const articles = ref([])
const page = ref(1)
const total = ref(0)
const limit = 10

const allCategories = ref([])
const catLoading = ref(false)

const defaultAvatar = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40"><circle cx="20" cy="20" r="20" fill="%23e8e6dd"/></svg>'

function onAvatarError(e) {
  e.target.style.display = 'none'
}
function onImgError(e) {
  e.target.style.display = 'none'
}

// 获取全部分类（参考 category.vue：/api/article-group/all）
async function loadAllCategories() {
  catLoading.value = true
  try {
    const res = await call('article-group', 'all', { method: 'GET' })
    const list = res?.data?.data || []
    // article 表 group 字段存的是 |分类ID|（竖线包裹），不是 key
    await Promise.all(
      list.map(async (c) => {
        try {
          const cnt = await call('article', 'count', {
            method: 'GET',
            params: { where: JSON.stringify({ group: `|${c.id}|` }) }
          })
          c.count = cnt.data || 0
        } catch {
          c.count = 0
        }
      })
    )
    allCategories.value = list
  } catch {
    allCategories.value = []
  } finally {
    catLoading.value = false
  }
}

// 获取分类信息，解析出分类 id（文章 group 字段用的是 |id|）
// 路由参数可能是 id 或 key/中文名：
//  - 纯数字 → article-group/one?id=
//  - key    → article-group/all?where={"key":...}（one 不支持按 key 查）
//  - 中文名  → 在 article-group/all 列表里按 name 匹配
async function loadCategory() {
  const key = route.params.key
  try {
    if (/^\d+$/.test(String(key))) {
      const one = await call('article-group', 'one', {
        method: 'GET',
        params: { id: key }
      })
      if (one?.data?.id) {
        categoryInfo.value = one.data
        error.value = false
        return one.data
      }
    } else {
      // 用 key 反查分类 id
      const byKey = await call('article-group', 'all', {
        method: 'GET',
        params: {
          where: JSON.stringify({ key }),
          field: 'id,key,name,avatar,description'
        }
      })
      const hit = (byKey?.data?.data || [])[0]
      if (hit?.id) {
        categoryInfo.value = hit
        error.value = false
        return hit
      }
    }
    // 兜底：全部列表里按 key / 中文名匹配
    const res = await call('article-group', 'all', { method: 'GET' })
    const list = res?.data?.data || []
    const matched =
      list.find((c) => String(c.id) === String(key)) ||
      list.find((c) => c.key === key) ||
      list.find((c) => c.name === decodeURIComponent(key))
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

// 获取分类下文章列表：where={"group":"|分类ID|"}，竖线必须
async function loadArticles() {
  const groupId = categoryInfo.value?.id
  if (!groupId) return
  try {
    const res = await call('article', 'all', {
      method: 'GET',
      params: {
        page: page.value,
        limit,
        where: JSON.stringify({ group: `|${groupId}|` }),
        order: 'top desc, create_time desc'
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
    await loadAllCategories()
    return
  }
  loading.value = true
  error.value = false
  const matched = await loadCategory()
  if (matched) {
    await loadArticles()
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
.cat-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
  gap: 16px;
  padding: 8px 0 24px;
}
.cat-card {
  display: block;
  padding: 14px;
  border-radius: var(--radius);
  background: var(--bg-card);
  border: 1px solid var(--border);
  text-align: center;
  transition: all 0.2s;
}
.cat-card:hover {
  border-color: var(--primary);
  transform: translateY(-2px);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.06);
}
.cat-cover {
  width: 64px;
  height: 64px;
  border-radius: 50%;
  object-fit: cover;
  margin: 0 auto 10px;
  background: var(--bg-muted);
}
.cat-cover-empty {
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 26px;
  font-family: var(--font-serif);
  color: var(--primary);
  background: rgba(184, 153, 104, 0.12);
}
.cat-name {
  font-size: 14px;
  font-weight: 500;
  color: var(--text);
}
.cat-count {
  font-size: 12px;
  color: var(--text-muted);
  margin-top: 2px;
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
