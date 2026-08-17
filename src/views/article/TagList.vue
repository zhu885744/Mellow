<template>
  <div>
    <SectionTitle title="标签">
      <template #extra>
        <span class="text-muted">共 {{ allTags.length }} 个标签</span>
      </template>
    </SectionTitle>
    <div v-if="tagLoading" class="loading">
      <span class="spinner" /> 加载中...
    </div>
    <div v-else class="tag-cloud">
      <router-link
        v-for="t in allTags"
        :key="t.id"
        :to="`/tag/${t.id}`"
        class="tag-chip"
      >#{{ t.name }}</router-link>
      <EmptyState v-if="!allTags.length" text="暂无标签" />
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import SectionTitle from '@/components/SectionTitle.vue'
import EmptyState from '@/components/EmptyState.vue'
import { call } from '@/api/request'

const allTags = ref([])
const tagLoading = ref(false)

// 获取全部标签：GET /api/tags/all
// 注意：tags 表没有 count 字段，不能按 count 排序（会导致后端 SQL 报错），
// 使用文档默认的 create_time desc；limit 显式传大值以取回全部分页结果
async function loadAllTags() {
  tagLoading.value = true
  try {
    const res = await call('tags', 'all', {
      method: 'GET',
      params: {
        field: 'id,name,avatar,description',
        order: 'create_time desc',
        limit: 100
      }
    })
    allTags.value = res.data?.data || []
  } catch {
    allTags.value = []
  } finally {
    tagLoading.value = false
  }
}

onMounted(loadAllTags)
</script>

<style scoped>
.loading {
  padding: 64px;
  text-align: center;
  color: var(--text-muted);
}
.tag-cloud {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  padding: 8px 0 24px;
}
.tag-chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 14px;
  border-radius: 999px;
  background: var(--bg-card);
  border: 1px solid var(--border);
  color: var(--text-soft);
  font-size: 13px;
  transition: all 0.2s;
}
.tag-chip:hover {
  border-color: var(--primary);
  color: var(--primary);
  background: rgba(184, 153, 104, 0.08);
}
</style>
