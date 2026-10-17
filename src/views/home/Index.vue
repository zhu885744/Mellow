<template>
  <div class="home">
    <!-- 公告 -->
    <div
      v-if="placards.length"
      class="placard-card"
      @mouseenter="pause"
      @mouseleave="resume"
    >
      <div class="placard-head">
        <i class="bi bi-megaphone"></i>
        <span class="placard-title">公告</span>
      </div>
      <div class="placard-carousel">
        <transition name="placard-fade" mode="out-in">
          <span
            :key="current.id"
            class="placard-link"
            @click="openPlacard(current)"
          >
            <span class="placard-dot" :style="{ background: placardTypeColor(current.type) }" />
            <span class="placard-name">{{ current.title }}</span>
            <span
              v-if="current.content"
              class="placard-content"
              v-html="current.content"
            />
          </span>
        </transition>
        <div v-if="placards.length > 1" class="placard-dots">
          <button
            v-for="(p, i) in placards"
            :key="p.id"
            class="placard-dot-btn"
            :class="{ active: i === index }"
            @click="goTo(i)"
          />
        </div>
      </div>
    </div>

    <!-- 发布动态：入口条，点击以弹窗形式编辑发布（未登录时整条即登录入口） -->
    <button v-if="userStore.isLogged" type="button" class="compose" @click="composeOpen = true">
      <img class="compose__avatar" :src="composeAvatar" :alt="composeName" />
      <span class="compose__placeholder">分享此刻的想法…</span>
      <span class="btn btn-primary btn-sm">发布动态</span>
    </button>

    <RouterLink
      v-else
      :to="{ name: 'login', query: { redirect: $route.fullPath } }"
      class="compose compose--guest"
    >
      <i class="bi bi-person-circle compose__guest-icon" aria-hidden="true" />
      <span class="compose__guest-text">登录后即可发布动态、参与讨论</span>
      <span class="btn btn-primary btn-sm">去登录</span>
    </RouterLink>

    <!-- 发布弹窗：正文 / 图片 / 提交都在弹窗里（见 components/MomentComposeDialog.vue） -->
    <MomentComposeDialog v-model:visible="composeOpen" @published="reload" />

    <!-- 发现：文章与动态按时间混排 -->
    <SectionTitle title="发现">
      <template #extra>
        <div class="feed-filter" role="tablist" aria-label="内容类型">
          <button
            v-for="item in FILTERS"
            :key="item.key"
            type="button"
            role="tab"
            class="feed-filter__item"
            :class="{ active: filter === item.key }"
            :aria-selected="filter === item.key"
            @click="switchFilter(item.key)"
          >
            {{ item.label }}
          </button>
        </div>
      </template>
    </SectionTitle>

    <p class="feed-summary">{{ summaryText }}</p>

    <div class="feed">
      <!-- 首屏骨架 -->
      <template v-if="loading && !items.length">
        <ArticleSkeleton v-for="i in 3" :key="'sk-' + i" :cover="i % 2 === 1" />
      </template>

      <!-- 混排列表：文章与动态都用动态卡片风格（文章显示正文片段 + 查看更多） -->
      <template v-for="item in items" :key="item.key">
        <ArticleFeedItem
          v-if="item.type === 'article'"
          :article="item.data"
        />
        <MomentItem
          v-else
          :moment="item.data"
          @delete="onMomentDelete"
          @refresh="reload"
        />
      </template>

      <EmptyState
        v-if="!loading && !items.length"
        icon="🔍"
        :text="emptyText"
      />

      <!-- 触底自动加载的哨兵（列表为空时不渲染） -->
      <div v-if="items.length" ref="sentinel" class="feed-foot">
        <button
          v-if="hasMore"
          type="button"
          class="btn btn-sm"
          :disabled="loading"
          @click="loadMore"
        >
          {{ loading ? '加载中…' : '加载更多' }}
        </button>
        <span v-else class="feed-foot__end">— 到底啦 —</span>
      </div>
    </div>

    <!-- 公告详情弹窗 -->
    <Teleport to="body">
      <transition name="placard-modal">
        <div v-if="activePlacard" class="placard-mask" @click.self="closePlacard">
          <div class="placard-dialog">
            <div class="placard-dialog-head">
              <!-- 类型小标签：文案 + 对应配色（与后台列表、轮播圆点同源） -->
              <span class="placard-dialog-tag" :style="placardTypeStyle(activePlacard.type)">
                {{ placardTypeLabel(activePlacard.type) }}
              </span>
              <h3 class="placard-dialog-title">{{ activePlacard.title }}</h3>
              <button class="placard-dialog-close" @click="closePlacard" aria-label="关闭">
                <i class="bi bi-x-lg"></i>
              </button>
            </div>
            <div class="placard-dialog-body" v-html="activePlacard.content" />
            <div class="placard-dialog-foot">
              <span class="placard-dialog-date">{{ formatDate(activePlacard.create_time) }}</span>
              <a
                v-if="activePlacard.url"
                :href="activePlacard.url"
                :target="placardLinkTarget(activePlacard)"
                :rel="placardLinkTarget(activePlacard) === '_blank' ? 'noopener' : null"
                class="btn btn-primary btn-sm"
                @click="onPlacardLinkClick($event, activePlacard)"
              >查看原文</a>
            </div>
          </div>
        </div>
      </transition>
    </Teleport>
  </div>
