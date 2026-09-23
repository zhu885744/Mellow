<template>
  <div class="admin-dashboard">
    <!-- 概览横幅：站点 / 版本 / 服务器时间 -->
    <section class="hero">
      <div class="hero-main">
        <div class="hero-user">
          <img class="hero-avatar" :src="avatar" :alt="nickname" @error="onAvatarError" />
          <div class="hero-line">
            <div class="hero-title">你好，{{ nickname }}</div>
            <div class="hero-sub">{{ siteTitle }} · 管理后台</div>
          </div>
        </div>
        <div class="hero-actions">
          <RouterLink to="/admin/article/write" class="btn btn-sm btn-primary">
            <i class="bi bi-pencil-square" /> 撰写文章
          </RouterLink>
          <RouterLink to="/admin/auth/pages" class="btn btn-sm">
            <i class="bi bi-layout-text-window" /> 菜单权限
          </RouterLink>
          <RouterLink to="/admin/system" class="btn btn-sm">
            <i class="bi bi-gear" /> 系统配置
          </RouterLink>
        </div>
      </div>

      <div class="hero-meta">
        <span class="meta-item" title="后端程序版本">
          <i class="bi bi-box-seam" /> INIS
          <b>{{ version.inis || '—' }}</b>
        </span>
        <span class="meta-item" title="当前主题版本">
          <i class="bi bi-palette" /> Mellow
          <b>{{ appVersion }}</b>
        </span>
        <span class="meta-item" title="后端 Go 运行环境版本">
          <i class="bi bi-cpu" /> Go
          <b>{{ version.go || '—' }}</b>
        </span>
        <span class="meta-item" title="服务器当前时间">
          <i class="bi bi-clock-history" /> 服务器时间
          <b>{{ serverTimeText || '—' }}</b>
        </span>
      </div>
    </section>

    <!-- 待办：有未处理事项时高亮 -->
    <section class="todo-row">
      <RouterLink
        v-for="t in todos"
        :key="t.key"
        :to="t.to"
        class="todo-item"
        :class="{ 'is-hot': !t.loading && t.count > 0 }"
      >
        <i :class="t.icon" />
        <span class="todo-label">{{ t.label }}</span>
        <span class="todo-count">{{ t.loading ? '···' : format(t.count) }}</span>
        <i class="bi bi-chevron-right todo-arrow" />
      </RouterLink>
    </section>

    <!-- 分组统计 -->
    <section v-for="group in groups" :key="group.title" class="stat-group">
      <header class="group-head">
        <i :class="group.icon" />
        <span class="group-title">{{ group.title }}</span>
        <span v-if="group.hint" class="group-hint">{{ group.hint }}</span>
      </header>
      <div class="stat-grid">
        <div v-for="s in group.items" :key="s.key" class="stat-card">
          <div class="stat-icon" :style="{ color: s.color }">
            <i :class="s.icon" />
          </div>
          <div class="stat-body">
            <div class="stat-value">
              <span v-if="s.loading">···</span>
              <span v-else-if="s.error" class="stat-error" :title="s.error">—</span>
              <span v-else>{{ format(s.value) }}</span>
            </div>
            <div class="stat-label">{{ s.label }}</div>
          </div>
        </div>
      </div>
    </section>

    <section class="panel">
      <div class="panel-title">关于后台</div>
      <ul class="panel-tips">
        <li><i class="bi bi-check-circle" /> 统计卡片并行请求各模块的 <code>/count</code> 接口，失败项显示 <code>—</code> 并悬停查看原因</li>
        <li><i class="bi bi-check-circle" /> 左侧菜单与「菜单权限」由 <code>auth-pages</code> + <code>auth-group</code> 控制，按当前账号权限过滤</li>
        <li><i class="bi bi-check-circle" /> 评论、内容审核与编辑器等开关集中在「系统配置」中统一管理</li>
      </ul>
    </section>
  </div>
</template>

<script setup>
/**
 * 后台概览（/admin/dashboard）
 *
 * 数据来源（已与后端 controller 对齐）：
 * - 各模块 <count> 接口返回 { code, data: 数字 }，data 直接是数量；
 * - goods/orders-all 返回 { data: { data: [...], count, page } }，数量取 count；
 * - integral/card-stats 返回 { data: { total, unused, used, expired, ... } }；
 * - 版本信息走 dev 类接口 /dev/info/version（公开，返回 { go, inis, text }）。
 * 统计口径差异：article/comment/goods/users 的 count 支持 where 过滤，
 * 因此「待审核」「今日新增」用 where 传 JSON 字符串（后端 IWhere 支持字符串 JSON）。
 */
