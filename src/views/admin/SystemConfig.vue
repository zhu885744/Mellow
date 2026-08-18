<template>
  <div class="admin-page">
    <div class="page-head"><i :class="icon" /><h1 class="page-title">{{ title }}</h1></div>
    <div class="page-body">
      <p class="page-desc">{{ desc }}</p>
      <span class="page-badge">模块建设中</span>
    </div>
  </div>
</template>
<script setup>
const title = '系统配置'
const icon = 'bi bi-gear'
const desc = '配置站点标题、标语、SEO、主题与第三方服务。基础界面已就绪，等待接口对接。'
</script>
<style scoped>@import './admin-page.css';</style>