</template>

<script setup>
import { ref, reactive, computed, watch, onMounted, onBeforeUnmount } from 'vue'
import { useRouter } from 'vue-router'
import SectionTitle from '@/components/SectionTitle.vue'
import ArticleFeedItem from '@/components/ArticleFeedItem.vue'
import ArticleSkeleton from '@/components/ArticleSkeleton.vue'
import MomentItem from '@/components/MomentItem.vue'
import EmptyState from '@/components/EmptyState.vue'
import MomentComposeDialog from '@/components/MomentComposeDialog.vue'
import { useUserStore } from '@/stores/user'
import { listArticles } from '@/api/article'
import { listMoments, removeMoment } from '@/api/moments'
import { getFullUrl } from '@/utils/runtimeConfig'
import { call } from '@/api/request'
import { placardTypeLabel, placardTypeColor, placardTypeStyle } from '@/utils/placard'
import { formatDate } from '@/utils/time'
import { toast } from '@/utils/toast'

const loading = ref(false)
const placards = ref([])
const index = ref(0)
let timer = null

/* ---------------- 首页发布动态（入口条 + 弹窗） ---------------- */

// 发布逻辑全在弹窗组件里（components/MomentComposeDialog.vue），
// 首页只负责：入口条上显示头像/昵称、控制弹窗显隐、发布成功后刷新「发现」列表。
const userStore = useUserStore()
const composeOpen = ref(false)
const composeAvatar = computed(() => getFullUrl(userStore.user?.avatar || ''))
const composeName = computed(() => userStore.user?.nickname || '我')

// ============ 发现页：文章与动态混排 ============
const FILTERS = [
  { key: 'all', label: '全部' },
  { key: 'article', label: '文章' },
  { key: 'moment', label: '动态' }
]
// 每次向每个来源各取一页，合并后按时间重排（博客这个量级足够，也不用后端改接口）
const PAGE_SIZE = 6

const filter = ref('all')
// 扁平化的混排列表：{ key, type, data, time, top }
const items = ref([])
const hasMore = ref(false)
const totals = reactive({ article: 0, moment: 0 })
// 两个来源各自的下一页页码
const cursors = reactive({ article: 1, moment: 1 })
const sentinel = ref(null)

const current = computed(() => placards.value[index.value] || {})

const activePlacard = ref(null)
function openPlacard(p) {
  if (!p || !p.id) return
  activePlacard.value = p
  pause()
}
function closePlacard() {
  activePlacard.value = null
  resume()
}
function typeLabel(type) {
  return { notice: '公告', warning: '警告', info: '提示' }[type] || '公告'
}

const router = useRouter()

// 公告原文跳转方式：仅支持 _blank（新窗口）/ _self（当前窗口），其他值回退为新窗口
function placardLinkTarget(p) {
  return p?.target === '_self' ? '_self' : '_blank'
}

