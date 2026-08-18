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
const title = 'IP 黑名单'
const icon = 'bi bi-shield-x'
const desc = '维护 IP 黑名单，拦截恶意访问。基础界面已就绪，等待接口对接。'
</script>
<style scoped>@import './admin-page.css';</style>
