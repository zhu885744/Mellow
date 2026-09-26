<template>
  <div class="admin" :class="{ 'sidebar-collapsed': collapsed }">
    <!-- 移动端遮罩：点击空白处收起侧边栏 -->
    <div v-if="collapsed" class="admin-mask" @click="collapsed = false" />
    <aside class="admin-sidebar">
      <div class="admin-brand">
        <i class="bi bi-shield-lock" />
        <span class="admin-brand-text">Mellow 管理后台</span>
      </div>

      <nav class="admin-nav" v-if="menus.length">
        <RouterLink
          to="/admin/dashboard"
          class="admin-nav-item overview-item"
          active-class="active"
        >
          <i class="bi bi-speedometer2" />
          <span class="admin-nav-text">概览</span>
        </RouterLink>
        <template v-for="group in menus" :key="group.name">
          <div class="admin-nav-group">{{ group.label }}</div>
          <RouterLink
            v-for="child in group.children"
            :key="child.path"
            :to="child.path"
            class="admin-nav-item"
            active-class="active"
          >
            <span class="admin-nav-icon" v-if="child.isSvg" v-html="child.icon" />
            <i v-else :class="child.icon || 'bi bi-circle'" />
            <span class="admin-nav-text">{{ child.name }}</span>
          </RouterLink>
        </template>
      </nav>
      <div class="admin-nav-empty" v-else-if="!authReady">加载菜单中…</div>

      <div class="admin-sidebar-footer">
        <RouterLink to="/" class="admin-nav-item">
          <i class="bi bi-box-arrow-left" />
          <span class="admin-nav-text">返回前台</span>
        </RouterLink>
      </div>
    </aside>

    <div class="admin-main">
      <header class="admin-topbar">
        <button class="admin-toggle" type="button" @click="collapsed = !collapsed">
          <i class="bi bi-list" />
        </button>
        <div class="admin-topbar-title">{{ currentTitle }}</div>
        <div class="admin-topbar-right">
          <img :src="user?.avatar || defaultAvatar" class="admin-avatar" alt="avatar" />
          <span class="admin-user-name">{{ user?.nickname }}</span>
        </div>
      </header>

      <main class="admin-content">
        <RouterView />
      </main>
    </div>
  </div>
</template>

