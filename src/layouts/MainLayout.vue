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

        <!-- 全局搜索（独立页面 /search，Ctrl+K 可直达） -->
        <router-link to="/search" class="btn btn-ghost btn-sm btn-block" active-class="active">
          <i class="bi bi-search" />
          <span>搜索</span>
          <kbd class="search-kbd">Ctrl K</kbd>
        </router-link>

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
      <div class="footer-card">
        <!-- 品牌 + 快捷链接 -->
        <div class="footer-top">
          <div class="footer-brand">
            <span class="footer-brand__name">{{ site.title }}</span>
            <p v-if="site.description" class="footer-brand__desc">{{ site.description }}</p>
          </div>

          <nav class="footer-links" aria-label="页脚导航">
            <!-- 用户协议 -->
            <router-link class="footer-link" to="/agreement" active-class="is-active">
              <i class="bi bi-file-earmark-text" aria-hidden="true" />
              <span>用户协议</span>
            </router-link>
            <!-- 隐私协议 -->
            <router-link class="footer-link" to="/privacy" active-class="is-active">
              <i class="bi bi-shield-check" aria-hidden="true" />
              <span>隐私协议</span>
            </router-link>
            <!-- 小黑屋（封禁公示） -->
            <router-link class="footer-link" to="/blackroom" active-class="is-active">
              <i class="bi bi-door-closed" aria-hidden="true" />
              <span>小黑屋</span>
            </router-link>
          </nav>
        </div>

        <div class="footer-divider" aria-hidden="true" />

        <!-- 版权 / 备案 / 技术信息 -->
        <div class="footer-bottom">
          <p class="footer-copy">
            <i class="bi bi-c-circle" aria-hidden="true" />
            <span>{{ year }} {{ site.title }} · 保留所有权利</span>
          </p>

          <div class="footer-meta">
            <span v-if="site.copyCode" class="footer-record">
              <i class="bi bi-patch-check" aria-hidden="true" />
              <a
                v-if="site.copyLink"
                :href="site.copyLink"
                target="_blank"
                rel="noopener noreferrer"
              >{{ site.copyCode }}</a>
              <template v-else>{{ site.copyCode }}</template>
            </span>
            <span v-if="site.policeCode" class="footer-record">
              <i class="bi bi-shield-check" aria-hidden="true" />
              <a
                v-if="site.policeLink"
                :href="site.policeLink"
                target="_blank"
                rel="noopener noreferrer"
              >{{ site.policeCode }}</a>
              <template v-else>{{ site.policeCode }}</template>
            </span>
            <span class="footer-record footer-record--powered">
              <i class="bi bi-brush" aria-hidden="true" />
              <span>
                Powered by
                <a href="https://github.com/zhu885744/inisv1" target="_blank" rel="noopener noreferrer">inisv1</a>
                ·
                <a href="https://github.com/zhu885744/Mellow" target="_blank" rel="noopener noreferrer">Mellow</a>
              </span>
            </span>
          </div>
        </div>
      </div>
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

    <!-- 全局封禁申诉弹窗（当前用户被封禁时自动弹出） -->
    <BanAppealDialog ref="banDialogRef" />

    <!-- 全局图片灯箱 -->
    <Lightbox />

    <!-- 右侧悬浮按钮 -->
    <FloatButtons />
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, computed, watch } from 'vue'
import SidebarRight from '@/components/SidebarRight.vue'
import Lightbox from '@/components/Lightbox.vue'
import FloatButtons from '@/components/FloatButtons.vue'
import BanAppealDialog from '@/components/BanAppealDialog.vue'
import { call } from '@/api/request'
import { useUserStore } from '@/stores/user'
import { useSiteStore } from '@/stores/site'
import { canEnterAdmin } from '@/utils/helper'
import { useRouter, useRoute } from 'vue-router'

const userStore = useUserStore()
const siteStore = useSiteStore()
const router = useRouter()
const route = useRoute()

// 签到（独立页面 /checkin）：未登录时不跳登录页，由页面自身给出登录引导
function onCheckinClick() {
  if (route.path !== '/checkin') router.push('/checkin')
}

// 全局搜索（独立页面 /search）：Ctrl/⌘ + K 直达
function openSearch() {
  if (route.path !== '/search') router.push('/search')
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

.layout-main {
  min-width: 0;
}

/* ==================== 全局页脚 ==================== */
.layout-footer {
  max-width: var(--content-max);
  margin: 20px auto 0;
  padding: 0 24px 32px;
  font-size: 12px;
  color: var(--text-muted);
}
/* 页脚本身做成一张「纸」：与内容卡同色系，靠边线区分层级（主题约定：阴影只给浮层） */
.footer-card {
  position: relative;
  padding: 20px 24px 16px;
  background: var(--bg-card);
  border: 1px solid var(--border-soft);
  border-radius: var(--radius-lg);
  overflow: hidden;
}
/* 顶部朱砂细线：呼应站点主色，中间亮两端淡 */
.footer-card::before {
  content: '';
  position: absolute;
  inset: 0 0 auto;
  height: 2px;
  background: linear-gradient(
    90deg,
    transparent 0%,
    var(--primary-soft) 42%,
    var(--accent-glow) 50%,
    var(--primary-soft) 58%,
    transparent 100%
  );
  opacity: 0.85;
}

.footer-top {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 14px 24px;
  flex-wrap: wrap;
}
.footer-brand {
  min-width: 0;
}
.footer-brand__name {
  display: inline-block;
  font-family: var(--font-serif);
  font-size: 15px;
  font-weight: 700;
  letter-spacing: 0.5px;
  color: var(--text);
}
.footer-brand__desc {
  margin: 5px 0 0;
  max-width: 46ch;
  font-size: 12px;
  line-height: 1.7;
  color: var(--text-light);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* 快捷链接：胶囊状，hover / 当前页有淡朱砂底 */
.footer-links {
  display: flex;
  align-items: center;
  gap: 4px;
  flex-wrap: wrap;
}
.footer-link {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 5px 10px;
  border-radius: 999px;
  color: var(--text-muted);
  transition: color 0.2s, background-color 0.2s;
}
.footer-link i {
  font-size: 12px;
  color: var(--text-light);
  transition: color 0.2s;
}
.footer-link:hover {
  color: var(--primary-deep);
  background: var(--accent-wash);
}
.footer-link:hover i {
  color: var(--primary);
}
.footer-link.is-active {
  color: var(--primary-deep);
  background: var(--accent-soft);
}
.footer-link.is-active i {
  color: var(--primary);
}

.footer-divider {
  height: 1px;
  margin: 16px 0 12px;
  background: linear-gradient(90deg, var(--border-soft), transparent 85%);
}

.footer-bottom {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px 20px;
  flex-wrap: wrap;
  color: var(--text-light);
}
.footer-copy,
.footer-meta,
.footer-record {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  margin: 0;
}
.footer-meta {
  gap: 14px;
  flex-wrap: wrap;
}
.footer-copy i,
.footer-record i {
  font-size: 12px;
  color: var(--text-light);
}
.footer-record a,
.layout-footer a {
  color: var(--text-muted);
  transition: color 0.2s;
}
.footer-record a:hover,
.layout-footer a:hover {
  color: var(--primary);
}

/* 窄屏：品牌 / 链接 / 版权居中对齐（< 640px 时整个页脚由底部 Tab Bar 取代） */
@media (max-width: 900px) {
  .footer-top,
  .footer-bottom {
    flex-direction: column;
    align-items: center;
    text-align: center;
  }
  .footer-brand__desc {
    max-width: none;
  }
  .footer-links {
    justify-content: center;
  }
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