// _self 且为站内路径时走路由跳转，避免整页刷新；外链交由浏览器默认行为处理
function onPlacardLinkClick(e, p) {
  if (placardLinkTarget(p) !== '_self') return
  const url = p?.url || ''
  // 排除协议相对地址（//example.com）与带协议的绝对地址
  if (!url.startsWith('/') || url.startsWith('//')) return
  e.preventDefault()
  router.push(url)
}

function next() {
  if (placards.value.length > 1) {
    index.value = (index.value + 1) % placards.value.length
  }
}
function goTo(i) {
  index.value = i
  restart()
}
function start() {
  stop()
  timer = setInterval(next, 10000)
}
function stop() {
  if (timer) clearInterval(timer)
  timer = null
}
function restart() {
  if (placards.value.length > 1) start()
}
function pause() {
  stop()
}
function resume() {
  restart()
}

async function loadPlacards() {
  try {
    const res = await call('placard', 'all', {
      method: 'GET',
      params: { page: 1, limit: 5, order: 'create_time desc' }
    })
    placards.value = res?.data?.data || []
    index.value = 0
    restart()
  } catch {
    placards.value = []
  }
}

// ============ 发现页数据 ============
const summaryText = computed(() => {
  if (filter.value === 'article') return `共 ${totals.article} 篇文章`
  if (filter.value === 'moment') return `共 ${totals.moment} 条动态`
  return `文章 ${totals.article} 篇 · 动态 ${totals.moment} 条，按时间混排`
})

const emptyText = computed(() => {
  if (filter.value === 'article') return '还没有文章'
  if (filter.value === 'moment') return '还没有动态'
  return '还没有内容'
})

// 当前筛选下要拉取的来源
function activeSources() {
  if (filter.value === 'article') return ['article']
  if (filter.value === 'moment') return ['moment']
  return ['article', 'moment']
}

// 拉取某一类的一页（两类接口的返回结构一致：data.data 列表 + data.count 总数）
async function fetchSource(type, page) {
  if (type === 'article') {
    const res = await listArticles({
      page,
      limit: PAGE_SIZE,
      where: { audit: 1, status: 1 },
      order: 'top desc, publish_time desc'
    })
    return { list: res.data?.data || [], count: Number(res.data?.count) || 0 }
  }

  const res = await listMoments({ page, limit: PAGE_SIZE })
  return { list: res.data?.data || [], count: Number(res.data?.count) || 0 }
}

/**
 * 加载混排数据
 * reset=true 用于首屏与切换筛选（重置两个来源的游标与列表）
 */
async function load({ reset = false } = {}) {
  if (loading.value) return
  loading.value = true

  try {
    if (reset) {
      cursors.article = 1
      cursors.moment = 1
      totals.article = 0
      totals.moment = 0
      items.value = []
    }

    // 只继续拉「还没拉完」的来源，避免某一类取空后每次都白发一次请求
    const sources = activeSources().filter((type) => {
      const loaded = items.value.filter((it) => it.type === type).length
      return !totals[type] || loaded < totals[type]
    })

    const results = await Promise.all(
      sources.map(async (type) => {
        const page = cursors[type]
        try {
          const data = await fetchSource(type, page)
          cursors[type] = page + 1
          totals[type] = data.count
          return { type, list: data.list }
        } catch {
          // 单个来源失败不影响另一类展示
          return { type, list: [] }
        }
      })
    )

    const seen = new Set(items.value.map((it) => it.key))
    const incoming = []

    results.forEach((res) => {
      const prefix = res.type === 'article' ? 'a' : 'm'
      res.list.forEach((row) => {
        const key = `${prefix}:${row.id}`
        if (seen.has(key)) return
        seen.add(key)
        incoming.push({
          key,
          type: res.type,
          data: row,
          // 文章按发布时间、动态按创建时间参与排序；置顶统一浮到最前
          time: Number(row.publish_time || row.create_time) || 0,
          top: Number(row.top) || 0
        })
      })
    })

    items.value = items.value.concat(incoming).sort((a, b) => b.top - a.top || b.time - a.time)

    // 还有没有更多：任一来源「已加载数量 < 总数」；本批一条新的都没有就直接收尾，
    // 避免服务端 count 与实际数据不一致时无限触底
    if (!incoming.length) {
      hasMore.value = false
    } else {
      hasMore.value = activeSources().some((type) => {
        const loaded = items.value.filter((it) => it.type === type).length
        return loaded < totals[type]
      })
    }
  } finally {
    loading.value = false
  }
}

