<template>
  <div class="layout">
    <div class="layout-body">
      <!-- 左栏 - 站点信息 + 导航 -->
      <aside class="layout-left">
        <div class="site-card">
          <div class="site-card__title">{{ site.title }}</div>
          <div class="site-card__subtitle">{{ site.description }}</div>
        </div>

        <nav class="site-nav">
          <router-link to="/" exact-active-class="active" class="nav-item">
            <span class="nav-zh">首页</span>
          </router-link>
          <!-- 动态导航页（来自 /api/pages/all） -->
          <router-link
            v-for="p in pages"
            :key="p.id"
            :to="navTarget(p)"
            active-class="active"
            class="nav-item"
          >
            <span class="nav-zh">{{ p.title }}</span>
          </router-link>
        </nav>

        <div class="site-footer">
          <p class="footer-line" v-if="site.copyCode">© {{ site.copyCode }}</p>
          <p class="footer-line" v-if="site.recordCode">{{ site.recordCode }}</p>
          <p class="footer-line">Theme <a href="#">Matcha</a></p>
          <p class="footer-line">Powered by <a href="#">INIS</a></p>
        </div>
      </aside>

      <!-- 中栏 - 内容 -->
      <main class="layout-main">
        <router-view />
      </main>

      <!-- 右栏 - 个人信息卡片 -->
      <aside class="layout-right">
        <SidebarRight />
      </aside>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import SidebarRight from '@/components/SidebarRight.vue'
import { call } from '@/api/request'
import { getConfig } from '@/api/config'

// 站点信息（来自 /api/config/one?key=inis_functions）
const siteConfig = ref({})
const pages = ref([])

const site = computed(() => {
  const c = siteConfig.value || {}
  return {
    title: c.title || '考拉咖啡馆',
    description: c.description || '我从虚空中惊醒',
    copyCode: c.copy?.code || '',
    recordCode: c.police?.code || ''
  }
})

// 获取站点配置（inis_functions）
async function loadSiteConfig() {
  try {
    const res = await getConfig('inis_functions')
    siteConfig.value = res.data?.json || {}
  } catch {
    siteConfig.value = {}
  }
}

// 获取导航页（/api/pages/all）
async function loadPages() {
  try {
    const res = await call('pages', 'all', {
      method: 'GET',
      params: {
        page: 1,
        limit: 20,
        field: 'id,key,title',
        order: 'create_time asc'
      }
    })
    pages.value = res.data?.data || []
  } catch {
    pages.value = []
  }
}

// 根据页面 key 映射到专属路由
function navTarget(p) {
  const key = p.key
  if (key === 'archive') return '/archives'
  if (key === 'links') return '/links'
  if (key === 'about') return '/about'
  return `/page/${p.key || p.id}`
}

onMounted(() => {
  loadSiteConfig()
  loadPages()
})
</script>

<style scoped>
.layout {
  min-height: 100vh;
  background: var(--bg);
}

.layout-body {
  max-width: var(--content-max);
  margin: 0 auto;
  padding: 32px 24px 64px;
  display: grid;
  grid-template-columns: var(--left-width) 1fr var(--right-width);
  gap: var(--gap);
  align-items: start;
}

.layout-left {
  position: sticky;
  top: 32px;
}

.site-card {
  padding: 24px 0 32px;
  text-align: center;
  border-bottom: 1px solid var(--border);
}
.site-card__title {
  font-family: var(--font-serif);
  font-size: 26px;
  font-weight: 600;
  color: var(--text);
  letter-spacing: 2px;
  margin-bottom: 6px;
}
.site-card__subtitle {
  font-size: 12px;
  color: var(--text-muted);
  letter-spacing: 1px;
}

.site-nav {
  display: flex;
  flex-direction: column;
  margin: 24px 0;
}
.nav-item {
  padding: 10px 0;
  text-align: center;
  color: var(--text-soft);
  font-size: 14px;
  position: relative;
  transition: color 0.2s;
}
.nav-item:hover {
  color: var(--primary);
}
.nav-item.active {
  color: var(--primary);
  font-weight: 500;
}
.nav-item.active::before {
  content: '';
  position: absolute;
  left: -16px;
  top: 50%;
  transform: translateY(-50%);
  width: 3px;
  height: 14px;
  background: var(--primary);
  border-radius: 2px;
}

.site-footer {
  margin-top: auto;
  padding-top: 32px;
  text-align: center;
  font-size: 11px;
  color: var(--text-muted);
  line-height: 1.8;
}
.footer-line a {
  color: var(--primary-deep);
}

.layout-main {
  min-width: 0;
}

.layout-right {
  position: sticky;
  top: 32px;
}

/* 响应式 - 平板 */
@media (max-width: 1024px) {
  .layout-body {
    grid-template-columns: var(--left-width) 1fr;
  }
  .layout-right {
    display: none;
  }
}

/* 响应式 - 手机 */
@media (max-width: 640px) {
  .layout-body {
    grid-template-columns: 1fr;
    padding: 16px;
  }
  .layout-left {
    position: static;
  }
  .site-nav {
    flex-direction: row;
    justify-content: space-around;
    margin: 16px 0;
    flex-wrap: wrap;
  }
  .nav-item.active::before {
    display: none;
  }
}
</style>
