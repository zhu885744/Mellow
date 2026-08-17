<template>
  <transition name="search-modal">
    <div v-if="visible" class="search-overlay" @click.self="hide">
      <div class="search-dialog">
        <!-- 头部 -->
        <div class="search-header">
          <h3 class="search-title">搜索</h3>
          <button class="search-close" aria-label="关闭" @click="hide">
            <i class="bi bi-x-lg" />
          </button>
        </div>

        <!-- 输入区 -->
        <div class="search-input-wrap">
          <div class="search-input-group">
            <i class="bi bi-search search-icon" />
            <input
              ref="inputRef"
              v-model="query"
              type="text"
              class="search-input"
              :placeholder="placeholder"
              @input="onInput"
              @keydown.up.prevent="onArrow(-1)"
              @keydown.down.prevent="onArrow(1)"
              @keydown.enter.prevent="onEnter"
              @keydown.esc.prevent="hide"
            />
            <button v-if="query" class="search-clear" aria-label="清除" @click="clearQuery">
              <i class="bi bi-x" />
            </button>
          </div>

          <!-- 搜索范围 -->
          <div class="search-scopes">
            <button
              v-for="s in scopes"
              :key="s.key"
              class="scope-btn"
              :class="{ active: scope === s.key }"
              @click="changeScope(s.key)"
            >{{ s.label }}</button>
          </div>
        </div>

        <!-- 内容区 -->
        <div class="search-body">
          <!-- 热门搜索 -->
          <div v-if="!loading && !query && history.length === 0" class="section">
            <div class="section-header">热门搜索</div>
            <div class="search-tags">
              <button v-for="(k, i) in hotSearches" :key="i" class="search-tag" @click="useQuery(k)">{{ k }}</button>
            </div>
          </div>

          <!-- 搜索历史 -->
          <div v-if="!loading && !query && history.length > 0" class="section">
            <div class="section-header">
              搜索历史
              <button class="clear-history" @click="clearHistory">清除</button>
            </div>
            <div class="search-tags">
              <span v-for="(k, i) in history" :key="i" class="search-tag">
                <a @click="useQuery(k)">{{ k }}</a>
                <button class="tag-remove" aria-label="删除" @click="removeHistory(i)">
                  <i class="bi bi-x" />
                </button>
              </span>
            </div>
          </div>

          <!-- 搜索结果 -->
          <div v-else-if="!loading && results.length > 0" class="section">
            <div class="results">
              <button
                v-for="(r, i) in results"
                :key="r.id || r.key || i"
                class="result-item"
                :class="{ selected: selected === i }"
                @click="goResult(r)"
              >
                <span class="result-type" :class="`type-${r._type}`">{{ typeName(r._type) }}</span>
                <span class="result-title" v-html="title(r)"></span>
                <i class="bi bi-chevron-right result-arrow" />
              </button>
            </div>
          </div>

          <!-- 无结果 -->
          <div v-else-if="!loading && query && results.length === 0" class="empty">
            <p class="empty-title">没有找到相关结果</p>
            <p class="empty-sub">试试其他关键词</p>
          </div>

          <!-- 加载中 -->
          <div v-else-if="loading" class="loading">
            <span class="spinner" />
            <p>搜索中...</p>
          </div>
        </div>

        <!-- 底部提示 -->
        <div class="search-footer">
          <span><kbd>Enter</kbd> 确认</span>
          <span><kbd>↑↓</kbd> 选择</span>
          <span><kbd>Esc</kbd> 关闭</span>
        </div>
      </div>
    </div>
  </transition>
</template>

