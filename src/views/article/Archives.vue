<template>
  <div>
    <SectionTitle title="文章归档" />

    <div v-if="loading" class="loading">
      <span class="spinner" /> 加载中...
    </div>

    <div v-else-if="!groups.length" class="empty">
      <EmptyState text="还没有归档" />
    </div>

    <div v-else class="archive-list">
      <div v-for="g in groups" :key="g.label" class="archive-group">
        <h3 class="archive-year">{{ g.label }}</h3>
        <ul class="archive-items">
          <li v-for="a in g.list" :key="a.id" class="archive-item">
            <router-link :to="`/archives/${a.id}`">{{ a.title }}</router-link>
            <span class="archive-date">{{ formatDate(a.create_time) }}</span>
          </li>
        </ul>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import SectionTitle from '@/components/SectionTitle.vue'
import EmptyState from '@/components/EmptyState.vue'
import { listArticles } from '@/api/article'
import { formatDate } from '@/utils/time'
import dayjs from 'dayjs'

const loading = ref(false)
const groups = ref([])

function groupByYear(list) {
  const map = new Map()
  list.forEach((a) => {
    const ts = typeof a.create_time === 'string' ? parseInt(a.create_time) : a.create_time
    const d = dayjs(ts * 1000)
    const label = d.format('YYYY 年 MM 月')
    if (!map.has(label)) map.set(label, { label, date: d.valueOf(), list: [] })
    map.get(label).list.push(a)
  })
  return [...map.values()].sort((a, b) => b.date - a.date)
}

async function load() {
  loading.value = true
  try {
    const res = await listArticles({
      page: 1,
      limit: 999,
      where: { audit: 1 },
      order: 'publish_time desc',
      field: 'id,title,create_time,publish_time'
    })
    groups.value = groupByYear(res.data?.data || [])
  } catch {
    groups.value = []
  } finally {
    loading.value = false
  }
}

onMounted(load)
</script>

<style scoped>
.loading {
  padding: 64px;
  text-align: center;
}
.archive-group {
  margin-bottom: 24px;
}
.archive-year {
  font-family: var(--font-serif);
  font-size: 18px;
  color: var(--primary-deep);
  padding-bottom: 8px;
  border-bottom: 1px solid var(--border);
  margin-bottom: 12px;
}
.archive-items {
  display: flex;
  flex-direction: column;
}
.archive-item {
  display: flex;
  justify-content: space-between;
  padding: 10px 4px;
  border-bottom: 1px dashed var(--border-soft);
  font-size: 14px;
}
.archive-item a {
  color: var(--text);
}
.archive-item a:hover {
  color: var(--primary);
}
.archive-date {
  color: var(--text-muted);
  font-size: 12px;
}
</style>