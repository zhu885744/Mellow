<template>
  <div class="user" :class="{ 'sidebar-collapsed': collapsed }">
    <!-- 移动端遮罩：点击空白处收起侧边栏 -->
    <div v-if="collapsed" class="user-mask" @click="collapsed = false" />
    <aside class="user-sidebar">
      <div class="user-brand">
        <i class="bi bi-person-badge" />
        <span class="user-brand-text">用户中心</span>
      </div>

      <nav class="user-nav">
        <template v-for="group in menuGroups" :key="group.label">
          <div class="user-nav-group">{{ group.label }}</div>
          <RouterLink
            v-for="item in group.items"
            :key="item.path"
            :to="item.path"
            class="user-nav-item"
            :class="{ active: isActive(item.path) }"
          >
            <i :class="item.icon" />
            <span class="user-nav-text">{{ item.name }}</span>
            <span v-if="item.badge" class="user-nav-badge">{{ item.badge }}</span>
          </RouterLink>
        </template>

        <div class="user-nav-group">创作</div>
        <RouterLink to="/manage" class="user-nav-item user-nav-ext">
          <i class="bi bi-grid-1x2" />
          <span class="user-nav-text">创作中心</span>
          <i class="bi bi-box-arrow-up-right user-nav-ext-ico" />
        </RouterLink>

        <template v-if="isAdmin">
          <div class="user-nav-group">管理</div>
          <RouterLink to="/user/site" class="user-nav-item user-nav-ext">
            <i class="bi bi-tools" />
            <span class="user-nav-text">站点配置</span>
          </RouterLink>
        </template>
      </nav>

      <div class="user-sidebar-footer">
        <RouterLink to="/" class="user-nav-item">
          <i class="bi bi-box-arrow-left" />
          <span class="user-nav-text">返回前台</span>
        </RouterLink>
        <button type="button" class="user-logout" @click="userStore.logout">
          <i class="bi bi-box-arrow-right" />
          <span class="user-nav-text">退出登录</span>
        </button>
      </div>
    </aside>

    <div class="user-main">
      <header class="user-topbar">
        <button class="user-toggle" type="button" title="菜单" @click="collapsed = !collapsed">
          <i class="bi bi-list" />
        </button>
        <div class="user-topbar-title">{{ currentTitle }}</div>
        <div class="user-topbar-right">
          <img :src="user?.avatar || defaultAvatar" class="user-topbar-avatar" alt="avatar" />
          <span class="user-topbar-name">{{ user?.nickname }}</span>
        </div>
      </header>

      <main class="user-content">
        <RouterView />
      </main>
    </div>
  </div>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { storeToRefs } from 'pinia'
import { useUserStore } from '@/stores/user'
import { useNotificationStore } from '@/stores/notification'
import { isAdmin as helperIsAdmin } from '@/utils/helper'

const defaultAvatar = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 80"><circle cx="40" cy="40" r="40" fill="%23e8e6dd"/><text x="50%25" y="55%25" text-anchor="middle" font-size="36" fill="%238a8a82" font-family="serif">用</text></svg>'

const route = useRoute()
const userStore = useUserStore()
const notif = useNotificationStore()
const { user } = storeToRefs(userStore)

const collapsed = ref(false)
const isAdmin = computed(() => helperIsAdmin(user.value))

const menuGroups = computed(() => [
  {
    label: '账户',
    items: [
      { path: '/user/profile', name: '个人资料', icon: 'bi bi-person' },
      { path: '/user/settings', name: '隐私设置', icon: 'bi bi-gear' },
      { path: '/user/contact', name: '联系方式', icon: 'bi bi-person-vcard' },
      { path: '/user/reward', name: '打赏设置', icon: 'bi bi-cash-coin' },
      { path: '/user/security', name: '账号安全', icon: 'bi bi-shield-lock' }
    ]
  },
  {
    label: '互动',
    items: [
      { path: '/user/notifications', name: '消息通知', icon: 'bi bi-bell', badge: notif.count > 0 ? notif.count : '' }
    ]
  }
])

// 菜单项总数用于标题匹配
const flatItems = computed(() => menuGroups.value.flatMap((g) => g.items))

function isActive(path) {
  return route.path === path
}

const currentTitle = computed(() => {
  if (route.path.startsWith('/manage')) return '创作中心'
  const hit = flatItems.value.find((i) => route.path === i.path)
  return hit?.name || '用户中心'
})

// 移动端：路由变化后自动收起抽屉（桌面端保持用户选择的折叠状态不变）
watch(() => route.path, () => {
  if (window.innerWidth <= 768) collapsed.value = false
})
</script>

