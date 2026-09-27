<template>
  <div class="search-page">
    <!-- 搜索区：大输入框 + 范围切换 -->
    <section class="search-hero card card-pad">
      <form class="search-form" role="search" @submit.prevent="submit">
        <i class="bi bi-search search-form__icon" aria-hidden="true" />
        <input
          ref="inputRef"
          v-model="keyword"
          class="search-form__input"
          type="search"
          :placeholder="placeholder"
          aria-label="搜索"
          autocomplete="off"
          @input="onInput"
          @keydown.down.prevent="move(1)"
          @keydown.up.prevent="move(-1)"
        />
        <button v-if="keyword" type="button" class="search-form__clear" aria-label="清空" @click="clearKeyword">
          <i class="bi bi-x" />
        </button>
        <button type="submit" class="btn btn-primary search-form__submit">
          <i class="bi bi-search" /> 搜索
        </button>
      </form>

      <div class="search-scopes" role="tablist" aria-label="搜索范围">
        <button
          v-for="item in SCOPES"
          :key="item.key"
          type="button"
          class="scope-btn"
          :class="{ active: scope === item.key }"
          role="tab"
          :aria-selected="scope === item.key"
          @click="changeScope(item.key)"
        >
          <i :class="item.icon" /> {{ item.label }}
        </button>
      </div>
    </section>

    <!-- 未搜索：热门关键词 + 搜索历史 -->
    <template v-if="!submitted">
      <section class="card card-pad">
        <header class="block-head">
          <h3 class="block-title"><i class="bi bi-fire" /> 热门搜索</h3>
        </header>
        <div class="tag-list">
          <button v-for="(word, i) in HOT_SEARCHES" :key="i" class="search-tag" @click="useKeyword(word)">
            {{ word }}
          </button>
        </div>
      </section>

      <section v-if="history.length" class="card card-pad">
        <header class="block-head">
          <h3 class="block-title"><i class="bi bi-clock-history" /> 搜索历史</h3>
          <button type="button" class="link-btn" @click="clearHistory">清除全部</button>
        </header>
        <div class="tag-list">
          <span v-for="(word, i) in history" :key="i" class="search-tag search-tag--history">
            <button type="button" class="search-tag__text" @click="useKeyword(word)">{{ word }}</button>
            <button type="button" class="search-tag__remove" aria-label="删除这条历史" @click="removeHistory(i)">
              <i class="bi bi-x" />
            </button>
          </span>
        </div>
      </section>
    </template>

    <!-- 搜索结果 -->
    <template v-else>
      <div class="result-head">
        <span>
          关键词 <strong>{{ submitted }}</strong>
          <template v-if="!loading"> · 共 {{ results.length }} 条结果</template>
        </span>
        <span class="result-hint">
          <kbd>↑</kbd><kbd>↓</kbd> 选择 · <kbd>Enter</kbd> 打开
        </span>
      </div>

      <!-- 加载骨架 -->
      <div v-if="loading" class="card card-pad">
        <div v-for="i in 4" :key="'sk-' + i" class="skeleton-row" />
      </div>

      <div v-else-if="!results.length" class="card card-pad">
        <EmptyState icon="bi bi-search" text="没有找到相关内容，换个关键词试试" />
      </div>

      <!-- 按类型分组 -->
      <template v-else>
        <section v-for="group in groups" :key="group.key" class="card card-pad result-group">
          <header class="block-head">
            <h3 class="block-title">
              <i :class="group.icon" /> {{ group.label }}
            </h3>
            <span class="block-count">{{ group.items.length }} 条</span>
          </header>
          <ul class="result-list">
            <li
              v-for="item in group.items"
              :key="item.id || item._index"
              class="result-item"
              :class="{ selected: selected === item._index }"
              @mouseenter="selected = item._index"
              @click="goResult(item)"
            >
              <span class="result-badge" :class="`is-${item._type}`">{{ typeName(item._type) }}</span>
              <span class="result-title" v-html="titleText(item)" />
              <i class="bi bi-chevron-right result-arrow" aria-hidden="true" />
            </li>
          </ul>
        </section>
      </template>
    </template>
  </div>
