<template>
  <!-- 移动端底部 Tab Bar（仅手机端显示，见样式里的媒体查询） -->
  <nav class="mobile-tabbar" aria-label="主导航">
    <button
      v-for="tab in tabs"
      :key="tab.key"
      type="button"
      class="tab-item"
      :class="{
        'is-active': isActive(tab),
        highlight: tab.highlight,
        'is-open': tab.action === 'publish' && publishOpen
      }"
      :aria-label="tab.ariaLabel || tab.label"
      :aria-current="isActive(tab) ? 'page' : undefined"
      :aria-expanded="tab.action === 'publish' ? publishOpen : undefined"
      @click="onTabClick(tab)"
    >
      <span v-if="tab.badge" class="tab-badge">{{ tab.badge }}</span>
      <i class="bi tab-icon" :class="tab.icon" />
      <!-- label 为空时整行不渲染（发布 tab 只留圆形按钮，见 ariaLabel） -->
      <span v-if="tab.label" class="tab-label">{{ tab.label }}</span>
    </button>
  </nav>

  <!-- 发布面板遮罩：点空白收起（z-index 低于 Tab Bar，方便直接切其它 tab） -->
  <Transition name="publish-fade">
    <div v-if="publishOpen" class="publish-mask" @click="publishOpen = false" />
  </Transition>

  <!-- 发布面板：中间「发布」按钮展开，发文章 / 发动态 -->
  <Transition name="publish-pop">
    <div v-if="publishOpen" class="publish-panel" role="menu" aria-label="发布">
      <button
        v-for="item in PUBLISH_ACTIONS"
        :key="item.key"
        type="button"
        class="publish-item"
        role="menuitem"
        @click="goPublish(item)"
      >
        <span class="publish-item-icon"><i :class="item.icon" aria-hidden="true" /></span>
        <span class="publish-item-text">
          <strong>{{ item.label }}</strong>
          <small>{{ item.desc }}</small>
        </span>
      </button>
    </div>
  </Transition>

  <!-- 发动态：动态列表页已下线，改用首页同一个发布弹窗（components/MomentComposeDialog.vue） -->
  <MomentComposeDialog v-model:visible="composeOpen" />
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { storeToRefs } from 'pinia'
import { useRoute, useRouter } from 'vue-router'
import { useUserStore } from '@/stores/user'
import { useNotificationStore } from '@/stores/notification'
import MomentComposeDialog from './MomentComposeDialog.vue'

/**
 * 移动端底部 Tab Bar
 *
 * 为什么抽成独立组件：用户中心（views/user/*）挂在 views/user/Layout.vue 下，
 * 与 MainLayout 是两套壳。底栏原先只写在 MainLayout 里，导致点进「我的」后底栏消失、
 * 只能靠抽屉返回。抽出来后两套壳共用同一份底栏，行为完全一致。
 *
 * 未读角标与消息轮询也放在这里：底栏是角标唯一的展示位置，
 * 组件一挂载就保证有轮询（startPolling 内部会先清掉旧定时器，重复调用是安全的）。
 */
const route = useRoute()
const router = useRouter()
const userStore = useUserStore()
const notif = useNotificationStore()
const { count: notifCount } = storeToRefs(notif)

// 消息未读角标：未登录不显示；超过 99 显示 99+
const unreadBadge = computed(() => {
  if (!userStore.isLogged) return ''
  const total = Number(notifCount.value) || 0
  if (total <= 0) return ''
  return total > 99 ? '99+' : String(total)
})

// 底部 Tab 配置
const tabs = computed(() => [
  { key: 'home', to: '/', icon: 'bi-house-door-fill', label: '首页', exact: true },
  { key: 'goods', to: '/goods', icon: 'bi-shop', label: '商城' },
  // 发布按钮：不直接跳转，点击展开「发文章 / 发动态」面板
  { key: 'publish', to: '/manage/posts/write', icon: 'bi-plus-circle-fill', label: '', ariaLabel: '发布', needLogin: true, highlight: true, action: 'publish' },
  // badge 响应式取消息未读数
  { key: 'notif', to: '/user/notifications', icon: 'bi-bell-fill', label: '消息', needLogin: true, badge: unreadBadge.value },
  // 「我的」进用户中心聚合页；个人主页从页内昵称进入（/author/:id）
  { key: 'mine', to: '/user', icon: 'bi-person-fill', label: '我的', needLogin: true }
])