<script setup>
import { ref, computed, nextTick, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { call } from '@/api/request'

const router = useRouter()

const STORAGE_KEY = 'mellow_search_history'
const scopes = [
  { key: 'all', label: '全部' },
  { key: 'article', label: '文章' },
  { key: 'page', label: '页面' },
  { key: 'tag', label: '标签' },
  { key: 'links', label: '友链' },
  { key: 'users', label: '用户' },
  { key: 'moments', label: '动态' }
]

const hotSearches = ['随记', '旅行', '博客', 'Vue', 'Node.js', '前端开发', '算法', '数据库']

const visible = ref(false)
const query = ref('')
const scope = ref('all')
const loading = ref(false)
const results = ref([])
const history = ref([])
const selected = ref(-1)
const inputRef = ref(null)
let debounceTimer = null
let keyHandler = null

const placeholderMap = {
  article: '搜索文章...',
  page: '搜索页面...',
  tag: '搜索标签...',
  links: '搜索友链...',
  users: '搜索用户...',
  moments: '搜索动态...'
}
const placeholder = computed(() => placeholderMap[scope.value] || '搜索文章、页面、标签、友链、用户或动态...')

const show = () => {
  visible.value = true
  query.value = ''
  results.value = []
  selected.value = -1
  scope.value = 'all'
  loadHistory()
  document.body.style.overflow = 'hidden'
  keyHandler = (e) => {
    if (!visible.value) return
    const t = e.target
    const isInput = t.tagName === 'INPUT' || t.tagName === 'TEXTAREA'
    if (e.key === 'Escape') {
      e.preventDefault()
      hide()
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      onArrow(-1)
    } else if (e.key === 'ArrowDown') {
      e.preventDefault()
      onArrow(1)
    } else if (e.key === 'Enter' && !isInput) {
      e.preventDefault()
      onEnter()
    }
  }
  window.addEventListener('keydown', keyHandler)
  nextTick(() => inputRef.value?.focus())
}

const hide = () => {
  visible.value = false
  query.value = ''
  results.value = []
  selected.value = -1
  clearTimeout(debounceTimer)
  document.body.style.overflow = ''
  if (keyHandler) {
    window.removeEventListener('keydown', keyHandler)
    keyHandler = null
  }
}

const clearQuery = () => {
  query.value = ''
  results.value = []
  selected.value = -1
  nextTick(() => inputRef.value?.focus())
}

const loadHistory = () => {
  try {
    history.value = JSON.parse(localStorage.getItem(STORAGE_KEY)) || []
  } catch {
    history.value = []
  }
}

const saveHistory = (k) => {
  if (!k) return
  history.value = history.value.filter((x) => x !== k)
  history.value.unshift(k)
  if (history.value.length > 10) history.value = history.value.slice(0, 10)
  localStorage.setItem(STORAGE_KEY, JSON.stringify(history.value))
}

const clearHistory = () => {
  history.value = []
  localStorage.removeItem(STORAGE_KEY)
}

const removeHistory = (i) => {
  history.value.splice(i, 1)
  localStorage.setItem(STORAGE_KEY, JSON.stringify(history.value))
}

const useQuery = (k) => {
  query.value = k
  selected.value = -1
  doSearch()
}

const changeScope = (k) => {
  scope.value = k
  selected.value = -1
  if (query.value.trim()) doSearch()
}

const onInput = () => {
  clearTimeout(debounceTimer)
  debounceTimer = setTimeout(() => {
    if (query.value.trim()) doSearch()
    else {
      results.value = []
      selected.value = -1
    }
  }, 300)
}

const onArrow = (dir) => {
  if (!results.value.length) return
  if (dir === -1) {
    selected.value = selected.value > 0 ? selected.value - 1 : results.value.length - 1
  } else {
    selected.value = selected.value < results.value.length - 1 ? selected.value + 1 : -1
  }
}

const onEnter = () => {
  if (selected.value >= 0 && selected.value < results.value.length) {
    goResult(results.value[selected.value])
  } else if (query.value.trim()) {
    doSearch()
  }
}

// 统一搜索：scope=all 时并行查询全部类型
async function doSearch() {
  const kw = query.value.trim()
  if (!kw) return
  loading.value = true
  results.value = []
  selected.value = -1
  try {
    let list = []
    if (scope.value === 'all') {
      const [articles, pages, tags, links, users, moments] = await Promise.all([
        searchType('article', kw),
        searchType('pages', kw),
        searchType('tags', kw),
        searchType('links', kw),
        searchType('users', kw),
        searchType('moments', kw)
      ])
      // 合并去重：文章/页面/用户/友链/动态在前，标签最多取 3 条
      const seen = new Set()
      const push = (items, max) => {
        ;(items || []).slice(0, max || items.length).forEach((it) => {
          if (!seen.has(it.id)) {
            seen.add(it.id)
            list.push(it)
          }
        })
      }
      push(articles)
      push(pages)
      push(users)
      push(links)
      push(moments)
      push(tags, 3)
    } else {
      const typeMap = { article: 'article', page: 'pages', tag: 'tags', links: 'links', users: 'users', moments: 'moments' }
      list = await searchType(typeMap[scope.value], kw)
    }
    results.value = list
    if (list.length) saveHistory(kw)
  } catch {
    // 静默失败
  } finally {
    loading.value = false
  }
}

async function searchType(type, kw) {
  try {
    const res = await call('search', type, {
      method: 'GET',
      params: { keyword: kw, page: 1, limit: 50 }
    })
    // INIS 列表返回结构：data 可能直接是数组，也可能包在 data.data 里
    const arr = res.data?.data || res.data
    if (!Array.isArray(arr)) return []
    return arr.map((it) => ({ ...it, _type: type === 'pages' ? 'page' : type === 'tags' ? 'tag' : type }))
  } catch {
    return []
  }
}

const typeName = (t) => ({ article: '文章', page: '页面', tag: '标签', links: '友链', users: '用户', moments: '动态' }[t] || '内容')

function title(r) {
  const t = r._type
  if (t === 'users' || t === 'links') return r.nickname || r.name || r.title || '未知'
  if (t === 'moments') return truncate(r.content, 24) || '动态'
  return r.title || r.name || '未知'
}

// 截断带 <mark> 高亮标签的文本，保留标签
function truncate(text, max = 100) {
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
  return out + '...'
}

function goResult(r) {
  hide()
  switch (r._type) {
    case 'article':
      if (r.id) router.push(`/archives/${r.id}`)
      break
    case 'page':
      if (r.key) router.push(`/${r.key}`)
      break
    case 'tag':
      if (r.id) router.push(`/tag/${r.id}`)
      break
    case 'links':
      if (r.url) window.open(r.url, '_blank')
      break
    case 'users':
      if (r.id) router.push(`/author/${r.id}`)
      break
    case 'moments':
      // Mellow 无动态详情路由，跳转动态列表页
      router.push('/moments')
      break
  }
}

onUnmounted(() => {
  clearTimeout(debounceTimer)
  document.body.style.overflow = ''
  if (keyHandler) {
    window.removeEventListener('keydown', keyHandler)
    keyHandler = null
  }
})

defineExpose({ show, hide })
</script>

<style scoped>
.search-overlay {
  position: fixed;
  inset: 0;
  background: rgba(30, 26, 18, 0.5);
  backdrop-filter: blur(4px);
  z-index: 1060;
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding: 10vh 16px 16px;
}
.search-dialog {
  width: 100%;
  max-width: 560px;
  max-height: 75vh;
  display: flex;
  flex-direction: column;
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-md);
  overflow: hidden;
}

