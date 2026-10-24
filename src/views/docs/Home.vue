<template>
  <article class="docs-home">
    <h1 class="docs-title">文档</h1>
    <div v-if="docs.length" class="docs-grid">
      <RouterLink
        v-for="doc in docs"
        :key="doc.id"
        :to="`/docs/${version}/${doc.groupSlug}/${doc.slug}`"
        class="docs-card"
      >
        <i class="bi bi-file-earmark-text docs-card-icon" aria-hidden="true" />
        <span class="docs-card-body">
          <span class="docs-card-title">{{ doc.title }}</span>
          <span v-if="doc.groupName" class="docs-card-desc">{{ doc.groupName }}</span>
        </span>
        <i class="bi bi-arrow-right docs-card-arrow" aria-hidden="true" />
      </RouterLink>
    </div>

    <p v-else-if="!loading" class="docs-empty">
      还没有文档内容，请先在后台「文档库」中进入该项目并添加目录和页面。
    </p>
  </article>
</template>

<script setup>
import { ref, watch } from 'vue'
import { call } from '@/api/request'

const props = defineProps({
  version: { type: String, default: 'latest' }
})

const docs = ref([])
const loading = ref(true)

async function load() {
  loading.value = true
  try {
    const res = await call('docs-group', 'tree', {
      method: 'GET',
      params: { version: props.version, with_docs: 1 }
    })

    const flat = []
    const walk = (nodes) => {
      for (const node of nodes || []) {
        for (const doc of node.docs || []) {
          flat.push({ ...doc, groupSlug: node.slug || '-', groupName: node.name })
        }
        walk(node.children)
      }
    }
    walk(res?.data || [])

    docs.value = flat
  } catch {
    docs.value = []
  } finally {
    loading.value = false
  }
}

watch(() => props.version, load, { immediate: true })
</script>

<style scoped>
.docs-title {
  margin: 0;
  font-family: var(--font-serif);
  font-size: 28px;
  font-weight: 700;
  color: var(--text);
  letter-spacing: 1px;
}
.docs-lead {
  margin: 12px 0 28px;
  font-size: 14px;
  line-height: 1.9;
  color: var(--text-muted);
}
.docs-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}
.docs-card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px;
  background: var(--bg-alt);
  border: 1px solid var(--border-soft);
  border-radius: var(--radius);
  text-decoration: none;
  transition: border-color 0.2s, transform 0.2s;
}
.docs-card:hover {
  border-color: var(--primary-soft);
  transform: translateY(-2px);
}
.docs-card-icon {
  flex-shrink: 0;
  font-size: 18px;
  color: var(--primary);
}
.docs-card-body {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
  flex: 1;
}
.docs-card-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--text);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.docs-card-desc {
  font-size: 12px;
  color: var(--text-light);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.docs-card-arrow {
  flex-shrink: 0;
  font-size: 13px;
  color: var(--text-light);
  transition: color 0.2s, transform 0.2s;
}
.docs-card:hover .docs-card-arrow {
  color: var(--primary);
  transform: translateX(2px);
}
.docs-empty {
  margin: 24px 0 0;
  font-size: 14px;
  color: var(--text-light);
}

@media (max-width: 900px) {
  .docs-grid {
    grid-template-columns: 1fr;
  }
}
</style>
