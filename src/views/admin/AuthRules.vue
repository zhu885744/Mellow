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
const title = '权限规则'
const icon = 'bi bi-shield-check'
const desc = '配置后台权限规则，控制接口与页面访问。基础界面已就绪，等待接口对接。'
</script>
<style scoped>@import './admin-page.css';</style>