<script setup>
import { computed, ref, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { storeToRefs } from 'pinia'
import { useUserStore } from '@/stores/user'
import { useAuthPagesStore } from '@/stores/auth-pages'
import { adminAllowedPaths, canEnterAdmin } from '@/utils/helper'

const defaultAvatar = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 80"><circle cx="40" cy="40" r="40" fill="%23e8e6dd"/><text x="50%25" y="55%25" text-anchor="middle" font-size="36" fill="%238a8a82" font-family="serif">用</text></svg>'

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()
const { user } = storeToRefs(userStore)
const authPagesStore = useAuthPagesStore()

const collapsed = ref(false)
const authReady = ref(false)

// 分组定义：与参考主题一致（创作 / 管理 / 安全）
const groupDefs = [
  {
    name: 'create',
    label: '创作',
    items: [
      '/admin/article/write', '/admin/article', '/admin/article/group',
      '/admin/pages', '/admin/pages/write', '/admin/moments'
    ]
  },
  {
    name: 'manage',
    label: '管理',
    items: [
      '/admin/users', '/admin/comment', '/admin/placard', '/admin/banner',
      '/admin/tags', '/admin/level', '/admin/exp', '/admin/goods', '/admin/integral',
      '/admin/message',
      '/admin/links', '/admin/links/group', '/admin/attachment', '/admin/system'
    ]
  },
  {
    name: 'security',
    label: '安全',
    items: [
      '/admin/auth/rules', '/admin/auth/group', '/admin/api/keys', '/admin/auth/pages',
      '/admin/ip/black', '/admin/ip/white', '/admin/qps/warn'
    ]
  }
]

// icon 名称 → Bootstrap Icons（仅用于展示；auth-pages 自带 svg 优先）
const fallbackIcons = {
  article: 'bi bi-file-earmark-text',
  group: 'bi bi-collection',
  user: 'bi bi-people',
  comment: 'bi bi-chat-square-text',
  bell: 'bi bi-bell',
  banner: 'bi bi-images',
  tag: 'bi bi-tag',
  level: 'bi bi-bar-chart',
  link: 'bi bi-link-45deg',
  system: 'bi bi-gear',
  open: 'bi bi-box-arrow-up-right',
  rule: 'bi bi-shield-check',
  key: 'bi bi-key',
  qps: 'bi bi-speedometer2',
  black: 'bi bi-shield-x',
  white: 'bi bi-shield-plus',
  file: 'bi bi-paperclip'
}

/**
 * 解析菜单图标：
 * 1. 后端已是 Bootstrap Icons 类名（"bi bi-bag" 或 "bi-bag"）→ 直接使用；
 * 2. 旧版短名（article / group …）→ 查 fallbackIcons 映射；
 * 3. 其余 → 兜底圆圈。
 * 这样新老数据库（auth-pages.icon 两种形态）都能正确展示。
 */
function resolveIcon(name) {
  if (typeof name !== 'string' || !name.trim()) return 'bi bi-circle'
  const value = name.trim()
  if (value.includes('bi-')) return value.startsWith('bi ') ? value : `bi ${value}`
  return fallbackIcons[value] || 'bi bi-circle'
}

const menus = computed(() => {
  const flat = authPagesStore.getFlat || []
  if (!flat.length) return []

  // 允许访问的页面 path 集合（null = 拥有全部页面）
  const allowedPaths = adminAllowedPaths(user.value, flat)
  const byPath = Object.fromEntries(flat.map((p) => [p.path, p]))

  return groupDefs
    .map((g) => {
      const children = g.items
        .filter((path) => byPath[path]) // 仅保留系统实际存在的页面
        .filter((path) => !allowedPaths || allowedPaths.has(path)) // 按权限过滤
        .map((path) => {
          const p = byPath[path]
          const svg = p.svg || (typeof p.icon === 'string' && p.icon.includes('<svg') ? p.icon : '')
          return {
            path,
            name: p.name || path,
            icon: svg ? '' : resolveIcon(p.icon),
            isSvg: !!svg,
            svg
          }
        })
      return { ...g, children }
    })
    .filter((g) => g.children.length)
})

const currentTitle = computed(() => route.meta?.title || '后台管理')

// 权限守卫：没有后台页面权限的账号跳回首页
// （判定见 utils/helper.js 的 canEnterAdmin：超级管理员 / 组 key=admin / 勾了任意后台页面；
//   不能只认「组 key=admin」，否则非 admin 的运营组即使勾了部分页面也进不来）
if (!canEnterAdmin(user.value)) {
  router.replace('/')
}

// 取当前路径对应的后台页面（最长前缀匹配，如 /admin/article/edit/3 → /admin/article）
function pageOfPath(flat, path) {
  let matched = null
  flat.forEach((p) => {
    if ((path === p.path || path.startsWith(`${p.path}/`)) && (!matched || p.path.length > matched.path.length)) {
      matched = p
    }
  })
  return matched
}

/**
 * 路由级页面校验：手输 URL 打开没有权限的后台页面时，跳到第一个可见页面
 * （/admin/dashboard 是概览，不在页面权限清单里，能进后台即可访问）
 */
function guardRoute(path = route.path) {
  if (!path.startsWith('/admin/') || path === '/admin/dashboard') return

  const flat = authPagesStore.getFlat || []
  if (!flat.length) return

  const allowedPaths = adminAllowedPaths(user.value, flat)
  if (!allowedPaths) return

  const page = pageOfPath(flat, path)
  if (!page || allowedPaths.has(page.path)) return

  const first = menus.value[0]?.children?.[0]?.path
  router.replace(first || '/')
}

onMounted(async () => {
  await authPagesStore.ensureLoaded()
  authReady.value = true
  guardRoute()
})

// 路由变化：校验页面权限；移动端顺带自动收起抽屉（桌面端保持用户选择的折叠状态）
watch(() => route.path, (path) => {
  guardRoute(path)
  if (window.innerWidth <= 768) collapsed.value = false
})
</script>

<style scoped>
.admin {
  display: flex;
  min-height: 100vh;
  background: var(--bg);
}
.admin-sidebar {
  width: 220px;
  flex-shrink: 0;
  background: var(--bg-card);
  border-right: 1px solid var(--border);
  display: flex;
  flex-direction: column;
  position: sticky;
  top: 0;
  height: 100vh;
  transition: width 0.2s;
}
.admin-brand {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 18px 20px;
  font-size: 17px;
  font-weight: 700;
  color: var(--primary);
  white-space: nowrap;
  overflow: hidden;
}
.admin-nav {
  flex: 1;
  padding: 6px 12px;
  display: flex;
  flex-direction: column;
  gap: 2px;
  overflow-y: auto;
}
.admin-nav-group {
  padding: 14px 12px 6px;
  font-size: 11px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--text-muted);
}
.admin-nav-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 12px;
  border-radius: var(--radius-sm);
  color: var(--text-soft);
  text-decoration: none;
  font-size: 14px;
  white-space: nowrap;
  transition: all 0.15s;
}
.admin-nav-item:hover {
  background: var(--bg-muted);
  color: var(--text);
}
.admin-nav-item.active {
  background: var(--accent-soft);
  color: var(--primary);
  font-weight: 600;
}
.admin-nav-item.overview-item {
  margin-bottom: 6px;
  border-radius: 0;
}
.admin-nav-icon {
  width: 16px;
  height: 16px;
  display: inline-flex;
}
.admin-nav-icon :deep(svg) {
  width: 16px;
  height: 16px;
}
.admin-nav-empty {
  padding: 20px 12px;
  color: var(--text-muted);
  font-size: 13px;
}
.admin-sidebar-footer {
  padding: 12px;
  border-top: 1px solid var(--border);
}
.admin-main {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
}
.admin-topbar {
  position: sticky;
  top: 0;
  z-index: 10;
  display: flex;
  align-items: center;
  gap: 14px;
  height: 56px;
  padding: 0 20px;
  background: var(--bg-card);
  border-bottom: 1px solid var(--border);
}
.admin-toggle {
  display: none;
  border: none;
  background: transparent;
  font-size: 20px;
  color: var(--text);
  cursor: pointer;
}
.admin-topbar-title {
  font-size: 16px;
  font-weight: 600;
}
.admin-topbar-right {
  margin-left: auto;
  display: flex;
  align-items: center;
  gap: 8px;
}
.admin-avatar {
  width: 30px;
  height: 30px;
  border-radius: 50%;
  object-fit: cover;
}
.admin-user-name {
  font-size: 14px;
  color: var(--text-soft);
}
.admin-content {
  padding: 22px;
  flex: 1;
}

