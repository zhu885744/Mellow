<template>
  <div class="sk-article" :class="{ 'has-cover': cover }">
    <div v-if="cover" class="sk-cover skeleton" />
    <div class="sk-main">
      <div class="sk-title skeleton" />
      <div class="sk-meta skeleton" />
      <div class="sk-line skeleton" />
      <div class="sk-line short skeleton" />
    </div>
  </div>
</template>

<script setup>
defineProps({
  cover: { type: Boolean, default: true }
})
</script>

<style scoped>
.sk-article {
  display: flex;
  gap: 16px;
  padding: 20px 0;
  border-bottom: 1px dashed var(--border);
}
.sk-article:last-child {
  border-bottom: none;
}
.sk-cover {
  width: 160px;
  height: 108px;
  flex-shrink: 0;
  border-radius: var(--radius);
}
.sk-main {
  flex: 1;
  min-width: 0;
  padding-top: 4px;
}
.sk-title {
  width: 55%;
  height: 20px;
  margin-bottom: 14px;
}
.sk-meta {
  width: 40%;
  height: 12px;
  margin-bottom: 14px;
}
.sk-line {
  width: 100%;
  height: 12px;
  margin-bottom: 10px;
}
.sk-line.short {
  width: 70%;
}

@media (max-width: 480px) {
  .sk-article.has-cover {
    flex-direction: column;
  }
  .sk-article.has-cover .sk-cover {
    width: 100%;
    height: 160px;
  }
}
</style>
