<template>
  <div class="layout">
    <div class="layout-body">
      <!-- 左栏 - 站点信息 + 导航 -->
      <aside class="layout-left">
        <div class="site-card">
          <div class="site-card__title">{{ site.title }}</div>
          <div class="site-card__subtitle">{{ site.description }}</div>
        </div>

        <!-- 全局搜索按钮 -->
        <button class="search-btn" @click="openSearch">
          <i class="bi bi-search" />
          <span>搜索</span>
          <kbd class="search-kbd">Ctrl K</kbd>
        </button>

        <nav class="site-nav">
          <router-link to="/" exact-active-class="active" class="nav-item">
            <span class="nav-zh">首页</span>
          </router-link>
          <router-link to="/moments" active-class="active" class="nav-item">
            <span class="nav-zh">奇思</span>
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

          <!-- 自定义导航链接（来自 Mellow_functions.custom_nav_links） -->
          <a
            v-for="(link, i) in customNavLinks"
            :key="'custom-' + i"
            :href="link.url"
            target="_blank"
            rel="noopener noreferrer"
            class="nav-item"
          >
            <span class="nav-zh">{{ link.name }}</span>
          </a>

          <!-- 管理员入口 -->
          <router-link
            v-if="isAdmin(userStore.user)"
            to="/admin"
            active-class="active"
            class="nav-item"
          >
            <span class="nav-zh">管理</span>
          </router-link>
        </nav>
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

    <!-- 全局页脚 -->
    <footer class="layout-footer">
      <span class="footer-line">
        © {{ year }} {{ site.title }}. 保留所有权利.
      </span>
      <template v-if="site.copyCode || site.policeCode">
        <span v-if="site.copyCode" class="footer-line">
          <a
            v-if="site.copyLink"
            :href="site.copyLink"
            target="_blank"
            rel="noopener noreferrer"
          >{{ site.copyCode }}</a>
          <template v-else>{{ site.copyCode }}</template>
        </span>
        <span v-if="site.policeCode" class="footer-line">
          <a
            v-if="site.policeLink"
            :href="site.policeLink"
            target="_blank"
            rel="noopener noreferrer"
          >{{ site.policeCode }}</a>
          <template v-else>{{ site.policeCode }}</template>
        </span>
      </template>
    </footer>

    <!-- 全局搜索弹窗 -->
    <SearchDialog ref="searchDialogRef" />

    <!-- 全局图片灯箱 -->
    <Lightbox />

    <!-- 右侧悬浮按钮 -->
    <FloatButtons />
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, computed } from 'vue'
import SidebarRight from '@/components/SidebarRight.vue'
import SearchDialog from '@/components/SearchDialog.vue'
import Lightbox from '@/components/Lightbox.vue'
import FloatButtons from '@/components/FloatButtons.vue'
import { call } from '@/api/request'
import { getConfig } from '@/api/config'
import { useUserStore } from '@/stores/user'
import { isAdmin } from '@/utils/helper'

const userStore = useUserStore()

// 全局搜索弹窗
const searchDialogRef = ref(null)
function openSearch() {
  searchDialogRef.value?.show()
}
function onGlobalKey(e) {
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
    e.preventDefault()
    openSearch()
  }
}
onMounted(() => window.addEventListener('keydown', onGlobalKey))
onUnmounted(() => window.removeEventListener('keydown', onGlobalKey))

// 站点信息（来自 /api/config/one?key=Mellow_functions）
const siteConfig = ref({})
const pages = ref([])
const year = new Date().getFullYear()

const site = computed(() => {
  const c = siteConfig.value || {}
  return {
    title: c.title || '朱某的生活印记',
    description: c.description || '我从虚空中惊醒',
    copyCode: c.copy?.code || '',
    copyLink: c.copy?.link || '',
    policeCode: c.police?.code || '',
    recordCode: c.police?.code || '',
    policeLink: c.police?.link || ''
  }
})

// 获取站点配置（Mellow_functions）
async function loadSiteConfig() {
  try {
    const res = await getConfig('Mellow_functions')
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
  return `/${p.key || p.id}`
}

// 解析自定义导航链接：格式 "跳转文字 || 跳转链接"，一行一个
const customNavLinks = computed(() => {
  const raw = siteConfig.value?.custom_nav_links || ''
  return raw
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [name, url] = line.split('||').map((s) => s.trim())
      return { name: name || '', url: url || '' }
    })
    .filter((item) => item.name && item.url)
})

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

.search-btn {
  width: 100%;
  margin-top: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 9px 14px;
  font-size: 13px;
  color: var(--text-soft);
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  transition: all 0.2s;
}
.search-btn:hover {
  color: var(--primary);
  border-color: var(--primary);
  background: var(--bg-soft);
}
.search-kbd {
  margin-left: auto;
  padding: 1px 6px;
  font-size: 11px;
  color: var(--text-light);
  border: 1px solid var(--border);
  border-bottom-width: 2px;
  border-radius: 4px;
  background: var(--bg-soft);
  font-family: var(--font-mono);
}

.site-nav {
  display: flex;
  flex-direction: column;
  margin: 24px 0;
}
.nav-item {
  padding: 9px 14px;
  text-align: center;
  color: var(--text-soft);
  font-size: 14px;
  position: relative;
  border-radius: var(--radius-sm);
  transition: color 0.2s, background 0.2s;
}
.nav-item:hover {
  color: var(--primary);
  background: var(--bg-muted);
}
.nav-item.active {
  color: var(--primary);
  font-weight: 600;
  background: rgba(184, 153, 104, 0.12);
}
.nav-item.active::before {
  content: '';
  position: absolute;
  left: 0;
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

.layout-footer {
  max-width: var(--content-max);
  margin: 0 auto;
  padding: 16px 24px 28px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: var(--text-muted);
  border-top: 1px solid var(--border-soft);
}
.layout-footer a {
  color: var(--text-muted);
  transition: color 0.2s;
}
.layout-footer a:hover {
  color: var(--primary);
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
    gap: 4px;
  }
  .nav-item.active::before {
    display: none;
  }
}
</style>
