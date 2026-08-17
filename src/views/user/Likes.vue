<template>
  <div class="card card-pad">
    <h2 class="block-title">我的点赞</h2>

    <div v-if="loading" class="loading">
      <span class="spinner" /> 加载中...
    </div>
    <div v-else-if="!items.length" class="empty-row">
      <EmptyState text="还没有点赞任何内容" />
    </div>
    <ul v-else class="item-list">
      <li v-for="i in items" :key="i.id" class="item" :class="{ leaving: leavingId === i.id }">
        <span class="item-type">{{ typeLabel(i.target_type) }}</span>
        <span class="item-title">{{ i.result?.title || formatContent(i) }}</span>
        <span class="item-time">{{ fromNow(i.create_time) }}</span>
        <button class="btn-icon" @click="remove(i)"><i class="bi bi-x" /></button>
      </li>
    </ul>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import EmptyState from '@/components/EmptyState.vue'
import { call, default as request } from '@/api/request'
import { unlike } from '@/api/tags'
import { fromNow } from '@/utils/time'
import { toast } from '@/utils/toast'

const items = ref([])
const loading = ref(false)
const leavingId = ref(null)

async function load() {
  loading.value = true
  try {
    const res = await call('user-likes', 'likes', { method: 'GET', params: { page: 1, limit: 100 } })
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
  if (t === 'comment') return '评论'
  return '内容'
}

function formatContent(i) {
  const t = i.result?.target?.title || i.result?.content || ''
  return String(t).slice(0, 30)
}

async function remove(i) {
  leavingId.value = i.id
  try {
    await unlike(i.target_type, i.target_id)
    toast.success('已取消点赞')
    window.setTimeout(() => {
      items.value = items.value.filter((x) => x.id !== i.id)
      leavingId.value = null
    }, 280)
  } catch {
    leavingId.value = null
  }
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
@keyframes item-leave {
  to {
    opacity: 0;
    transform: scale(0.96);
  }
}
.item.leaving {
  animation: item-leave 0.28s ease forwards;
}
.item-type {
  font-size: 11px;
  padding: 2px 8px;
  background: rgba(217, 84, 77, 0.1);
  color: var(--accent);
  border-radius: 3px;
}
.item-title {
  flex: 1;
  color: var(--text);
  font-size: 14px;
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
.empty-row { text-align: center; }
</style>