// 当前选中的 tab（唯一）：取「匹配得最具体」的那个。
//
// 为什么不能只做前缀匹配：「我的」的 to 是 /user，而「消息」的页面 /user/notifications
// 正好落在它下面 —— 单看 startsWith 会让「消息」和「我的」同时高亮。
// 规则：先看精确命中（带 exact 的 tab，如首页），否则在命中的 tab 里取 to 最长的一个：
//   /user/notifications → 消息（19 字符）胜过 我的（5 字符）
//   /user/integral      → 只有 我的 命中，所以用户中心各子页仍保持「我的」选中
const activeKey = computed(() => {
  const p = route.path
  let best = null
  for (const tab of tabs.value) {
    if (tab.exact) {
      if (p === tab.to) return tab.key
      continue
    }
    if (p !== tab.to && !p.startsWith(tab.to + '/')) continue
    if (!best || tab.to.length > best.to.length) best = tab
  }
  return best ? best.key : null
})

function isActive(tab) {
  return activeKey.value === tab.key
}

function goTab(tab) {
  if (tab.needLogin && !userStore.isLogged) {
    router.push('/auth/login')
    return
  }
  router.push(tab.to)
}

// 中间「发布」按钮：展开面板；其余 tab 正常跳转
function onTabClick(tab) {
  if (tab.action === 'publish') {
    togglePublish()
    return
  }
  goTab(tab)
}

// 发布面板：发文章 / 发动态（两个入口都需要登录）
const publishOpen = ref(false)
// 「发动态」不再跳页面（动态列表页已下线），就地打开发布弹窗
const composeOpen = ref(false)
const PUBLISH_ACTIONS = [
  { key: 'post', label: '发文章', desc: '写一篇图文文章', icon: 'bi-pencil-square', to: '/manage/posts/write' },
  { key: 'moment', label: '发动态', desc: '分享此刻的想法', icon: 'bi-chat-square-dots', action: 'compose' }
]

function togglePublish() {
  // 与其它 tab 的 needLogin 口径一致：未登录直接去登录页
  if (!userStore.isLogged) {
    router.push('/auth/login')
    return
  }
  publishOpen.value = !publishOpen.value
}

function goPublish(item) {
  publishOpen.value = false
  if (item.action === 'compose') {
    composeOpen.value = true
    return
  }
  router.push(item.to)
}

// 跳走（含点面板里的选项、切其它 tab）后自动收起
watch(
  () => route.path,
  () => {
    publishOpen.value = false
  }
)

// 未读角标依赖消息轮询：挂载即保证在跑
onMounted(() => {
  if (userStore.isLogged) notif.startPolling()
})

// 登录 / 登出时启停轮询
watch(
  () => userStore.isLogged,
  (v) => {
    if (v) notif.startPolling()
    else notif.stopPolling()
  }
)

// 切换页面时补一次刷新：轮询间隔 60 秒，光靠定时器新消息最久要等一分钟才出角标。
// 节流 30 秒，避免连续点导航时每次切页都发一轮请求。
let lastNotifRefresh = 0
watch(
  () => route.path,
  () => {
    if (!userStore.isLogged) return
    const now = Date.now()
    if (now - lastNotifRefresh < 30 * 1000) return
    lastNotifRefresh = now
    notif.refresh()
  }
)
</script>