import { ref, reactive, computed, onMounted } from 'vue'
import { storeToRefs } from 'pinia'
import { call, devService } from '@/api/request'
import { useUserStore } from '@/stores/user'
import { useSiteStore } from '@/stores/site'
import pkg from '../../../package.json'

const userStore = useUserStore()
const siteStore = useSiteStore()
const { user } = storeToRefs(userStore)

const appVersion = pkg.version || '—'

const defaultAvatar =
  'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 80"><circle cx="40" cy="40" r="40" fill="%23e8e6dd"/></svg>'

const nickname = computed(() => user.value?.nickname || '管理员')
const avatar = ref(user.value?.avatar || defaultAvatar)
const siteTitle = computed(() => siteStore.config?.title || 'INIS')

function onAvatarError(e) {
  e.target.src = defaultAvatar
}

// ---------- 版本 / 服务器时间 ----------
const version = reactive({ inis: '', go: '' })
const serverTimeText = ref('')

async function loadVersion() {
  try {
    // dev 类接口不走 /api 前缀，响应拦截器已剥离为 { code, msg, data }
    const { code, data } = await devService.get('/dev/info/version')
    if (code === 200 && data) {
      version.inis = data.inis || ''
      version.go = data.go || ''
    }
  } catch {
    /* 版本接口不可用时保持占位 */
  }

  try {
    const { code, data } = await devService.get('/dev/info/time')
    if (code === 200 && data) {
      // 优先用后端本机格式化好的 date（避免按访客浏览器时区二次换算）
      if (data.date) {
        serverTimeText.value = data.date
        return
      }
      if (typeof data.unix === 'number') {
        serverTimeText.value = formatTime(data.unix * 1000)
        return
      }
    }
  } catch {
    /* 回退本地时间 */
  }
  serverTimeText.value = formatTime(Date.now())
}

