<template>
  <div>
    <SectionTitle :title="page?.title || '加载中...'" />

    <div v-if="loading" class="loading">
      <span class="spinner" /> 加载中...
    </div>

    <article v-else-if="page" class="page-content card card-pad markdown-body" v-html="contentHtml" />

    <EmptyState v-else text="页面不存在" />
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import SectionTitle from '@/components/SectionTitle.vue'
import EmptyState from '@/components/EmptyState.vue'
import { call } from '@/api/request'
import { renderMarkdown } from '@/utils/markdown'

const props = defineProps({
  key: { type: String, default: '' },
  id: { type: [String, Number], default: '' }
})

const route = useRoute()
const loading = ref(false)
const page = ref(null)

const contentHtml = computed(() => renderMarkdown(page.value?.content || ''))

async function load() {
  loading.value = true
  page.value = null
  const key = props.key || route.params.key || props.id || route.params.id
  try {
    const res = await call('pages', 'one', {
      method: 'GET',
      params: { key }
    })
    page.value = res.data
  } catch {
    page.value = null
  } finally {
    loading.value = false
  }
}

watch(() => [props.key, route.params.key, route.params.id], load)
onMounted(load)
</script>

<style scoped>
.page-content {
  font-size: 15px;
  line-height: 1.8;
  color: var(--text);
}
.loading {
  padding: 64px;
  text-align: center;
  color: var(--text-muted);
}

.markdown-body :deep(h1),
.markdown-body :deep(h2),
.markdown-body :deep(h3) {
  margin: 1.2em 0 0.6em;
  font-weight: 600;
}
.markdown-body :deep(p) {
  margin: 0.8em 0;
}
.markdown-body :deep(a) {
  color: var(--link);
}
.markdown-body :deep(blockquote) {
  border-left: 4px solid var(--primary-soft);
  padding: 4px 16px;
  color: var(--text-muted);
  background: var(--bg-soft);
  margin: 12px 0;
}
.markdown-body :deep(code) {
  background: var(--bg-muted);
  padding: 1px 6px;
  border-radius: 3px;
  color: var(--primary-deep);
}
.markdown-body :deep(pre) {
  background: #2c2a26;
  color: #f0eee5;
  padding: 16px;
  border-radius: var(--radius);
  overflow-x: auto;
}
</style>