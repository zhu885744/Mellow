<template>
  <RouterView />
</template>

<script setup>
import { watch } from 'vue'
import { RouterView, useRoute } from 'vue-router'
import { useSiteStore } from '@/stores/site'
import { applySiteAssets } from '@/utils/siteAssets'

const siteStore = useSiteStore()
const route = useRoute()

// 站点信息（网站标题 / 描述 / 关键词 / 图标）应用的唯一入口：
// 前台、登录页、后台、用户中心、创作中心都挂在 App 下，这里应用一次即可全覆盖。
// immediate 保证命中本地缓存时首屏也立即生效。
watch(
  () => siteStore.config,
  (config) => applySiteAssets(config || {}),
  { immediate: true, deep: true }
)

// 各布局也会调用（store 内部做并发去重与缓存），这里提前拉取让浏览器标签尽快用上配置。
// 安装向导页例外：未安装时 /api 会被后端整体拦住（412），拉配置只会弹无意义的错误提示，
// 安装页本身也不需要站点数据（装完是整页跳转，会重新加载）。
if (route.name !== 'install') {
  siteStore.load()
}
</script>