<style scoped>
.user {
  display: flex;
  min-height: 100vh;
  background: var(--bg);
}
.user-sidebar {
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
.user-brand {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 18px 20px 12px;
  font-size: 17px;
  font-weight: 700;
  color: var(--primary);
  white-space: nowrap;
  overflow: hidden;
}
.user-card {
  display: flex;
  align-items: center;
  gap: 10px;
  margin: 0 12px 10px;
  padding: 10px;
  border-radius: var(--radius);
  background: var(--bg-muted);
  overflow: hidden;
}
.user-card-avatar {
  width: 38px;
  height: 38px;
  border-radius: 50%;
  object-fit: cover;
  flex-shrink: 0;
}
.user-card-info {
  min-width: 0;
}
.user-card-name {
  font-size: 14px;
  font-weight: 600;
  color: var(--text);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.user-card-level {
  margin-top: 2px;
  font-size: 12px;
  color: var(--primary-deep);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.user-nav {
  flex: 1;
  padding: 6px 12px;
  display: flex;
  flex-direction: column;
  gap: 2px;
  overflow-y: auto;
}
.user-nav-group {
  padding: 14px 12px 6px;
  font-size: 11px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--text-muted);
}
.user-nav-item {
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
.user-nav-item:hover {
  background: var(--bg-muted);
  color: var(--text);
}
.user-nav-item.active {
  background: rgba(184, 153, 104, 0.12);
  color: var(--primary);
  font-weight: 600;
}
.user-nav-ext {
  color: var(--primary-deep);
}
.user-nav-ext-ico {
  margin-left: auto;
  font-size: 11px;
  opacity: 0.7;
}
.user-nav-badge {
  margin-left: auto;
  min-width: 18px;
  height: 18px;
  padding: 0 6px;
  border-radius: 9px;
  background: var(--danger);
  color: #fff;
  font-size: 11px;
  line-height: 18px;
  text-align: center;
}

.user-sidebar-footer {
  padding: 12px;
  border-top: 1px solid var(--border);
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.user-logout {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  padding: 10px 12px;
  border: none;
  background: transparent;
  border-radius: var(--radius-sm);
  color: var(--danger);
  font-size: 14px;
  text-align: left;
  cursor: pointer;
  transition: background 0.15s;
}
.user-logout:hover {
  background: rgba(217, 84, 77, 0.1);
}

.user-main {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
}
.user-topbar {
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
.user-toggle {
  display: none;
  border: none;
  background: transparent;
  font-size: 20px;
  color: var(--text);
  cursor: pointer;
}
.user-topbar-title {
  font-size: 16px;
  font-weight: 600;
}
.user-topbar-right {
  margin-left: auto;
  display: flex;
  align-items: center;
  gap: 8px;
}
.user-topbar-avatar {
  width: 30px;
  height: 30px;
  border-radius: 50%;
  object-fit: cover;
}
.user-topbar-name {
  font-size: 14px;
  color: var(--text-soft);
}
.user-content {
  padding: 22px;
  flex: 1;
}

/* 移动端遮罩：桌面端不显示，仅窄屏通过媒体查询启用 */
.user-mask {
  display: none;
}
.sidebar-collapsed .user-sidebar {
  width: 64px;
}
.sidebar-collapsed .user-brand-text,
.sidebar-collapsed .user-nav-text,
.sidebar-collapsed .user-nav-group,
.sidebar-collapsed .user-card-info,
.sidebar-collapsed .user-nav-badge,
.sidebar-collapsed .user-nav-ext-ico {
  display: none;
}
.sidebar-collapsed .user-nav-item,
.sidebar-collapsed .user-logout {
  justify-content: center;
  padding: 10px;
}
.sidebar-collapsed .user-card {
  justify-content: center;
  padding: 10px 4px;
}

@media (max-width: 768px) {
  .user-mask {
    display: block;
    position: fixed;
    inset: 0;
    z-index: 25;
    background: rgba(0, 0, 0, 0.4);
  }
  .user-sidebar {
    position: fixed;
    z-index: 30;
    height: 100vh;
    transform: translateX(-100%);
    transition: transform 0.25s;
  }
  .sidebar-collapsed .user-sidebar {
    transform: translateX(0);
    width: 220px;
  }
  .sidebar-collapsed .user-brand-text,
  .sidebar-collapsed .user-nav-text,
  .sidebar-collapsed .user-nav-group,
  .sidebar-collapsed .user-card-info,
  .sidebar-collapsed .user-nav-badge,
  .sidebar-collapsed .user-nav-ext-ico {
    display: inline;
  }
  .sidebar-collapsed .user-nav-item,
  .sidebar-collapsed .user-logout {
    justify-content: flex-start;
    padding: 10px 12px;
  }
  .user-toggle {
    display: inline-flex;
  }
  .user-content {
    padding: 14px;
  }
}
</style>
