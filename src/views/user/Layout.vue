<template>
  <div>
    <SectionTitle title="用户中心" />

    <!-- 顶部用户概览 -->
    <div class="user-head card card-pad-sm">
      <img :src="user?.avatar || defaultAvatar" class="avatar" />
      <div class="head-info">
        <div class="name">{{ user?.nickname }}</div>
        <div class="level">{{ user?.title || '普通用户' }}</div>
      </div>
      <button class="logout-btn" @click="userStore.logout">退出登录</button>
    </div>

    <!-- 顶部 Tab 导航 -->
    <nav class="tab-bar">
      <router-link to="/user/profile" class="tab-item">
        <span class="tab-ico">👤</span> 个人资料
      </router-link>
      <router-link to="/user/contact" class="tab-item">
        <span class="tab-ico">📇</span> 联系方式
      </router-link>
      <router-link to="/user/security" class="tab-item">
        <span class="tab-ico">🔒</span> 账号安全
      </router-link>
      <router-link to="/user/notifications" class="tab-item">
        <span class="tab-ico">🔔</span> 消息通知
        <span v-if="notif.count > 0" class="badge">{{ notif.count }}</span>
      </router-link>
      <router-link v-if="isAdmin" to="/settings" class="tab-item">
        <span class="tab-ico">🛠️</span> 站点配置
      </router-link>
    </nav>

    <!-- 内容 -->
    <div class="user-body">
      <router-view />
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
.user-head {
  display: flex;
  align-items: center;
  gap: 14px;
  margin-bottom: 12px;
}
.avatar {
  width: 56px;
  height: 56px;
  border-radius: 50%;
  object-fit: cover;
  flex-shrink: 0;
}
.head-info {
  flex: 1;
  min-width: 0;
}
.name {
  font-size: 16px;
  font-weight: 600;
}
.level {
  font-size: 12px;
  color: var(--primary-deep);
  margin-top: 2px;
}
.logout-btn {
  flex-shrink: 0;
  padding: 7px 14px;
  font-size: 13px;
  color: var(--danger);
  background: transparent;
  border: 1px solid var(--danger);
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.15s;
}
.logout-btn:hover {
  background: rgba(217, 84, 77, 0.08);
}
.tab-bar {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  padding: 6px;
  background: var(--bg-muted);
  border-radius: 12px;
  margin-bottom: 16px;
}
.tab-item {
  position: relative;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  font-size: 13px;
  color: var(--text-soft);
  text-decoration: none;
  border-radius: 8px;
  white-space: nowrap;
  transition: all 0.15s;
}
.tab-item:hover {
  background: var(--bg-base);
  color: var(--primary);
}
.tab-item.router-link-active {
  background: var(--bg-base);
  color: var(--primary-deep);
  font-weight: 600;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.06);
}
.tab-ico {
  font-size: 14px;
}
.badge {
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
.user-body {
  min-width: 0;
}

@media (max-width: 768px) {
  .tab-bar {
    flex-wrap: nowrap;
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
  }
  .tab-item {
    flex-shrink: 0;
  }
}
</style>