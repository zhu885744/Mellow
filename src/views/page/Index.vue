<template>
  <div>
    <SectionTitle :title="page?.title || '加载中...'" />

    <div v-if="loading" class="loading">
      <span class="spinner" /> 加载中...
    </div>

    <article
      v-else-if="page"
      ref="contentRef"
      class="page-content card card-pad markdown-body"
      v-html="contentHtml"
      @click="onContentClick"
    />

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
import { openLightbox } from '@/utils/lightbox'

const props = defineProps({
  key: { type: String, default: '' },
  id: { type: [String, Number], default: '' }
})

const route = useRoute()
const loading = ref(false)
const page = ref(null)

const contentHtml = computed(() => renderMarkdown(page.value?.content || ''))
const contentRef = ref(null)

// 点击页面内容中的图片时打开灯箱（事件委托，兼容 v-html 渲染的图片）
function onContentClick(e) {
  const img = e.target.closest('img')
  if (!img || !img.src) return
  const srcs = Array.from(contentRef.value?.querySelectorAll('img') || [])
    .map((el) => el.src)
    .filter(Boolean)
  openLightbox(srcs, srcs.indexOf(img.src))
}

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
.loading {
  padding: 64px;
  text-align: center;
  color: var(--text-muted);
}

/* Markdown 排版样式统一使用全局 styles.css 中的 .markdown-body */
</style>