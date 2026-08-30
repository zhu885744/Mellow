<template>
  <div class="card card-pad">
    <header class="ov-head">
      <div>
        <h2 class="block-title">创作中心</h2>
        <p class="block-desc">管理你的文章与动态，随时继续未完成的创作</p>
      </div>
    </header>

    <!-- 统计 -->
    <div class="stat-grid">
      <div class="stat-card">
        <span class="stat-num">{{ stats.articleTotal }}</span>
        <span class="stat-label">文章总数</span>
      </div>
      <div class="stat-card">
        <span class="stat-num">{{ stats.articleDraft }}</span>
        <span class="stat-label">文章草稿</span>
      </div>
      <div class="stat-card" :class="{ 'is-warn': stats.articlePending > 0 }">
        <span class="stat-num">{{ stats.articlePending }}</span>
        <span class="stat-label">待审核文章</span>
      </div>
      <div class="stat-card">
        <span class="stat-num">{{ stats.momentTotal }}</span>
        <span class="stat-label">动态总数</span>
      </div>
      <div class="stat-card" :class="{ 'is-warn': stats.momentPending > 0 }">
        <span class="stat-num">{{ stats.momentPending }}</span>
        <span class="stat-label">待审核动态</span>
      </div>
    </div>

    <p v-if="stats.articlePending + stats.momentPending > 0" class="audit-tip">
      <i class="bi bi-info-circle" /> 有内容正在等待审核，审核通过后会公开显示。
    </p>

    <!-- 功能卡片 -->
    <div class="entry-grid">
      <router-link to="/manage/posts/write" class="entry-card entry-primary">
        <span class="entry-ico"><i class="bi bi-pencil-square" /></span>
        <span class="entry-body">
          <span class="entry-title">写文章</span>
          <span class="entry-desc">撰写新文章，支持 Markdown 与富文本</span>
        </span>
        <i class="bi bi-chevron-right entry-arrow" />
      </router-link>

      <router-link to="/manage/posts" class="entry-card">
        <span class="entry-ico"><i class="bi bi-file-earmark-text" /></span>
        <span class="entry-body">
          <span class="entry-title">我的文章</span>
          <span class="entry-desc">管理已发布文章与草稿，支持搜索与筛选</span>
        </span>
        <i class="bi bi-chevron-right entry-arrow" />
      </router-link>

      <router-link to="/manage/moments" class="entry-card">
        <span class="entry-ico"><i class="bi bi-chat-square-dots" /></span>
        <span class="entry-body">
          <span class="entry-title">我的动态</span>
          <span class="entry-desc">管理发布的动态，可编辑内容与配图</span>
        </span>
        <i class="bi bi-chevron-right entry-arrow" />
      </router-link>

      <router-link to="/moments" class="entry-card">
        <span class="entry-ico"><i class="bi bi-stars" /></span>
        <span class="entry-body">
          <span class="entry-title">发布动态</span>
          <span class="entry-desc">前往动态广场，随手记录此刻的想法</span>
        </span>
        <i class="bi bi-chevron-right entry-arrow" />
      </router-link>
    </div>

    <!-- 最近创作 -->
    <section v-if="recent.length" class="recent">
      <h3 class="recent-title">最近创作</h3>
      <ul class="recent-list">
        <li v-for="item in recent" :key="`a-${item.id}`" class="recent-row">
          <router-link :to="`/manage/posts/edit/${item.id}`" class="recent-link">
            {{ item.title || '无标题' }}
          </router-link>
          <span class="post-status" :class="item.status === 1 ? 'is-pub' : 'is-draft'">
            {{ item.status === 1 ? '已发布' : '草稿' }}
          </span>
          <span class="recent-time">{{ fromNow(item.create_time) }}</span>
        </li>
      </ul>
    </section>
  </div>
</template>

<script setup>
import { reactive, ref, computed, onMounted } from 'vue'
import { getMyArticles, countMyArticles } from '@/api/article'
import { listMoments } from '@/api/moments'
import { useUserStore } from '@/stores/user'
import { storeToRefs } from 'pinia'
import { fromNow } from '@/utils/time'

const userStore = useUserStore()
const { user } = storeToRefs(userStore)
const uid = computed(() => user.value?.id || 0)

const stats = reactive({
  articleTotal: 0,
  articleDraft: 0,
  articlePending: 0,
  momentTotal: 0,
  momentPending: 0
})

const recent = ref([])

// 安全取数字：count 接口返回 res.data，也可能是 { data: n }
function toNum(res) {
  const d = res?.data
  if (typeof d === 'number') return d
  return Number(d?.data ?? d?.count ?? 0) || 0
}

