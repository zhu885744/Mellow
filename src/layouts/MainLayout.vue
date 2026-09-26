<template>
  <div class="layout">
    <!-- 移动端顶栏（仅手机端显示） -->
    <div class="mobile-topbar">
      <span class="mobile-brand">
        <img v-if="site.avatar" class="mobile-brand__logo" :src="site.avatar" :alt="site.title" />
        {{ site.title }}
      </span>
      <div class="mobile-actions">
        <button
          class="btn btn-sm"
          :class="userStore.isLogged ? 'btn-primary' : 'btn-ghost'"
          @click="onCheckinClick"
        >
          <i class="bi bi-calendar-check" /> 签到
        </button>
        <router-link
          v-if="!userStore.isLogged"
          to="/auth/login"
          class="btn btn-sm btn-primary"
        >登录</router-link>
        <router-link
          v-else
          :to="userStore.user?.id ? `/author/${userStore.user.id}` : '/user'"
          class="mobile-user"
          :title="userStore.user?.nickname || '我的'"
        >
          <img
            v-if="userStore.user?.avatar"
            :src="userStore.user.avatar"
            class="mobile-avatar"
            alt="头像"
          />
          <span v-else class="mobile-user-fallback">我的</span>
        </router-link>
      </div>
    </div>

    <div class="layout-body">
      <!-- 左栏 - 站点信息 + 导航 -->
      <aside class="layout-left">
        <div class="site-card">
          <!-- 网站 LOGO（后台「网站设置 → 网站 LOGO」，对应配置里的 avatar 字段）
               配了 LOGO 就只显示 LOGO（标题/描述已在图片里，不再重复）；
               没配、或地址失效时退回「标题 + 描述」的文字版 -->
          <img
            v-if="site.avatar && !logoFailed"
            class="site-card__logo"
            :src="site.avatar"
            :alt="site.title"
            loading="eager"
            @error="logoFailed = true"
          />
          <template v-else>
            <div class="site-card__title">{{ site.title }}</div>
            <div class="site-card__subtitle">{{ site.description }}</div>
          </template>
        </div>

        <!-- 全局搜索按钮 -->
        <button class="btn btn-ghost btn-sm btn-block" @click="openSearch">
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

          <!-- 积分商城 -->
          <router-link to="/goods" active-class="active" class="nav-item">
            <span class="nav-zh">商城</span>
          </router-link>

          <!-- 管理后台入口：有任意后台页面权限即显示（非 admin 的运营组也要能进自己那部分页面） -->
          <router-link
            v-if="canEnterAdmin(userStore.user)"
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
        <!-- 小黑屋（封禁公示） -->
        <router-link to="/blackroom" active-class="active">
          <span class="nav-zh">小黑屋</span>
        </router-link>
      </span>
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

    <!-- 移动端底部 Tab Bar（仅手机端显示） -->
    <nav class="mobile-tabbar" aria-label="主导航">
      <button
        v-for="tab in tabs"
        :key="tab.key"
        type="button"
        class="tab-item"
        :class="{ active: isActive(tab), highlight: tab.highlight }"
        :aria-label="tab.label"
        :aria-current="isActive(tab) ? 'page' : undefined"
        @click="goTab(tab)"
      >
        <span v-if="tab.badge" class="tab-badge">{{ tab.badge }}</span>
        <i class="bi tab-icon" :class="tab.icon" />
        <span class="tab-label">{{ tab.label }}</span>
      </button>
    </nav>

    <!-- 全局搜索弹窗 -->
    <SearchDialog ref="searchDialogRef" />

    <!-- 全局封禁申诉弹窗（当前用户被封禁时自动弹出） -->
    <BanAppealDialog ref="banDialogRef" />

    <!-- 全局图片灯箱 -->
    <Lightbox />

    <!-- 右侧悬浮按钮 -->
    <FloatButtons />

    <!-- 签到弹窗（移动端顶栏使用） -->
    <CheckinDialog ref="checkinDialogRef" />
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, computed, watch } from 'vue'
import SidebarRight from '@/components/SidebarRight.vue'
import SearchDialog from '@/components/SearchDialog.vue'
import Lightbox from '@/components/Lightbox.vue'
import FloatButtons from '@/components/FloatButtons.vue'
import BanAppealDialog from '@/components/BanAppealDialog.vue'
import CheckinDialog from '@/components/CheckinDialog.vue'
import { call } from '@/api/request'
import { useUserStore } from '@/stores/user'
import { useSiteStore } from '@/stores/site'
import { canEnterAdmin } from '@/utils/helper'
import { useRouter, useRoute } from 'vue-router'

