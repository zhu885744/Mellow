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
const title = 'QPS 预警'
const icon = 'bi bi-speedometer2'
const desc = '配置接口 QPS 预警阈值与告警策略。基础界面已就绪，等待接口对接。'
</script>
<style scoped>@import './admin-page.css';</style>
