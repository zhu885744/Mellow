<template>
  <div>
    <SectionTitle title="用户中心" />

    <div class="user-layout">
      <!-- 侧边菜单 -->
      <aside class="user-menu card card-pad-sm">
        <div class="user-head">
          <img :src="user?.avatar || defaultAvatar" class="avatar" />
          <div class="name">{{ user?.nickname }}</div>
          <div class="level">{{ user?.title || '普通用户' }}</div>
        </div>
        <nav class="menu">
          <router-link to="/user/profile" class="menu-item">
            <span>👤</span> 个人资料
          </router-link>
          <router-link to="/user/contact" class="menu-item">
            <span>📇</span> 联系方式
          </router-link>
          <router-link to="/user/security" class="menu-item">
            <span>🔒</span> 账号安全
          </router-link>
          <router-link to="/user/collections" class="menu-item">
            <span>⭐</span> 我的收藏
          </router-link>
          <router-link to="/user/likes" class="menu-item">
            <span>👍</span> 我的点赞
          </router-link>
          <router-link to="/user/notifications" class="menu-item">
            <span>🔔</span> 消息通知
            <span v-if="notif.count > 0" class="badge">{{ notif.count }}</span>
          </router-link>
          <router-link v-if="isAdmin" to="/settings" class="menu-item">
            <span>🛠️</span> 站点配置
          </router-link>
          <button class="menu-item danger" @click="userStore.logout">
            <span>🚪</span> 退出登录
          </button>
        </nav>
      </aside>

      <!-- 内容 -->
      <div class="user-body">
        <router-view />
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import SectionTitle from '@/components/SectionTitle.vue'
import { useUserStore } from '@/stores/user'
import { useNotificationStore } from '@/stores/notification'
import { storeToRefs } from 'pinia'
import { isAdmin as helperIsAdmin } from '@/utils/helper'

const userStore = useUserStore()
const notif = useNotificationStore()
const { user } = storeToRefs(userStore)

const isAdmin = computed(() => helperIsAdmin(user.value))

const defaultAvatar = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 80"><circle cx="40" cy="40" r="40" fill="%23e8e6dd"/></svg>'
</script>

<style scoped>
.user-layout {
  display: grid;
  grid-template-columns: 220px 1fr;
  gap: 16px;
  align-items: start;
}
.user-body {
  min-width: 0;
}
.user-menu {
  position: sticky;
  top: 16px;
}
.user-head {
  text-align: center;
  padding: 16px 0;
  border-bottom: 1px solid var(--border-soft);
}
.avatar {
  width: 64px;
  height: 64px;
  border-radius: 50%;
  margin: 0 auto 8px;
  object-fit: cover;
}
.name {
  font-size: 14px;
  font-weight: 500;
}
.level {
  font-size: 11px;
  color: var(--primary-deep);
  margin-top: 2px;
}
.menu {
  display: flex;
  flex-direction: column;
  padding: 8px 0;
}
.menu-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 16px;
  color: var(--text-soft);
  font-size: 13px;
  text-decoration: none;
  background: none;
  border: none;
  text-align: left;
  cursor: pointer;
  transition: all 0.15s;
}
.menu-item:hover {
  background: var(--bg-muted);
  color: var(--primary);
}
.menu-item.router-link-active {
  background: rgba(184, 153, 104, 0.1);
  color: var(--primary-deep);
  font-weight: 500;
  border-right: 3px solid var(--primary);
}
.menu-item.danger {
  color: var(--danger);
}
.menu-item.danger:hover {
  color: var(--danger);
  background: rgba(217, 84, 77, 0.08);
}
.badge {
  margin-left: auto;
  min-width: 18px;
  height: 18px;
  border-radius: 9px;
  background: var(--danger);
  color: #fff;
  font-size: 11px;
  line-height: 18px;
  text-align: center;
  padding: 0 6px;
}

@media (max-width: 768px) {
  .user-layout {
    grid-template-columns: 1fr;
  }
  .user-menu {
    position: static;
  }
  .menu {
    flex-direction: row;
    overflow-x: auto;
    padding: 8px;
  }
  .menu-item {
    white-space: nowrap;
  }
}
</style>