function formatTime(ms) {
  const d = new Date(ms)
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

// ---------- 统计定义 ----------
function startOfToday() {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return Math.floor(d.getTime() / 1000)
}

const C = {
  blue: '#3b82f6',
  amber: '#f59e0b',
  green: '#10b981',
  violet: '#8b5cf6',
  pink: '#ec4899',
  sky: '#0ea5e9',
  red: '#ef4444',
  teal: '#14b8a6'
}

const groupDefs = [
  {
    title: '内容',
    icon: 'bi bi-journal-text',
    items: [
      { key: 'article', label: '文章', icon: 'bi bi-file-earmark-text', color: 'var(--primary)', ctrl: 'article' },
      { key: 'moments', label: '动态', icon: 'bi bi-chat-square-quote', color: C.amber, ctrl: 'moments' },
      { key: 'pages', label: '独立页面', icon: 'bi bi-window', color: C.sky, ctrl: 'pages' },
      { key: 'comment', label: '评论', icon: 'bi bi-chat-square-text', color: C.blue, ctrl: 'comment' },
      { key: 'tags', label: '标签', icon: 'bi bi-tags', color: C.pink, ctrl: 'tags' },
      { key: 'articleGroup', label: '文章分类', icon: 'bi bi-collection', color: C.teal, ctrl: 'article-group' }
    ]
  },
  {
    title: '用户与会员',
    icon: 'bi bi-people',
    items: [
      { key: 'users', label: '用户', icon: 'bi bi-people', color: C.violet, ctrl: 'users' },
      { key: 'level', label: '等级', icon: 'bi bi-graph-up-arrow', color: C.green, ctrl: 'level' },
      { key: 'exp', label: '经验流水', icon: 'bi bi-star-half', color: C.amber, ctrl: 'exp' }
    ]
  },
  {
    title: '兑换与附件',
    icon: 'bi bi-bag',
    items: [
      { key: 'goods', label: '商品', icon: 'bi bi-bag', color: C.violet, ctrl: 'goods' },
      {
        key: 'orders',
        label: '兑换订单',
        icon: 'bi bi-receipt',
        color: C.blue,
        ctrl: 'goods',
        method: 'orders-all',
        params: { page: 1, limit: 1 },
        // orders-all 返回 { data: { data, count, page } }
        pick: (payload) => payload?.count ?? 0
      },
      {
        key: 'cards',
        label: '积分卡密',
        icon: 'bi bi-coin',
        color: C.amber,
        ctrl: 'integral',
        method: 'card-stats',
        pick: (payload) => payload?.total ?? 0
      },
      { key: 'attachment', label: '附件', icon: 'bi bi-folder2-open', color: C.green, ctrl: 'attachment' }
    ]
  },
  {
    title: '站点与安全',
    icon: 'bi bi-shield-lock',
    items: [
      { key: 'links', label: '友链', icon: 'bi bi-link-45deg', color: C.green, ctrl: 'links' },
      { key: 'linksGroup', label: '友链分组', icon: 'bi bi-diagram-3', color: C.teal, ctrl: 'links-group' },
      { key: 'banner', label: '轮播', icon: 'bi bi-images', color: C.red, ctrl: 'banner' },
      { key: 'placard', label: '公告', icon: 'bi bi-megaphone', color: C.teal, ctrl: 'placard' },
      { key: 'authPages', label: '后台页面', icon: 'bi bi-layout-text-window', color: C.sky, ctrl: 'auth-pages' },
      { key: 'apiKeys', label: '接口密钥', icon: 'bi bi-key', color: C.amber, ctrl: 'api-keys' }
    ]
  },
  {
    title: '今日新增',
    icon: 'bi bi-calendar-day',
    hint: '按服务器本地时间零点起算',
    items: [
      {
        key: 'todayArticle',
        label: '文章',
        icon: 'bi bi-file-earmark-plus',
        color: 'var(--primary)',
        ctrl: 'article',
        params: { where: JSON.stringify({ create_time: { $gte: startOfToday() } }) }
      },
      {
        key: 'todayComment',
        label: '评论',
        icon: 'bi bi-chat-dots',
        color: C.blue,
        ctrl: 'comment',
        params: { where: JSON.stringify({ create_time: { $gte: startOfToday() } }) }
      },
      {
        key: 'todayUsers',
        label: '新用户',
        icon: 'bi bi-person-plus',
        color: C.violet,
        ctrl: 'users',
        params: { where: JSON.stringify({ create_time: { $gte: startOfToday() } }) }
      }
    ]
  }
]

// 待办项：数量 > 0 时高亮，点击直达对应页面
const todoDefs = [
  {
    key: 'todoOrders',
    label: '待发货订单',
    icon: 'bi bi-truck',
    to: '/admin/goods',
    ctrl: 'goods',
    method: 'orders-all',
    // 后端 orders-all 用 utils.Is.Empty 判断 status，数字 0 会被当作空值跳过，
    // 必须传字符串 '0'（tinyint 与 '0' 比较由 MySQL 隐式转换）
    params: { page: 1, limit: 1, status: '0' },
    pick: (payload) => payload?.count ?? 0
  },
  {
    key: 'todoAudit',
    label: '待审核文章',
    icon: 'bi bi-clock-history',
    to: '/admin/article',
    ctrl: 'article',
    params: { where: JSON.stringify({ audit: 0, status: 1 }) }
  }
]

const groups = ref(
  groupDefs.map((g) => ({
    ...g,
    items: g.items.map((item) => ({ ...item, value: 0, error: '', loading: true }))
  }))
)
const todos = ref(todoDefs.map((t) => ({ ...t, count: 0, loading: true })))

function format(n) {
  return typeof n === 'number' ? n.toLocaleString('zh-CN') : n
}

// 从接口返回里取出数量：count 接口 data 直接是数字，其余用 pick 自定义解析
function resolveCount(item, payload) {
  if (typeof item.pick === 'function') return Number(item.pick(payload)) || 0
  if (typeof payload === 'number') return payload
  if (payload && typeof payload === 'object') {
    const value = payload.count ?? payload.total ?? payload.data ?? 0
    return Number(value) || 0
  }
  return 0
}

async function fetchCount(item) {
  const res = await call(item.ctrl, item.method || 'count', {
    method: 'GET',
    params: { ...(item.params || {}) }
  })
  return resolveCount(item, res?.data)
}

async function loadStats() {
  const tasks = []
  groups.value.forEach((group) => {
    group.items.forEach((item) => {
      tasks.push(
        (async () => {
          try {
            item.value = await fetchCount(item)
          } catch (e) {
            item.error = e?.msg || e?.response?.data?.msg || '获取失败'
          } finally {
            item.loading = false
          }
        })()
      )
    })
  })
  todos.value.forEach((item) => {
    tasks.push(
      (async () => {
        try {
          item.count = await fetchCount(item)
        } catch {
          /* 待办失败不提示，保持 0 */
        } finally {
          item.loading = false
        }
      })()
    )
  })
  await Promise.all(tasks)
}

onMounted(() => {
  avatar.value = user.value?.avatar || defaultAvatar
  siteStore.load()
  loadVersion()
  loadStats()
})
</script>

<style scoped>
.admin-dashboard {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

/* ---------- 概览横幅 ---------- */
.hero {
  padding: 20px 22px;
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius);
}
.hero-main {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 14px;
}
.hero-user {
  display: flex;
  align-items: center;
  gap: 14px;
  min-width: 0;
}
.hero-avatar {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  object-fit: cover;
  flex-shrink: 0;
  background: var(--bg-muted);
}
.hero-title {
  font-size: 18px;
  font-weight: 600;
  line-height: 1.3;
}
.hero-sub {
  margin-top: 2px;
  font-size: 13px;
  color: var(--text-muted);
}
.hero-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}
.hero-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 18px;
  margin-top: 16px;
  padding-top: 14px;
  border-top: 1px dashed var(--border-soft);
}
.meta-item {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: var(--text-muted);
}
.meta-item .bi {
  color: var(--primary);
}
.meta-item b {
  font-weight: 600;
  color: var(--text-soft);
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
}