</template>

<script setup>
/**
 * 搜索（/search）
 *
 * 由原来的搜索弹窗改成独立页面：
 * - 关键词与搜索范围同步到地址栏（/search?q=xxx&scope=article），可分享、可刷新、可后退；
 * - scope=all 时并行查询全部类型并按「文章 / 页面 / 用户 / 友链 / 动态 / 标签」分组展示，
 *   指定范围时只查该类型；
 * - 键盘可用：↑↓ 选择、Enter 打开（Enter 在输入框内触发提交，选中项优先）；
 * - 后端接口：search/{article,pages,tags,links,users,moments}（type=common，无需登录）。
 */
import { ref, computed, onMounted, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import EmptyState from '@/components/EmptyState.vue'
import { call } from '@/api/request'

const route = useRoute()
const router = useRouter()

const STORAGE_KEY = 'mellow_search_history'

// 搜索范围：key 与后端 search 控制器的方法名对应（scope 是前端自己的名字）
const SCOPES = [
  { key: 'all', label: '全部', icon: 'bi bi-grid', api: '' },
  { key: 'article', label: '文章', icon: 'bi bi-file-text', api: 'article' },
  { key: 'page', label: '页面', icon: 'bi bi-file-earmark', api: 'pages' },
  { key: 'tag', label: '标签', icon: 'bi bi-tag', api: 'tags' },
  { key: 'links', label: '友链', icon: 'bi bi-link-45deg', api: 'links' },
  { key: 'users', label: '用户', icon: 'bi bi-person', api: 'users' },
  { key: 'moments', label: '动态', icon: 'bi bi-chat-square-text', api: 'moments' }
]

// 结果分组顺序（scope=all 时的合并顺序，与后端返回的字段命名一致）
const GROUP_ORDER = [
  { key: 'article', label: '文章', icon: 'bi bi-file-text' },
  { key: 'page', label: '页面', icon: 'bi bi-file-earmark' },
  { key: 'users', label: '用户', icon: 'bi bi-person' },
  { key: 'links', label: '友链', icon: 'bi bi-link-45deg' },
  { key: 'moments', label: '动态', icon: 'bi bi-chat-square-text' },
  { key: 'tag', label: '标签', icon: 'bi bi-tag' }
]

const HOT_SEARCHES = ['随记', '旅行', '博客', 'Vue', 'Node.js', '前端开发', '算法', '数据库']

const TYPE_NAMES = {
  article: '文章',
  page: '页面',
  tag: '标签',
  links: '友链',
  users: '用户',
  moments: '动态'
}

const PLACEHOLDER = {
  article: '搜索文章...',
  page: '搜索页面...',
  tag: '搜索标签...',
  links: '搜索友链...',
  users: '搜索用户...',
  moments: '搜索动态...'
}

const inputRef = ref(null)
const keyword = ref('')
// 已提交的关键词（与输入框解耦：输入过程中不清空上一轮结果）
const submitted = ref('')
const scope = ref('all')
const loading = ref(false)
const results = ref([])
const history = ref([])
const selected = ref(-1)

let debounceTimer = null

const placeholder = computed(
  () => PLACEHOLDER[scope.value] || '搜索文章、页面、标签、友链、用户或动态...'
)

// 按类型分组（results 是扁平数组，_index 用于键盘选中）
const groups = computed(() => {
  const map = new Map()
  results.value.forEach((item) => {
    if (!map.has(item._type)) map.set(item._type, [])
    map.get(item._type).push(item)
  })

  return GROUP_ORDER.filter((group) => map.has(group.key)).map((group) => ({
    ...group,
    items: map.get(group.key)
  }))
})

// ---------- 历史记录 ----------
function loadHistory() {
  try {
    const raw = JSON.parse(localStorage.getItem(STORAGE_KEY))
    history.value = Array.isArray(raw) ? raw : []
  } catch {
    history.value = []
  }
}

function saveHistory(word) {
  if (!word) return
  history.value = [word, ...history.value.filter((item) => item !== word)].slice(0, 10)
  localStorage.setItem(STORAGE_KEY, JSON.stringify(history.value))
}

function clearHistory() {
  history.value = []
  localStorage.removeItem(STORAGE_KEY)
}

function removeHistory(index) {
  history.value.splice(index, 1)
  localStorage.setItem(STORAGE_KEY, JSON.stringify(history.value))
}

// ---------- 交互 ----------
function onInput() {
  clearTimeout(debounceTimer)
  debounceTimer = setTimeout(() => {
    if (keyword.value.trim()) runSearch(keyword.value.trim())
    else resetResults()
  }, 300)
}

function submit() {
  const word = keyword.value.trim()
  if (!word) {
    inputRef.value?.focus()
    return
  }
  // 输入框内回车：有选中项时优先打开选中项，否则按当前关键词搜索
  if (selected.value >= 0 && results.value[selected.value]) {
    goResult(results.value[selected.value])
    return
  }
  runSearch(word)
}

function useKeyword(word) {
  keyword.value = word
  runSearch(word)
}

function clearKeyword() {
  keyword.value = ''
  resetResults()
  nextTick(() => inputRef.value?.focus())
}

function resetResults() {
  submitted.value = ''
  results.value = []
  selected.value = -1
  syncQuery('', scope.value)
}

function changeScope(key) {
  if (scope.value === key) return
  scope.value = key
  selected.value = -1
  if (keyword.value.trim()) runSearch(keyword.value.trim())
  else syncQuery('', key)
}

function move(step) {
  if (!results.value.length) return
  const total = results.value.length
  selected.value = (selected.value + step + total) % total
}

// 把关键词 / 范围写进地址栏（replace：不污染后退历史，同时可分享、可刷新）
function syncQuery(word, nextScope) {
  const query = {}
  if (word) query.q = word
  if (nextScope && nextScope !== 'all') query.scope = nextScope
  const current = route.query
  if ((current.q || '') === (query.q || '') && (current.scope || '') === (query.scope || '')) return
  router.replace({ path: '/search', query })
}

// ---------- 搜索 ----------
async function runSearch(word) {
  submitted.value = word
  selected.value = -1
  loading.value = true
  syncQuery(word, scope.value)

  try {
    const list = scope.value === 'all' ? await searchAll(word) : await searchType(scope.value, word)
    // 补 _index 供键盘选中（分组后仍能定位到扁平数组里的位置）
    results.value = list.map((item, index) => ({ ...item, _index: index }))
    if (results.value.length) saveHistory(word)
  } catch {
    results.value = []
  } finally {
    loading.value = false
  }
}

// 全部范围：并行查询 + 合并去重（标签最多 3 条，避免刷屏）
async function searchAll(word) {
  const [articles, pages, tags, links, users, moments] = await Promise.all([
    searchType('article', word),
    searchType('page', word),
    searchType('tag', word),
    searchType('links', word),
    searchType('users', word),
    searchType('moments', word)
  ])

  const seen = new Set()
  const merged = []
  const push = (items, max) => {
    ;(items || []).slice(0, max || items.length).forEach((item) => {
      if (seen.has(item.id)) return
      seen.add(item.id)
      merged.push(item)
    })
  }

  push(articles)
  push(pages)
  push(users)
  push(links)
  push(moments)
  push(tags, 3)

  return merged
}

// 按范围查询：scope 是前端命名，api 是后端方法名
function apiOf(scopeKey) {
  return SCOPES.find((item) => item.key === scopeKey)?.api || scopeKey
}

async function searchType(scopeKey, word) {
  try {
    const res = await call('search', apiOf(scopeKey), {
      method: 'GET',
      params: { keyword: word, page: 1, limit: 50 }
    })
    // INIS 列表返回：data 可能直接是数组，也可能包在 data.data 里
    const arr = res.data?.data || res.data
    if (!Array.isArray(arr)) return []
    return arr.map((item) => ({ ...item, _type: scopeKey }))
  } catch {
    return []
  }
}

// ---------- 结果展示 ----------
function typeName(type) {
  return TYPE_NAMES[type] || '内容'
}

function titleText(item) {
  const type = item._type
  if (type === 'users' || type === 'links') return item.nickname || item.name || item.title || '未知'
  if (type === 'moments') return truncateHtml(item.content || '', 40) || '动态'
  return item.title || item.name || '未知'
}

// 截断带 <mark> 高亮的文本（保留标签闭合，避免截断破坏高亮）
function truncateHtml(text, max = 100) {
  if (!text) return ''
  const plain = text.replace(/<[^>]*>/g, '')
  if (plain.length <= max) return text

  let count = 0
  let out = ''
  let open = 0
  for (let i = 0; i < text.length && count < max; i++) {
    if (text[i] === '<') {
      const end = text.indexOf('>', i)
      if (end !== -1) {
        const tag = text.slice(i, end + 1)
        out += tag
        if (!tag.startsWith('</')) open++
        else open--
        i = end
        continue
      }
    }
    out += text[i]
    count++
  }
  while (open-- > 0) out += '</mark>'
  return `${out}...`
}

function goResult(item) {
  switch (item._type) {
    case 'article':
      if (item.id) router.push(`/archives/${item.id}`)
      break
    case 'page':
      if (item.key) router.push(`/${item.key}`)
      break
    case 'tag':
      if (item.id) router.push(`/tag/${item.id}`)
      break
    case 'links':
      if (item.url) window.open(item.url, '_blank')
      break
    case 'users':
      if (item.id) router.push(`/author/${item.id}`)
      break
    case 'moments':
      // Mellow 无动态详情路由，跳转动态列表页
      router.push('/moments')
      break
  }
}

onMounted(() => {
  loadHistory()

  // 支持 /search?q=xxx&scope=article 直达（刷新、分享、后退都不丢状态）
  const word = String(route.query.q || '').trim()
  const queryScope = String(route.query.scope || 'all')
  if (SCOPES.some((item) => item.key === queryScope)) scope.value = queryScope

  if (word) {
    keyword.value = word
    runSearch(word)
  } else {
    nextTick(() => inputRef.value?.focus())
  }
})
</script>

<style scoped>
.search-page {
  display: flex;
  flex-direction: column;
  gap: 16px;
  min-width: 0;
}

/* ---------- 搜索区 ---------- */
.search-hero {
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.search-form {
  position: relative;
  display: flex;
  align-items: center;
  gap: 10px;
}
.search-form__icon {
  position: absolute;
  left: 16px;
  color: var(--text-muted);
  pointer-events: none;
}
.search-form__input {
  flex: 1;
  min-width: 0;
  height: var(--control-h-lg);
  padding: 0 42px 0 44px;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background: var(--bg-soft);
  color: var(--text);
  font-size: 15px;
  transition: border-color 0.2s, box-shadow 0.2s, background-color 0.2s;
}
.search-form__input::placeholder {
  color: var(--text-light);
}
.search-form__input:focus {
  outline: none;
  background: var(--bg-card);
  border-color: var(--primary);
  box-shadow: 0 0 0 3px var(--accent-ring);
}
.search-form__clear {
  position: absolute;
  right: 108px;
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  color: var(--text-muted);
  -webkit-tap-highlight-color: transparent;
}
.search-form__clear:hover {
  background: var(--bg-muted);
  color: var(--text);
}
.search-form__submit {
  flex-shrink: 0;
  height: var(--control-h-lg);
}

/* 范围切换 */
.search-scopes {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.scope-btn {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 5px 14px;
  font-size: 13px;
  border: 1px solid var(--border);
  border-radius: 999px;
  color: var(--text-soft);
  background: var(--bg-soft);
  transition: all 0.15s;
  -webkit-tap-highlight-color: transparent;
}
.scope-btn:hover {
  color: var(--primary);
  border-color: var(--primary);
}
.scope-btn.active {
  color: #fff;
  background: var(--primary);
  border-color: var(--primary);
}

/* ---------- 区块头 ---------- */
.block-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 12px;
}
.block-title {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  margin: 0;
  font-family: var(--font-serif);
  font-size: 15px;
  font-weight: 700;
  color: var(--text);
}
.block-count {
  font-size: 12px;
  color: var(--text-muted);
  font-variant-numeric: tabular-nums;
}
.link-btn {
  font-size: 12px;
  color: var(--text-muted);
}
.link-btn:hover {
  color: var(--danger);
}

/* ---------- 关键词标签 ---------- */
.tag-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.search-tag {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  min-height: 32px;
  padding: 4px 14px;
  font-size: 13px;
  border: 1px solid var(--border);
  border-radius: 999px;
  color: var(--text-soft);
  background: var(--bg-soft);
  transition: all 0.15s;
  -webkit-tap-highlight-color: transparent;
}
.search-tag:hover {
  color: var(--primary);
  border-color: var(--primary);
}
.search-tag--history {
  padding-right: 6px;
}
.search-tag__text {
  color: inherit;
}
.search-tag__remove {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  margin-right: -4px;
  border-radius: 50%;
  font-size: 13px;
  line-height: 1;
  color: var(--text-light);
}
.search-tag__remove:hover {
  color: var(--danger);
}

/* ---------- 结果 ---------- */
.result-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  font-size: 13px;
  color: var(--text-muted);
}
.result-hint {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
}
.result-hint kbd {
  padding: 1px 5px;
  border: 1px solid var(--border);
  border-bottom-width: 2px;
  border-radius: 3px;
  background: var(--bg-card);
  font-family: var(--font-mono);
  font-size: 11px;
}

.result-list {
  display: flex;
  flex-direction: column;
  gap: 2px;
  margin: 0;
  padding: 0;
  list-style: none;
}
.result-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px;
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition: background-color 0.15s;
}
.result-item:hover,
.result-item.selected {
  background: var(--bg-muted);
}
.result-badge {
  flex-shrink: 0;
  padding: 2px 8px;
  font-size: 11px;
  border-radius: 999px;
  color: #fff;
  background: var(--primary);
}
.result-badge.is-page { background: #8a8a82; }
.result-badge.is-tag { background: #5b9bd5; }
.result-badge.is-links { background: #6aa84f; }
.result-badge.is-users { background: #c98a2d; }
.result-badge.is-moments { background: #7f6dbd; }
.result-title {
  flex: 1;
  min-width: 0;
  font-size: 14px;
  color: var(--text);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.result-title :deep(mark) {
  padding: 0 1px;
  border-radius: 2px;
  background: var(--accent-glow);
  color: inherit;
}
.result-arrow {
  flex-shrink: 0;
  color: var(--text-light);
}

/* 加载骨架 */
.skeleton-row {
  height: 40px;
  border-radius: var(--radius-sm);
  background: linear-gradient(90deg, var(--bg-muted) 25%, var(--bg-soft) 37%, var(--bg-muted) 63%);
  background-size: 400% 100%;
  animation: skeleton-shine 1.4s ease infinite;
}
.skeleton-row + .skeleton-row {
  margin-top: 8px;
}
@keyframes skeleton-shine {
  0% { background-position: 100% 50%; }
  100% { background-position: 0 50%; }
}

@media (max-width: 640px) {
  .search-form {
    flex-wrap: wrap;
  }
  .search-form__input {
    /* 16px 可避免 iOS 聚焦输入框时页面被放大 */
    font-size: 16px;
  }
  .search-form__clear {
    right: 12px;
  }
  .search-form__submit {
    width: 100%;
  }
  .search-scopes {
    flex-wrap: nowrap;
    overflow-x: auto;
    padding-bottom: 2px;
    scrollbar-width: none;
  }
  .search-scopes::-webkit-scrollbar {
    display: none;
  }
  .scope-btn {
    flex: 0 0 auto;
  }
  .result-hint {
    display: none;
  }
  .result-title {
    white-space: normal;
  }
}
</style>
