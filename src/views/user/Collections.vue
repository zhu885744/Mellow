<template>
  <div class="card card-pad">
    <h2 class="block-title">我的收藏</h2>

    <div v-if="loading" class="loading">
      <span class="spinner" /> 加载中...
    </div>
    <div v-else-if="!items.length" class="empty-row">
      <EmptyState text="还没有收藏任何内容" />
    </div>
    <ul v-else class="item-list">
      <li v-for="(i, k) in items" :key="k" class="item">
        <router-link :to="`/${i.type === 'moments' ? 'moments' : 'articles'}/${i.target_id}`" class="item-link">
          <span class="item-title">{{ i.result?.title || i.target?.title || formatContent(i) }}</span>
          <span class="item-type">{{ typeLabel(i.type) }}</span>
          <span class="item-time">{{ fromNow(i.create_time) }}</span>
        </router-link>
        <button class="btn-icon" @click="uncollect(i)"><i class="bi bi-x" /></button>
      </li>
    </ul>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import EmptyState from '@/components/EmptyState.vue'
import { myCollects, uncollect as apiUncollect } from '@/api/tags'
import { fromNow } from '@/utils/time'
import { toast } from '@/utils/toast'

const items = ref([])
const loading = ref(false)

async function load() {
  loading.value = true
  try {
    const res = await myCollects({ page: 1, limit: 100 })
    items.value = res.data?.data || []
  } catch {
    items.value = []
  } finally {
    loading.value = false
  }
}

function typeLabel(t) {
  if (t === 'article') return '文章'
  if (t === 'moments' || t === 'moment') return '动态'
  if (t === 'page') return '页面'
  return '内容'
}

function formatContent(i) {
  return (i.result?.content || '').slice(0, 30) || '收藏内容'
}

async function uncollect(i) {
  try {
    await apiUncollect(i.type, i.target_id)
    items.value = items.value.filter((x) => x.id !== i.id)
    toast.success('已取消收藏')
  } catch {}
}

onMounted(load)
</script>

<style scoped>
.block-title {
  font-size: 16px;
  font-weight: 600;
  margin-bottom: 16px;
  padding-bottom: 12px;
  border-bottom: 1px solid var(--border-soft);
}
.item-list {
  display: flex;
  flex-direction: column;
}
.item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 4px;
  border-bottom: 1px dashed var(--border-soft);
}
.item:last-child {
  border-bottom: none;
}
.item-link {
  display: flex;
  align-items: center;
  gap: 12px;
  flex: 1;
  color: var(--text);
  font-size: 14px;
}
.item-link:hover .item-title {
  color: var(--primary);
}
.item-title {
  flex: 1;
  font-weight: 500;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.item-type {
  font-size: 11px;
  padding: 2px 8px;
  background: var(--bg-muted);
  color: var(--text-soft);
  border-radius: 3px;
}
.item-time {
  font-size: 11px;
  color: var(--text-muted);
}
.btn-icon {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: var(--bg-muted);
  color: var(--text-muted);
  font-size: 16px;
  cursor: pointer;
}
.btn-icon:hover {
  background: var(--danger);
  color: #fff;
}
.loading {
  padding: 32px;
  text-align: center;
  color: var(--text-muted);
}
.empty-row {
  text-align: center;
}
</style>