/* ---------- 待办 ---------- */
.todo-row {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 12px;
}
.todo-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 14px 16px;
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  color: inherit;
  text-decoration: none;
  transition: border-color 0.2s, box-shadow 0.2s, transform 0.2s;
}
.todo-item:hover {
  border-color: var(--primary-soft);
  box-shadow: var(--shadow-sm);
  color: var(--text);
}
.todo-item:active {
  transform: translateY(1px);
}
.todo-item > .bi:first-child {
  font-size: 18px;
  color: var(--text-muted);
}
.todo-item.is-hot {
  border-color: var(--gold-line);
  background: var(--gold-wash);
}
.todo-item.is-hot > .bi:first-child {
  color: var(--warning);
}
.todo-label {
  flex: 1;
  min-width: 0;
  font-size: 14px;
  color: var(--text-soft);
}
.todo-count {
  font-size: 18px;
  font-weight: 700;
  color: var(--text-muted);
}
.todo-item.is-hot .todo-count {
  color: var(--warning);
}
.todo-arrow {
  font-size: 12px;
  color: var(--text-light);
}

/* ---------- 统计分组 ---------- */
.stat-group {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.group-head {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  font-weight: 600;
  color: var(--text-soft);
}
.group-head .bi {
  color: var(--primary);
}
.group-hint {
  font-weight: 400;
  font-size: 12px;
  color: var(--text-light);
}
.stat-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
}
.stat-card {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 18px;
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius);
}
.stat-icon {
  width: 46px;
  height: 46px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 12px;
  background: var(--bg-muted);
  font-size: 22px;
}
.stat-value {
  font-size: 24px;
  font-weight: 700;
  line-height: 1.2;
  min-height: 28px;
}
.stat-error {
  color: var(--text-muted);
  font-weight: 400;
  cursor: help;
}
.stat-label {
  font-size: 13px;
  color: var(--text-muted);
}

/* ---------- 说明面板 ---------- */
.panel {
  padding: 22px;
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius);
}
.panel-title {
  font-size: 16px;
  font-weight: 600;
  margin-bottom: 10px;
}
.panel-tips {
  margin: 0;
  padding: 0;
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.panel-tips li {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  color: var(--text-soft);
}
.panel-tips i {
  color: var(--primary);
}
.panel-tips code {
  background: var(--bg-muted);
  padding: 1px 6px;
  border-radius: 4px;
  font-size: 12px;
}

@media (max-width: 1100px) {
  .stat-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}
@media (max-width: 640px) {
  .stat-grid {
    grid-template-columns: 1fr;
  }
  .hero-actions {
    width: 100%;
  }
}
</style>