async function loadStats() {
  if (!uid.value) return

  const where = JSON.stringify({ uid: uid.value })

  // 文章：总数 / 草稿 / 待审核
  const tasks = [
    countMyArticles(uid.value).then((r) => { stats.articleTotal = toNum(r) }).catch(() => {}),
    countMyArticles(uid.value, { status: 0 }).then((r) => { stats.articleDraft = toNum(r) }).catch(() => {}),
    countMyArticles(uid.value, { audit: 0 }).then((r) => { stats.articlePending = toNum(r) }).catch(() => {}),
    // 动态：总数 / 待审核（查询自己的动态不受 audit 过滤影响）
    listMoments({ limit: 1, where }).then((r) => { stats.momentTotal = Number(r?.data?.count) || 0 }).catch(() => {}),
    listMoments({ limit: 1, where: JSON.stringify({ uid: uid.value, audit: 0 }) })
      .then((r) => { stats.momentPending = Number(r?.data?.count) || 0 }).catch(() => {})
  ]

  await Promise.all(tasks)
}

async function loadRecent() {
  if (!uid.value) return
  try {
    const res = await getMyArticles(uid.value, { page: 1, limit: 5 })
    recent.value = res?.data?.data || []
  } catch {
    recent.value = []
  }
}

onMounted(() => {
  loadStats()
  loadRecent()
})
</script>

<style scoped>
.ov-head {
  margin-bottom: 18px;
}
.block-title {
  font-size: 16px;
  font-weight: 600;
  margin: 0;
}
.block-desc {
  margin: 4px 0 0;
  font-size: 12px;
  color: var(--text-muted);
}

.stat-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(110px, 1fr));
  gap: 10px;
  margin-bottom: 16px;
}
.stat-card {
  padding: 14px 12px;
  border-radius: var(--radius);
  background: var(--bg-muted);
  text-align: center;
  transition: background 0.2s;
}
.stat-card.is-warn {
  background: rgba(212, 161, 72, 0.14);
}
.stat-num {
  display: block;
  font-size: 20px;
  font-weight: 600;
  color: var(--text);
  line-height: 1.2;
}
.stat-label {
  display: block;
  margin-top: 4px;
  font-size: 12px;
  color: var(--text-muted);
}
.stat-card.is-warn .stat-num {
  color: var(--warning);
}

.audit-tip {
  margin: 0 0 16px;
  padding: 8px 12px;
  font-size: 12px;
  color: var(--warning);
  background: rgba(212, 161, 72, 0.1);
  border-radius: var(--radius-sm);
}

.entry-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  gap: 12px;
}
.entry-card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 16px;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background: var(--bg-card);
  transition: all 0.2s;
}
.entry-card:hover {
  border-color: var(--primary);
  background: rgba(184, 153, 104, 0.06);
  transform: translateY(-2px);
  box-shadow: var(--shadow-sm);
}
.entry-primary {
  border-color: rgba(184, 153, 104, 0.45);
  background: rgba(184, 153, 104, 0.08);
}
.entry-ico {
  width: 38px;
  height: 38px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--radius);
  background: var(--bg-muted);
  color: var(--primary-deep);
  font-size: 17px;
}
.entry-primary .entry-ico {
  background: var(--primary);
  color: #fff;
}
.entry-body {
  flex: 1;
  min-width: 0;
}
.entry-title {
  display: block;
  font-size: 14px;
  font-weight: 600;
  color: var(--text);
}
.entry-desc {
  display: block;
  margin-top: 2px;
  font-size: 12px;
  color: var(--text-muted);
  line-height: 1.5;
}
.entry-arrow {
  flex-shrink: 0;
  color: var(--text-light);
  font-size: 13px;
}

.recent {
  margin-top: 24px;
  padding-top: 18px;
  border-top: 1px solid var(--border-soft);
}
.recent-title {
  margin: 0 0 10px;
  font-size: 14px;
  font-weight: 600;
}
.recent-list {
  display: flex;
  flex-direction: column;
}
.recent-row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 0;
  border-bottom: 1px dashed var(--border-soft);
  font-size: 13px;
}
.recent-row:last-child {
  border-bottom: none;
}
.recent-link {
  flex: 1;
  min-width: 0;
  color: var(--text);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.recent-link:hover {
  color: var(--primary);
}
.post-status {
  padding: 1px 7px;
  font-size: 11px;
  border-radius: 3px;
}
.post-status.is-pub {
  background: rgba(108, 154, 77, 0.12);
  color: var(--success);
}
.post-status.is-draft {
  background: var(--bg-muted);
  color: var(--text-muted);
}
.recent-time {
  flex-shrink: 0;
  font-size: 12px;
  color: var(--text-muted);
}

@media (max-width: 640px) {
  .stat-grid {
    grid-template-columns: repeat(2, 1fr);
  }
  .entry-grid {
    grid-template-columns: 1fr;
  }
  .recent-time {
    display: none;
  }
}
</style>