const userStore = useUserStore()
const siteStore = useSiteStore()
const router = useRouter()
const route = useRoute()

// 签到弹窗（移动端顶栏「签到」按钮）
const checkinDialogRef = ref(null)
function onCheckinClick() {
  if (!userStore.isLogged) {
    router.push('/auth/login')
    return
  }
  checkinDialogRef.value?.show()
}

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

// 站点信息（来自 /api/config/one?key=Mellow_functions，由 site store 统一去重缓存）
const pages = ref([])
const year = new Date().getFullYear()

const site = computed(() => {
  const c = siteStore.config || {}
  return {
    title: c.title || 'Mellow',
    description: c.description || '我从虚空中惊醒',
    // 网站 LOGO（后台「网站设置 → 网站 LOGO」）：左栏顶部与移动端顶栏展示
    avatar: c.avatar || '',
    copyCode: c.copy?.code || '',
    copyLink: c.copy?.link || '',
    policeCode: c.police?.code || '',
    recordCode: c.police?.code || '',
    policeLink: c.police?.link || ''
  }
})

// 网站 LOGO 地址失效时不再展示，避免左栏顶部出现破图（换了地址自动重试）
const logoFailed = ref(false)
watch(() => site.value.avatar, () => {
  logoFailed.value = false
})

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

// 移动端底部 Tab 配置
const tabs = computed(() => {
  const uid = userStore.user?.id
  return [
    { key: 'home', to: '/', icon: 'bi-house-door-fill', label: '首页', exact: true },
    { key: 'goods', to: '/goods', icon: 'bi-shop', label: '商城', badge: '新' },
    { key: 'publish', to: '/manage/posts/write', icon: 'bi-plus-circle-fill', label: '发布', needLogin: true, highlight: true },
    { key: 'notif', to: '/user/notifications', icon: 'bi-bell-fill', label: '消息', needLogin: true },
    { key: 'mine', to: uid ? `/author/${uid}` : '/user', icon: 'bi-person-fill', label: '我的', needLogin: true }
  ]
})

function isActive(tab) {
  const p = route.path
  if (tab.exact) return p === tab.to
  return p === tab.to || p.startsWith(tab.to + '/')
}

function goTab(tab) {
  if (tab.needLogin && !userStore.isLogged) {
    router.push('/auth/login')
    return
  }
  router.push(tab.to)
}