/* 移动端遮罩：桌面端不显示，仅窄屏通过媒体查询启用 */
.admin-mask {
  display: none;
}
.sidebar-collapsed .admin-sidebar {
  width: 64px;
}
.sidebar-collapsed .admin-brand-text,
.sidebar-collapsed .admin-nav-text,
.sidebar-collapsed .admin-nav-group {
  display: none;
}
.sidebar-collapsed .admin-nav-item {
  justify-content: center;
  padding: 10px;
}

@media (max-width: 768px) {
  .admin-mask {
    display: block;
    position: fixed;
    inset: 0;
    z-index: 25;
    background: rgba(0, 0, 0, 0.4);
  }
  .admin-sidebar {
    position: fixed;
    z-index: 30;
    height: 100vh;
    transform: translateX(-100%);
    transition: transform 0.25s;
  }
  .sidebar-collapsed .admin-sidebar {
    transform: translateX(0);
    width: 220px;
  }
  .sidebar-collapsed .admin-brand-text,
  .sidebar-collapsed .admin-nav-text,
  .sidebar-collapsed .admin-nav-group {
    display: inline;
  }
  .sidebar-collapsed .admin-nav-item {
    justify-content: flex-start;
    padding: 10px 12px;
  }
  .admin-toggle {
    display: inline-flex;
  }
}
</style>
