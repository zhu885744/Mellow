<template>
  <RouterView />
  <!-- 全局图片灯箱：必须挂在 App 而不是 MainLayout。
       后台 / 用户中心 / 创作中心也有预览图片的入口（轮播图、举报证据、评论图片…），
       那些布局里没有灯箱时 openLightbox 只会把状态置为 visible，用户看不到也关不掉，
       等切回前台布局再挂载灯箱时就会「凭空」弹出来。 -->
  <Lightbox />
  <!-- 全局滑块验证：发送验证码被判定为频繁时，由 request.js 的拦截器唤起（见 utils/captchaGate） -->
  <SliderCaptcha />
</template>

<script setup>
import { watch } from 'vue'
import { RouterView, useRoute } from 'vue-router'
import { useSiteStore } from '@/stores/site'
import { applySiteAssets } from '@/utils/siteAssets'
import SliderCaptcha from '@/components/SliderCaptcha.vue'
import Lightbox from '@/components/Lightbox.vue'

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
