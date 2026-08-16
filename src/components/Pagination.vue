<template>
  <nav v-if="pageCount > 1" class="pager">
    <button
      class="pager-btn"
      :disabled="current === 1"
      @click="$emit('update:current', current - 1)"
    >‹</button>
    <span class="pager-info">{{ current }} / {{ pageCount }}</span>
    <button
      class="pager-btn"
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
.pager-btn {
  width: 32px;
  height: 32px;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background: var(--bg-card);
  color: var(--text-soft);
  transition: all 0.15s;
}
.pager-btn:hover:not(:disabled) {
  border-color: var(--primary);
  color: var(--primary);
}
.pager-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}
.pager-info {
  font-size: 13px;
  color: var(--text-muted);
}
</style>