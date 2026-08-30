<template>
  <nav v-if="pageCount > 1" class="pager">
    <button
      class="btn btn-icon btn-sm"
      :disabled="current === 1"
      @click="$emit('update:current', current - 1)"
    >‹</button>
    <span class="pager-info">{{ current }} / {{ pageCount }}</span>
    <button
      class="btn btn-icon btn-sm"
      :disabled="current === pageCount"
      @click="$emit('update:current', current + 1)"
    >›</button>
  </nav>
</template>

<script setup>
import { computed } from 'vue'
const props = defineProps({
  current: { type: Number, default: 1 },
  total: { type: Number, default: 0 },
  pageSize: { type: Number, default: 10 }
})
const pageCount = computed(() => Math.max(1, Math.ceil(props.total / props.pageSize)))
</script>

<style scoped>
.pager {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 24px 0;
}
.pager-info {
  font-size: 13px;
  color: var(--text-muted);
}
</style>