function loadMore() {
  if (hasMore.value) load()
}

function reload() {
  load({ reset: true })
}

function switchFilter(key) {
  if (filter.value === key) return
  filter.value = key
  reload()
}

// 动态的删除（管理员或有权限的作者才会看到按钮，见 MomentItem 的 canManage）
async function onMomentDelete(m) {
  if (!confirm('确定要删除这条动态吗？')) return
  try {
    await removeMoment(String(m.id))
    toast.success('删除成功')
    // 本地移除即可，不整页重排；总数同步减一
    items.value = items.value.filter((it) => !(it.type === 'moment' && it.data.id === m.id))
    totals.moment = Math.max(0, totals.moment - 1)
  } catch {}
}

// 触底自动加载：哨兵元素会随列表清空而重建，所以跟着 watch 重新 observe
let observer = null
watch(sentinel, (el) => {
  if (!observer) return
  observer.disconnect()
  if (el) observer.observe(el)
})

onMounted(() => {
  loadPlacards()
  reload()

  if (typeof IntersectionObserver !== 'undefined') {
    observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) loadMore()
      },
      { rootMargin: '240px 0px' }
    )
  }
})

onBeforeUnmount(() => {
  stop()
  if (observer) observer.disconnect()
  observer = null
})
</script>

<style scoped>
.home {
  padding-bottom: 32px;
}

/* 公告模块 */
.placard-card {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 14px 16px;
  margin-bottom: 24px;
}
.placard-head {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 14px;
  font-weight: 600;
  color: var(--text);
  margin-bottom: 10px;
}
.placard-head .bi {
  color: var(--primary);
}
.placard-carousel {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  min-height: 22px;
}
.placard-link {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  flex: 1;
  min-width: 0;
  font-size: 13px;
  color: var(--text-soft);
  text-decoration: none;
  line-height: 1.6;
}
.placard-link:hover {
  color: var(--primary);
}
/* 类型圆点：颜色由 utils/placard.js 的行内样式给出（避免各页面配色漂移） */
.placard-dot {
  flex-shrink: 0;
  width: 7px;
  height: 7px;
  border-radius: 50%;
  margin-top: 6px;
  background: var(--primary);
}
.placard-name {
  font-weight: 500;
  flex-shrink: 0;
}
.placard-content {
  color: var(--text-muted);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.placard-content :deep(p) {
  display: inline;
  margin: 0;
}
.placard-dots {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  gap: 5px;
  margin-left: 4px;
}
.placard-dot-btn {
  width: 6px;
  height: 6px;
  padding: 0;
  border: none;
  border-radius: 50%;
  background: var(--text-muted);
  opacity: 0.4;
  cursor: pointer;
  transition: opacity 0.2s, background 0.2s;
}
.placard-dot-btn.active {
  opacity: 1;
  background: var(--primary);
}
/* 淡入淡出轮播动画 */
.placard-fade-enter-active,
.placard-fade-leave-active {
  transition: opacity 0.4s ease;
}
.placard-fade-enter-from,
.placard-fade-leave-to {
  opacity: 0;
}

/* ---------- 发现页 ---------- */
/* 类型筛选：胶囊分段控件 */
.feed-filter {
  display: inline-flex;
  gap: 2px;
  padding: 2px;
  border-radius: 999px;
  background: var(--bg-muted);
}
.feed-filter__item {
  padding: 3px 12px;
  border: none;
  border-radius: 999px;
  background: transparent;
  color: var(--text-muted);
  font-size: 12px;
  line-height: 1.7;
  cursor: pointer;
  transition: color 0.15s, background 0.15s;
}
.feed-filter__item:hover {
  color: var(--text);
}
.feed-filter__item.active {
  color: #fff;
  background: var(--primary);
}

.feed-summary {
  margin: -6px 0 14px;
  font-size: 12px;
  color: var(--text-muted);
}

.feed {
  display: flex;
  flex-direction: column;
}

/* 骨架屏仍是「通栏列表行」，这里覆盖成卡片，与文章 / 动态卡片对齐 */
.feed :deep(div.sk-article) {
  padding: 20px;
  margin-bottom: 16px;
  border-bottom: none;
  background: var(--bg-card);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-sm);
}
/* MomentItem 自带的描边卡片，统一成同一套观感（描边改透明、补同款阴影） */
.feed :deep(.moment-card) {
  border-color: transparent;
  box-shadow: var(--shadow-sm);
}