.search-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 20px;
  border-bottom: 1px solid var(--border-soft);
  background: var(--bg-soft);
}
.search-title {
  font-size: 16px;
  font-weight: 600;
  color: var(--text);
}
.search-close {
  width: 30px;
  height: 30px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  color: var(--text-muted);
  transition: all 0.2s;
}
.search-close:hover {
  background: var(--border);
  color: var(--text);
  transform: rotate(90deg);
}

.search-input-wrap {
  padding: 16px 20px 12px;
}
.search-input-group {
  position: relative;
  display: flex;
  align-items: center;
}
.search-icon {
  position: absolute;
  left: 12px;
  color: var(--text-muted);
}
.search-input {
  width: 100%;
  padding: 10px 36px 10px 38px;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background: var(--bg-muted);
  color: var(--text);
  font-size: 14px;
  transition: border-color 0.2s, box-shadow 0.2s;
}
.search-input:focus {
  border-color: var(--primary);
  box-shadow: 0 0 0 3px rgba(184, 153, 104, 0.15);
  background: var(--bg-card);
}
.search-clear {
  position: absolute;
  right: 8px;
  width: 26px;
  height: 26px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  color: var(--text-muted);
}
.search-clear:hover {
  background: var(--border);
  color: var(--text);
}

.search-scopes {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 12px;
}
.scope-btn {
  padding: 5px 12px;
  font-size: 12px;
  border: 1px solid var(--border);
  border-radius: 999px;
  color: var(--text-soft);
  background: transparent;
  transition: all 0.15s;
}
.scope-btn:hover {
  color: var(--primary);
  border-color: var(--primary);
}
.scope-btn.active {
  background: var(--primary);
  border-color: var(--primary);
  color: #fff;
  font-weight: 500;
}

