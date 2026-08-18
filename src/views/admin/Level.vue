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
const title = '等级管理'
const icon = 'bi bi-bar-chart'
const desc = '配置用户等级规则与升级条件。基础界面已就绪，等待接口对接。'
</script>
<style scoped>@import './admin-page.css';</style>