// 解析自定义导航链接：格式 "跳转文字 || 跳转链接"，一行一个
const customNavLinks = computed(() => {
  const raw = siteStore.config?.custom_nav_links || ''
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

// 封禁检测：当前用户被封禁时自动弹出申诉弹窗（同一会话只弹一次）
const banDialogRef = ref(null)
const banShown = ref(false)

function checkBan() {
  const banned = userStore.user?.result?.ban?.is_banned
  if (banned && !banShown.value) {
    banShown.value = true
    banDialogRef.value?.show()
  }
  if (!banned) banShown.value = false
}

// 登录态刷新后（登录/解封/申诉）同步检测
watch(() => userStore.user?.result?.ban?.is_banned, checkBan)

onMounted(() => {
  siteStore.load()
  loadPages()
  // 先同步登录态（含封禁状态）再检测，避免读到未就绪的 user
  userStore.ensureLogin().then(checkBan)
})
</script>

<style scoped>
.layout {
  min-height: 100vh;
  background: var(--bg);
}

/* 移动端顶栏（默认隐藏，仅手机端显示） */
.mobile-topbar {
  display: none;
}
.mobile-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}
.mobile-user {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  border-radius: 50%;
  overflow: hidden;
  border: 1px solid var(--border);
  background: var(--bg-soft);
  color: var(--text-soft);
  font-size: 12px;
  text-decoration: none;
  flex-shrink: 0;
}
.mobile-avatar {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

/* 移动端底部 Tab Bar（默认隐藏） */
.mobile-tabbar {
  display: none;
}
.tab-item {
  position: relative;
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 6px 2px 8px;
  color: var(--text-muted);
  cursor: pointer;
  transition: color 0.2s;
  -webkit-tap-highlight-color: transparent;
  user-select: none;
}
.tab-icon {
  font-size: 21px;
  line-height: 1;
  margin-bottom: 3px;
}
.tab-label {
  font-size: 11px;
  line-height: 1;
  letter-spacing: 1px;
}
.tab-badge {
  position: absolute;
  top: 2px;
  left: calc(50% + 6px);
  min-width: 16px;
  height: 16px;
  padding: 0 4px;
  border-radius: 8px;
  background: var(--danger);
  color: #fff;
  font-size: 10px;
  line-height: 16px;
  text-align: center;
  font-weight: 600;
  border: 1.5px solid var(--bg-card);
  box-sizing: border-box;
}
.tab-item.active {
  color: var(--danger);
}
/* 中间「发布」按钮：凸起的圆形大按钮 */
.tab-item.highlight {
  justify-content: flex-start;
}
.tab-item.highlight .tab-icon {
  width: 46px;
  height: 46px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: -22px 0 4px;
  font-size: 26px;
  color: #fff;
  background: linear-gradient(135deg, var(--primary), var(--primary-deep));
  border-radius: 50%;
  border: 3px solid var(--bg-card);
  box-shadow: 0 4px 14px rgba(0, 0, 0, 0.18);
}
.tab-item.highlight .tab-label {
  color: var(--text-soft);
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
/* 网站 LOGO：配了 LOGO 时它就是左栏顶部唯一内容（不再显示标题/描述）
   方形图标按 96px 展示，横向 LOGO 自动缩到栏宽内，不裁切 */
.site-card__logo {
  display: block;
  margin: 0 auto;
  max-width: 100%;
  max-height: 96px;
  width: auto;
  height: auto;
  object-fit: contain;
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
  background: var(--accent-soft);
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
  .mobile-topbar {
    position: sticky;
    top: 0;
    z-index: 200;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    padding: 10px 16px;
    background: var(--bg);
    border-bottom: 1px solid var(--border-soft);
    backdrop-filter: blur(8px);
  }
  .mobile-brand {
    display: flex;
    align-items: center;
    gap: 8px;
    font-family: var(--font-serif);
    font-size: 17px;
    font-weight: 600;
    color: var(--text);
    letter-spacing: 1px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    min-width: 0;
  }
  /* 网站 LOGO：移动端顶栏只留一个小图标 */
  .mobile-brand__logo {
    width: 24px;
    height: 24px;
    flex-shrink: 0;
    object-fit: contain;
  }
  /* 手机端隐藏左栏与底部 footer，由顶栏 + 底部 Tab Bar 接管导航 */
  .layout-left,
  .layout-footer {
    display: none;
  }
  .layout-body {
    grid-template-columns: 1fr;
    padding: 16px 16px calc(72px + env(safe-area-inset-bottom));
  }
  /* 底部 Tab Bar */
  .mobile-tabbar {
    position: fixed;
    left: 0;
    right: 0;
    bottom: 0;
    z-index: 200;
    display: flex;
    align-items: stretch;
    justify-content: space-around;
    height: calc(56px + env(safe-area-inset-bottom));
    padding-bottom: env(safe-area-inset-bottom);
    background: var(--bg-card);
    border-top: 1px solid var(--border-soft);
    box-shadow: 0 -2px 12px rgba(0, 0, 0, 0.04);
  }
  .tab-item {
    padding-top: 8px;
  }
  .tab-item.active::before {
    content: '';
    position: absolute;
    top: 0;
    left: 50%;
    transform: translateX(-50%);
    width: 22px;
    height: 3px;
    border-radius: 0 0 3px 3px;
    background: var(--danger);
  }
  .nav-item.active::before {
    display: none;
  }
}
</style>