.search-body {
  flex: 1;
  overflow-y: auto;
  padding: 4px 20px 12px;
}
.section {
  padding: 8px 0;
}
.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 13px;
  font-weight: 600;
  color: var(--text-muted);
  margin-bottom: 10px;
}
.clear-history {
  font-size: 12px;
  color: var(--text-muted);
}
.clear-history:hover {
  color: var(--danger);
}
.search-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.search-tag {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 12px;
  font-size: 13px;
  border: 1px solid var(--border);
  border-radius: 999px;
  color: var(--text-soft);
  background: var(--bg-soft);
  cursor: pointer;
  transition: all 0.15s;
}
.search-tag a {
  color: inherit;
}
.search-tag:hover {
  color: var(--primary);
  border-color: var(--primary);
}
.tag-remove {
  font-size: 13px;
  line-height: 1;
  color: var(--text-light);
}
.tag-remove:hover {
  color: var(--danger);
}

.results {
  display: flex;
  flex-direction: column;
}
.result-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 8px;
  border-radius: var(--radius-sm);
  text-align: left;
  transition: background 0.15s;
}
.result-item:hover,
.result-item.selected {
  background: var(--bg-muted);
}
.result-type {
  flex-shrink: 0;
  font-size: 11px;
  padding: 2px 8px;
  border-radius: 3px;
  color: #fff;
}
.type-article { background: var(--primary); }
.type-page { background: #8a8a82; }
.type-tag { background: #5b9bd5; }
.type-links { background: #6aa84f; }
.type-users { background: #c98a2d; }
.type-moments { background: #7f6dbd; }
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
  background: rgba(184, 153, 104, 0.35);
  color: inherit;
  padding: 0 1px;
  border-radius: 2px;
}
.result-arrow {
  flex-shrink: 0;
  color: var(--text-light);
}

.empty,
.loading {
  padding: 48px 0;
  text-align: center;
  color: var(--text-muted);
}
.empty-title {
  font-size: 15px;
  color: var(--text-soft);
  margin-bottom: 4px;
}
.empty-sub {
  font-size: 13px;
}
.loading p {
  margin-top: 8px;
  font-size: 13px;
}

.search-footer {
  display: flex;
  gap: 16px;
  padding: 10px 20px;
  border-top: 1px solid var(--border-soft);
  background: var(--bg-soft);
  font-size: 12px;
  color: var(--text-muted);
}
kbd {
  padding: 1px 6px;
  border: 1px solid var(--border);
  border-bottom-width: 2px;
  border-radius: 3px;
  background: var(--bg-card);
  font-family: var(--font-mono);
  font-size: 11px;
}

.search-modal-enter-active,
.search-modal-leave-active {
  transition: opacity 0.2s ease;
}
.search-modal-enter-from,
.search-modal-leave-to {
  opacity: 0;
}
.search-modal-enter-active .search-dialog,
.search-modal-leave-active .search-dialog {
  transition: transform 0.2s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.2s ease;
}
.search-modal-enter-from .search-dialog,
.search-modal-leave-to .search-dialog {
  transform: translateY(-16px) scale(0.98);
  opacity: 0;
}
</style>
