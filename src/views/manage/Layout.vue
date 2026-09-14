<template>
  <div class="manage" :class="{ 'sidebar-collapsed': collapsed }">
    <!-- 移动端遮罩：点击空白处收起侧边栏 -->
    <div v-if="collapsed" class="manage-mask" @click="collapsed = false" />
    <aside class="manage-sidebar">
      <div class="manage-brand">
        <i class="bi bi-pen" />
        <span class="manage-brand-text">创作中心</span>
      </div>

      <nav class="manage-nav">
        <RouterLink
          to="/manage"
          class="manage-nav-item"
          :class="{ active: isOverview }"
        >
          <i class="bi bi-grid-1x2" />
          <span class="manage-nav-text">概览</span>
        </RouterLink>

        <div class="manage-nav-group">内容</div>

        <RouterLink
          to="/manage/posts/write"
          class="manage-nav-item"
          :class="{ active: isWrite }"
        >
          <i class="bi bi-pencil-square" />
          <span class="manage-nav-text">写文章</span>
        </RouterLink>
        <RouterLink
          to="/manage/posts"
          class="manage-nav-item"
          :class="{ active: isPosts }"
        >
          <i class="bi bi-file-earmark-text" />
          <span class="manage-nav-text">我的文章</span>
        </RouterLink>
        <RouterLink
          to="/manage/moments"
          class="manage-nav-item"
          :class="{ active: isMoments }"
        >
          <i class="bi bi-chat-square-dots" />
          <span class="manage-nav-text">我的动态</span>
        </RouterLink>
        <RouterLink
          to="/manage/links"
          class="manage-nav-item"
          :class="{ active: isLinks }"
        >
          <i class="bi bi-link-45deg" />
          <span class="manage-nav-text">友链管理</span>
        </RouterLink>
      </nav>

      <div class="manage-sidebar-footer">
        <RouterLink to="/user" class="manage-nav-item">
          <i class="bi bi-person" />
          <span class="manage-nav-text">用户中心</span>
        </RouterLink>
        <RouterLink to="/" class="manage-nav-item">
          <i class="bi bi-box-arrow-left" />
          <span class="manage-nav-text">返回前台</span>
        </RouterLink>
      </div>
    </aside>

    <div class="manage-main">
      <header class="manage-topbar">
        <button class="manage-toggle" type="button" title="菜单" @click="collapsed = !collapsed">
          <i class="bi bi-list" />
        </button>
        <div class="manage-topbar-title">{{ currentTitle }}</div>
        <div class="manage-topbar-right">
          <img :src="user?.avatar || defaultAvatar" class="manage-avatar" alt="avatar" />
          <span class="manage-user-name">{{ user?.nickname }}</span>
        </div>
      </header>

      <main class="manage-content">
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

const defaultAvatar = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 80"><circle cx="40" cy="40" r="40" fill="%23e8e6dd"/><text x="50%25" y="55%25" text-anchor="middle" font-size="36" fill="%238a8a82" font-family="serif">用</text></svg>'

const route = useRoute()
const userStore = useUserStore()
const { user } = storeToRefs(userStore)

const collapsed = ref(false)

// 精确判断高亮：写文章/编辑 与 我的文章 路径有前缀重叠，不能用 active-class
const isWrite = computed(() => /^\/manage\/posts\/(write|edit)/.test(route.path))
const isPosts = computed(() => route.path === '/manage/posts')
const isMoments = computed(() => route.path.startsWith('/manage/moments'))
const isLinks = computed(() => route.path.startsWith('/manage/links'))
const isOverview = computed(() => route.path === '/manage' || route.path === '/manage/')

const currentTitle = computed(() => {
  if (isWrite.value) return '写文章'
  if (isPosts.value) return '我的文章'
  if (isMoments.value) return '我的动态'
  if (isLinks.value) return '友链管理'
  return '创作中心'
})

// 移动端：路由变化后自动收起抽屉（桌面端保持用户选择的折叠状态不变）
watch(() => route.path, () => {
  if (window.innerWidth <= 768) collapsed.value = false
})
</script>

<style scoped>
.manage {
  display: flex;
  min-height: 100vh;
  background: var(--bg);
}
.manage-sidebar {
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
.manage-brand {
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
.manage-nav {
  flex: 1;
  padding: 6px 12px;
  display: flex;
  flex-direction: column;
  gap: 2px;
  overflow-y: auto;
}
.manage-nav-group {
  padding: 14px 12px 6px;
  font-size: 11px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--text-muted);
}
.manage-nav-item {
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
.manage-nav-item:hover {
  background: var(--bg-muted);
  color: var(--text);
}
.manage-nav-item.active {
  background: var(--accent-soft);
  color: var(--primary);
  font-weight: 600;
}
.manage-sidebar-footer {
  padding: 12px;
  border-top: 1px solid var(--border);
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.manage-main {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
}
.manage-topbar {
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
.manage-toggle {
  display: none;
  border: none;
  background: transparent;
  font-size: 20px;
  color: var(--text);
  cursor: pointer;
}
.manage-topbar-title {
  font-size: 16px;
  font-weight: 600;
}
.manage-topbar-right {
  margin-left: auto;
  display: flex;
  align-items: center;
  gap: 8px;
}
.manage-avatar {
  width: 30px;
  height: 30px;
  border-radius: 50%;
  object-fit: cover;
}
.manage-user-name {
  font-size: 14px;
  color: var(--text-soft);
}
.manage-content {
  padding: 22px;
  flex: 1;
}

/* 移动端遮罩：桌面端不显示，仅窄屏通过媒体查询启用 */
.manage-mask {
  display: none;
}
.sidebar-collapsed .manage-sidebar {
  width: 64px;
}
.sidebar-collapsed .manage-brand-text,
.sidebar-collapsed .manage-nav-text,
.sidebar-collapsed .manage-nav-group {
  display: none;
}
.sidebar-collapsed .manage-nav-item {
  justify-content: center;
  padding: 10px;
}

@media (max-width: 768px) {
  .manage-mask {
    display: block;
    position: fixed;
    inset: 0;
    z-index: 25;
    background: rgba(0, 0, 0, 0.4);
  }
  .manage-sidebar {
    position: fixed;
    z-index: 30;
    height: 100vh;
    transform: translateX(-100%);
    transition: transform 0.25s;
  }
  .sidebar-collapsed .manage-sidebar {
    transform: translateX(0);
    width: 220px;
  }
  .sidebar-collapsed .manage-brand-text,
  .sidebar-collapsed .manage-nav-text,
  .sidebar-collapsed .manage-nav-group {
    display: inline;
  }
  .sidebar-collapsed .manage-nav-item {
    justify-content: flex-start;
    padding: 10px 12px;
  }
  .manage-toggle {
    display: inline-flex;
  }
  .manage-content {
    padding: 14px;
  }
}
</style>