.feed-foot {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 12px 0 4px;
}
.feed-foot__end {
  font-size: 12px;
  color: var(--text-light, var(--text-muted));
}

/* 公告详情弹窗 */
.placard-mask {
  position: fixed;
  inset: 0;
  z-index: 1000;
  background: rgba(0, 0, 0, 0.45);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
}
.placard-dialog {
  width: 100%;
  max-width: 520px;
  max-height: 80vh;
  display: flex;
  flex-direction: column;
  background: var(--bg-card);
  border-radius: var(--radius);
  box-shadow: 0 16px 48px rgba(0, 0, 0, 0.25);
  overflow: hidden;
}
.placard-dialog-head {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 16px 18px 12px;
  border-bottom: 1px solid var(--border);
}
/* 类型小标签：文字色 + 同色淡底由 utils/placard.js 的行内样式给出 */
.placard-dialog-tag {
  flex-shrink: 0;
  margin-top: 2px;
  padding: 1px 8px;
  font-size: 11px;
  line-height: 1.6;
  border-radius: 999px;
  white-space: nowrap;
}
.placard-dialog-title {
  flex: 1;
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: var(--text);
  line-height: 1.4;
}
.placard-dialog-close {
  flex-shrink: 0;
  border: none;
  background: none;
  color: var(--text-muted);
  font-size: 15px;
  cursor: pointer;
  padding: 2px 4px;
}
.placard-dialog-close:hover {
  color: var(--text);
}
.placard-dialog-body {
  flex: 1;
  overflow-y: auto;
  padding: 16px 18px;
  font-size: 14px;
  line-height: 1.8;
  color: var(--text-soft);
  white-space: pre-line;
  word-break: break-word;
}
.placard-dialog-body :deep(img) {
  max-width: 100%;
  border-radius: 6px;
}
.placard-dialog-foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 12px 18px;
  border-top: 1px solid var(--border);
}
.placard-dialog-date {
  font-size: 12px;
  color: var(--text-muted);
}
.placard-modal-enter-active,
.placard-modal-leave-active {
  transition: opacity 0.25s ease;
}
.placard-modal-enter-from,
.placard-modal-leave-to {
  opacity: 0;
}
.placard-modal-enter-active .placard-dialog,
.placard-modal-leave-active .placard-dialog {
  transition: transform 0.25s ease;
}
.placard-modal-enter-from .placard-dialog,
.placard-modal-leave-to .placard-dialog {
  transform: translateY(12px) scale(0.98);
}

/* ---------- 首页发布动态：入口条（点击弹窗），间距与公告一致 24px ---------- */
.compose {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  padding: 12px 16px;
  margin-bottom: 24px;
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  color: var(--text-muted);
  font-family: inherit;
  font-size: 14px;
  text-align: left;
  cursor: pointer;
  transition: border-color 0.2s;
}
.compose:hover {
  border-color: var(--primary);
}
.compose__avatar {
  flex-shrink: 0;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  object-fit: cover;
  background: var(--bg-muted);
}
.compose__placeholder {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
/* 未登录：整条即登录入口 */
.compose--guest {
  color: var(--text-muted);
  text-decoration: none;
}
.compose__guest-icon {
  font-size: 24px;
  color: var(--text-light, var(--text-muted));
}
.compose__guest-text {
  flex: 1;
  min-width: 0;
}
@media (max-width: 640px) {
  .compose {
    padding: 10px 12px;
    margin-bottom: 18px;
    gap: 10px;
  }
}
</style>
