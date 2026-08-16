<template>
  <section class="section-card">
    <header class="section-header">
      <h2 class="section-title">
        <span class="title-bar"></span>
        <slot name="title">{{ title }}</slot>
      </h2>
      <div class="section-extra">
        <slot name="extra" />
      </div>
    </header>
    <div class="section-body">
      <slot />
    </div>
  </section>
</template>

<script setup>
defineProps({ title: String })
</script>

<style scoped>
.section-card {
  margin-bottom: 32px;
}
.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}
.section-title {
  display: flex;
  align-items: center;
  font-family: var(--font-serif);
  font-size: 20px;
  font-weight: 600;
  color: var(--text);
  letter-spacing: 2px;
}
.title-bar {
  display: inline-block;
  width: 4px;
  height: 18px;
  background: var(--primary);
  margin-right: 10px;
  border-radius: 2px;
}
.section-extra {
  font-size: 12px;
  color: var(--text-muted);
}
.section-body {
  /* 内容区 */
}
</style>