<style scoped>
/* 默认隐藏（宽屏不显示） */
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
  /* 发布面板展开时「+」会转成「×」，这里给个过渡 */
  transition: transform 0.18s ease;
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
.tab-item.is-active {
  color: var(--danger);
}
/* 中间「发布」按钮：圆形大按钮（无文字标签，在格子内垂直居中） */
.tab-item.highlight {
  justify-content: center;
  /* 去掉格子的上下内边距：内容区正好是 56px 底栏高度，46px 圆钮能完整放下。
     否则内容区只剩 40px（8+8 内边距），而 column 方向上 height 是主轴尺寸，
     默认 flex-shrink: 1 会把圆钮压成 46×40 的椭圆（宽度方向有 align-items: center
     不参与收缩，所以只扁了高度）。 */
  padding: 0;
}
.tab-item.highlight .tab-icon {
  width: 46px;
  height: 46px;
  display: flex;
  align-items: center;
  justify-content: center;
  /* 原来靠 margin: -22px 0 4px 把圆钮凸出栏外并给下方标签留位，
     现在没有标签了，负边距只会让它贴着格子上沿 —— 去掉，交给 justify-content 居中 */
  margin: 0;
  /* 双保险：主轴方向禁止收缩，任何内边距/高度变化下都保持 46×46 的正圆 */
  flex-shrink: 0;
  font-size: 26px;
  color: #fff;
  background: linear-gradient(135deg, var(--primary), var(--primary-deep));
  border-radius: 50%;
  border: 3px solid var(--bg-card);
  box-shadow: 0 4px 14px rgba(0, 0, 0, 0.18);
}
/* 发布面板展开时：中间按钮的「+」转 45° 变「×」 */
.tab-item.is-open .tab-icon {
  transform: rotate(45deg);
}

/* ---------- 发布面板（发文章 / 发动态） ---------- */
.publish-mask {
  position: fixed;
  inset: 0;
  z-index: 150;
  background: rgba(0, 0, 0, 0.28);
}
.publish-panel {
  position: fixed;
  left: 12px;
  right: 12px;
  bottom: calc(56px + env(safe-area-inset-bottom) + 10px);
  z-index: 202;
  /* 两个入口一行两个（原来 flex column 各占一行，手机上显得很空）。
     用 minmax(0, 1fr) 而不是 1fr：避免长文案把列撑宽。 */
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 6px;
  padding: 6px;
  border: 1px solid var(--border-soft);
  border-radius: 4px;
  background: var(--bg-card);
  box-shadow: var(--shadow-md);
}
.publish-item {
  /* 半宽格子里改为竖排：图标在上、文字在下居中。
     横排（图标 + 两行文字）在 ~160px 宽时会把「写一篇图文文章」这类描述挤掉。 */
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  width: 100%;
  padding: 12px 8px;
  border: none;
  border-radius: 4px;
  background: transparent;
  color: var(--text);
  font-family: inherit;
  text-align: center;
  cursor: pointer;
  transition: background-color 0.16s;
}
.publish-item:hover,
.publish-item:active {
  background: var(--bg-muted);
}
.publish-item-icon {
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border-radius: 4px;
  background: var(--accent-soft);
  color: var(--primary-deep);
  font-size: 18px;
}
.publish-item-text {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  min-width: 0;
}
.publish-item-text strong {
  font-size: 14px;
  font-weight: 600;
}
.publish-item-text small {
  font-size: 12px;
  color: var(--text-muted);
}
/* 入场 / 收起动效 */
.publish-pop-enter-active,
.publish-pop-leave-active {
  transition: opacity 0.18s ease, transform 0.18s ease;
}
.publish-pop-enter-from,
.publish-pop-leave-to {
  opacity: 0;
  transform: translateY(8px);
}
.publish-fade-enter-active,
.publish-fade-leave-active {
  transition: opacity 0.18s ease;
}
.publish-fade-enter-from,
.publish-fade-leave-to {
  opacity: 0;
}
/* 宽屏（Tab Bar 不显示）时面板与遮罩一并隐藏：避免从手机端拉宽后残留 */
@media (min-width: 641px) {
  .publish-mask,
  .publish-panel {
    display: none;
  }
}

/* ---------- 手机端：固定到底部 ---------- */
@media (max-width: 640px) {
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
  .tab-item.is-active::before {
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
}
</style>
