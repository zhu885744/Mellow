<template>
  <div>
    <SectionTitle title="关注流">
      <template #extra>
        <span class="text-muted">{{ currentTab.hint }}</span>
      </template>
    </SectionTitle>

    <!--
      三条流（后端 app/api/controller/feed.go）：
        follow    我关注的人发布的动态，时间倒序
        recommend 近 30 天「我没关注过」的内容，按热度排序
        hot       近 30 天全站公开动态，按热度排序
      均为公开内容（audit=1 且 status=1），草稿 / 待审核不会出现。
    -->
    <div class="feed-tabs" role="tablist">
      <button
        v-for="tab in TABS"
        :key="tab.key"
        type="button"
        role="tab"
        class="feed-tab"
        :class="{ 'is-active': type === tab.key }"
        :aria-selected="type === tab.key"
        :title="tab.hint"
        @click="switchType(tab.key)"
      >
        <i :class="tab.icon" aria-hidden="true" />
        <span>{{ tab.name }}</span>
      </button>
    </div>

    <div v-if="loading" class="loading">
      <span class="spinner" /> 加载中...
    </div>

    <MomentItem
      v-for="item in list"
      :key="item.id"
      :moment="item"
      @delete="reload"
      @refresh="reload"
    />

    <template v-if="!loading && !list.length">
      <EmptyState :icon="emptyState.icon" :text="emptyState.text" />
      <p v-if="emptyState.action" class="feed-empty-action">
        <RouterLink :to="emptyState.action.to" class="btn btn-primary btn-sm">
          {{ emptyState.action.text }}
        </RouterLink>
      </p>
    </template>

    <Pagination
      v-if="!loading && total > pageSize"
      :current="page"
      :total="total"
      :page-size="pageSize"
      @update:current="onPage"
    />
  </div>
</template>

<script setup>
/**
 * 聚合流页面（关注 / 推荐 / 热门）
 *
 * 隐私与安全约定（与后端一致，改动时两边都要看）：
 * - 本页只展示**公开**动态，不提供查看草稿 / 待审核内容的入口（那是「我的动态」的职责）
 * - 接口必须登录，未登录由路由守卫拦下，后端也会 401
 * - 分页大小固定 15（后端上限 20）、页码不得超过后端 feedMaxPage，
 *   以避免「深翻页批量抓取」——需要更多内容请用搜索 / 动态页，不要在这里放大 limit
 */
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import SectionTitle from '@/components/SectionTitle.vue'
import MomentItem from '@/components/MomentItem.vue'
import Pagination from '@/components/Pagination.vue'
import EmptyState from '@/components/EmptyState.vue'
import { getFeed } from '@/api/feed'

const TABS = [
  { key: 'follow', name: '关注', icon: 'bi bi-people', hint: '只看我关注的人发布的动态' },
  { key: 'recommend', name: '推荐', icon: 'bi bi-stars', hint: '近 30 天我还没关注过的好内容' },
  { key: 'hot', name: '热门', icon: 'bi bi-fire', hint: '近 30 天热门：点赞 ×1 + 评论 ×2 + 收藏 ×3' }
]

const route = useRoute()
const router = useRouter()

/** 支持 /feed?type=hot 直达（分享 / 收藏某个流） */
function pickType(value) {
  const key = String(value || '')
  return TABS.some((tab) => tab.key === key) ? key : 'follow'
}

const type = ref(pickType(route.query.type))
const list = ref([])
const total = ref(0)
const loading = ref(false)
const page = ref(1)
const pageSize = 15

const currentTab = computed(() => TABS.find((tab) => tab.key === type.value) || TABS[0])

const emptyState = computed(() => {
  // 关注流为空时，先引导去关注人；有内容源却没有动态，才是真的空
  if (type.value === 'follow') {
    return {
      icon: '👀',
      text: '关注流还没有内容',
      action: { text: '去动态页逛逛', to: '/moments' }
    }
  }
  if (type.value === 'recommend') {
    return { icon: '✨', text: '暂时没有可推荐的内容', action: null }
  }
  return { icon: '🔥', text: '近 30 天还没有热门动态', action: null }
})

async function load() {
  loading.value = true
  try {
    const res = await getFeed(type.value, { page: page.value, limit: pageSize })
    list.value = res.data?.data || []
    total.value = Number(res.data?.count) || 0
  } catch {
    // 拦截器已提示（401 会引导登录）；这里给空态而不是让页面卡住
    list.value = []
    total.value = 0
  } finally {
    loading.value = false
  }
}

function reload() {
  load()
}

function switchType(key) {
  if (type.value === key) return
  type.value = key
  page.value = 1
  // 把流类型写进地址栏，方便刷新 / 分享保持当前流
  router.replace({ query: { ...route.query, type: key } })
  load()
}

function onPage(target) {
  page.value = target
  load()
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

onMounted(load)
</script>

<style scoped>
/* 基础样式：.loading 不是全局样式（各页面自带一份，见 views/moments/Index.vue） */
.loading {
  padding: 40px;
  text-align: center;
  color: var(--text-muted);
}

/* 三分段控件：样式与后台列表的状态标签保持同一套视觉语言 */
.feed-tabs {
  display: flex;
  gap: 4px;
  padding: 4px;
  margin-bottom: 12px;
  background: var(--bg-muted);
  border-radius: var(--radius-md);
}
.feed-tab {
  flex: 1;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 8px 10px;
  border: none;
  border-radius: var(--radius-sm);
  background: transparent;
  color: var(--text-soft);
  font-family: inherit;
  font-size: 14px;
  cursor: pointer;
  transition: background 0.16s, color 0.16s;
}
.feed-tab:hover {
  color: var(--primary);
}
.feed-tab.is-active {
  background: var(--bg-card);
  color: var(--primary);
  font-weight: 600;
  box-shadow: var(--shadow-sm);
}
.feed-tab:focus-visible {
  outline: 2px solid var(--primary-soft);
  outline-offset: -2px;
}
.feed-empty-action {
  text-align: center;
  margin-top: 12px;
}

/* PC：流切换不必拉满整行，靠左对齐更像导航 */
@media (min-width: 992px) {
  .feed-tabs {
    max-width: 420px;
  }
}

@media (max-width: 640px) {
  .feed-tab {
    font-size: 13px;
    padding: 7px 6px;
  }
}
</style>
