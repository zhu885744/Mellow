<template>
  <div class="empty">
    <div class="empty-icon">{{ icon }}</div>
    <div class="empty-text">{{ text }}</div>
  </div>
</template>

<script setup>
defineProps({
  icon: { type: String, default: '∅' },
  text: { type: String, default: '暂无数据' }
})
</script>

<style scoped>
.empty {
  padding: 64px 16px;
  text-align: center;
  color: var(--text-muted);
  font-size: 13px;
}
.empty-icon {
  font-size: 48px;
  font-family: serif;
  margin-bottom: 8px;
  opacity: 0.4;
}
.empty-text {
  font-size: 13px;
}
</style>