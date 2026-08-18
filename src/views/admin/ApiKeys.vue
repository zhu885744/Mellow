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
const title = '接口密钥'
const icon = 'bi bi-key'
const desc = '管理与发放 API 接口密钥及调用权限。基础界面已就绪，等待接口对接。'
</script>
<style scoped>@import './admin-page.css';</style>
