<template>
  <div class="integral-page">
    <!-- 积分概览 -->
    <div class="card card-pad">
      <div class="balance">
        <div class="balance-main">
          <span class="balance-label">当前积分</span>
          <strong class="balance-num">{{ summary.integral }}</strong>
        </div>
        <router-link to="/goods" class="balance-link">
          积分商城 <i class="bi bi-arrow-right" aria-hidden="true" />
        </router-link>
      </div>

      <dl class="balance-stats">
        <div class="balance-stat">
          <dt>今日获得</dt>
          <dd class="plus">+{{ summary.today_income }}</dd>
        </div>
        <div class="balance-stat">
          <dt>今日消耗</dt>
          <dd class="minus">-{{ summary.today_expense }}</dd>
        </div>
        <div class="balance-stat">
          <dt>累计获得</dt>
          <dd>{{ summary.total_income }}</dd>
        </div>
        <div class="balance-stat">
          <dt>累计消耗</dt>
          <dd>{{ summary.total_expense }}</dd>
        </div>
      </dl>
    </div>

    <!-- 卡密兑换 -->
    <div v-if="isLogged" class="card card-pad">
      <h3 class="section-title">卡密兑换</h3>

      <div class="redeem-row">
        <input
          v-model="cardCode"
          class="redeem-input"
          type="text"
          maxlength="64"
          autocomplete="off"
          spellcheck="false"
          placeholder="请输入卡密"
          :disabled="redeeming"
          @keyup.enter="redeem"
        />
        <button
          type="button"
          class="btn btn-primary"
          :disabled="redeeming || !cardCode.trim()"
          @click="redeem"
        >{{ redeeming ? '兑换中...' : '立即兑换' }}</button>
      </div>
      <p class="hint">不区分大小写，空格与连字符会被忽略；请勿向他人泄露卡密。</p>

      <!-- 我的待兑换卡密：签到等活动直接发到账号里的卡密在这里找回 -->
      <div v-if="myCards.length" class="mine-cards">
        <div class="mine-cards-head">
          <span>我的待兑换卡密 {{ myCards.length }}</span>
          <button class="text-btn" type="button" :disabled="redeeming" @click="redeemAll">全部兑换</button>
        </div>

        <div v-for="item in myCards" :key="item.card_id || item.card" class="mine-card">
          <code class="mine-card-code">{{ item.card }}</code>
          <span class="mine-card-face">{{ item.value }} 积分</span>
          <span v-if="item.source" class="mine-card-from">{{ cardSourceText(item.source) }}</span>
          <span v-if="item.expired" class="mine-card-expired">已过期</span>
          <button
            class="text-btn"
            type="button"
            :disabled="redeeming || item.expired"
            @click="redeemCard(item)"
          >兑换</button>
        </div>
      </div>
    </div>

    <!-- 今日任务进度 -->
    <div v-if="isLogged" class="card card-pad">
      <div class="section-head">
        <h3 class="section-title">今日任务</h3>
        <span class="section-extra">
          已完成 {{ tasks.done_count }}/{{ tasks.total_count }}
          · 今日 +{{ tasks.today_income }}
          <template v-if="tasks.streak > 0"> · 连签 {{ tasks.streak }} 天</template>
        </span>
      </div>
      <div v-if="loadingTasks" class="is-loading"><span class="spinner" /> 加载中...</div>
      <ul v-else-if="taskList.length" class="task-list">
        <li v-for="t in taskList" :key="t.type" class="task-item" :class="{ 'is-done': t.done }">
          <div class="task-row">
            <span class="task-name">{{ t.name }}</span>
            <span class="task-state">
              {{ t.done ? '已完成' : (t.remain > 0 ? `+${t.remain} 积分` : '可继续') }}
            </span>
          </div>
          <div class="task-progress">
            <span class="task-bar"><span class="task-fill" :style="{ width: t.progress + '%' }" /></span>
            <span class="task-count">
              {{ t.today_count }}/{{ Number(t.daily_limit) > 0 ? t.daily_limit : '不限' }}
            </span>
          </div>
        </li>
      </ul>
      <p v-else class="empty-text">暂无任务</p>
    </div>

    <!-- 积分明细 -->
    <div v-if="isLogged" class="card card-pad">
      <div class="section-head">
        <h3 class="section-title">积分明细</h3>
        <span v-if="logSummary" class="section-extra">
          收入 <span class="plus">{{ logSummary.income }}</span>
          · 支出 <span class="minus">{{ logSummary.expense }}</span>
        </span>
      </div>

      <div class="log-filter">
        <div class="chip-group">
          <button
            v-for="opt in directionOptions"
            :key="opt.value"
            type="button"
            class="chip"
            :class="{ 'is-active': direction === opt.value }"
            @click="setDirection(opt.value)"
          >{{ opt.label }}</button>
        </div>
        <SelectMenu
          v-model="typeFilter"
          :options="typeOptions"
          icon="bi bi-funnel"
          placeholder="全部类型"
          @change="loadLogs"
        />
      </div>

      <div v-if="loadingLogs" class="is-loading"><span class="spinner" /> 加载中...</div>
      <div v-else-if="!logs.length" class="empty-text">暂无积分记录</div>
      <table v-else class="log-table">
        <thead>
          <tr>
            <th>说明</th>
            <th class="log-num">变动</th>
            <th class="log-time">时间</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="l in logs" :key="l.id">
            <td class="log-desc">{{ l.description || typeName(l.type) }}</td>
            <td class="log-num" :class="{ 'is-minus': Number(l.value) < 0 }">
              {{ Number(l.value) > 0 ? '+' : '' }}{{ l.value }}
            </td>
            <td class="log-time">{{ formatTime(l.create_time) }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import SelectMenu from '@/components/SelectMenu.vue'
import { getIntegral, getIntegralLogs, getIntegralRules, getIntegralTasks, redeemIntegralCard } from '@/api/goods'
// 我的待兑换卡密（签到等活动的奖励发到账号里，这里找回并兑换）
import { getMyIntegralCards } from '@/api/integral'
import { useUserStore } from '@/stores/user'
import { toast } from '@/utils/toast'

const userStore = useUserStore()
const isLogged = computed(() => userStore.isLogged)

const summary = ref({ integral: 0, total_income: 0, total_expense: 0, today_income: 0, today_expense: 0 })
// 获取途径列表（页面不再展示，仅用于「积分明细」的类型筛选下拉）
const rules = ref([])
const logs = ref([])
const logSummary = ref(null)
const tasks = ref({ list: [], today_income: 0, done_count: 0, total_count: 0, streak: 0 })

const loadingLogs = ref(false)
const loadingTasks = ref(false)

// 卡密兑换
const cardCode = ref('')
const redeeming = ref(false)
// 我的待兑换卡密（签到等活动发放的，后端状态=已发放）
const myCards = ref([])

// 明细筛选
const direction = ref('')
const typeFilter = ref('')
const directionOptions = [
  { value: '', label: '全部' },
  { value: 'income', label: '收入' },
  { value: 'expense', label: '支出' }
]

// 类型下拉选项：首项「全部类型」+ 规则类型 + 内置类型（按 value 去重）
const typeOptions = computed(() => {
  const list = [{ value: '', label: '全部类型' }]
  const seen = new Set([''])
  const candidates = [
    ...(rules.value || []).map((r) => ({ value: r.type, label: r.name })),
    { value: 'buy', label: '积分兑换' },
    { value: 'card', label: '卡密兑换' },
    { value: 'refund', label: '退款返还' },
    { value: 'give', label: '管理员积分调整' }
  ]
  for (const opt of candidates) {
    if (!opt.value || seen.has(opt.value)) continue
    seen.add(opt.value)
    list.push(opt)
  }
  return list
})

const taskList = computed(() => tasks.value.list || [])

const typeMap = {
  'check-in': '每日签到',
  'login': '每日登录',
  'article-create': '发布文章',
  'comment': '发表评论',
  'moments': '发布动态',
  'share': '分享内容',
  'buy': '积分兑换',
  'refund': '订单退款',
  'give': '管理员积分调整',
  'card': '卡密兑换',
  'unlock': '兑换内容可见权限',
  'tip': '打赏支出',
  'tip-income': '收到打赏'
}

function typeName(t) {
  return typeMap[t] || t || '积分变动'
}

function formatTime(t) {
  if (!t) return '-'
  const d = new Date(Number(t) * 1000)
  if (isNaN(d)) return '-'
  const p = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`
}

async function loadSummary() {
  if (!isLogged.value) return
  try {
    const res = await getIntegral()
    const data = res.data || {}
    summary.value = {
      integral: Number(data.integral) || 0,
      total_income: Number(data.total_income) || 0,
      total_expense: Number(data.total_expense) || 0,
      today_income: Number(data.today_income) || 0,
      today_expense: Number(data.today_expense) || 0
    }
  } catch {
    // 拦截器已提示
  }
}

async function loadRules() {
  try {
    const res = await getIntegralRules()
    const data = Array.isArray(res.data) ? res.data : (res.data?.data || [])
    data.sort((a, b) => Number(b.value) - Number(a.value))
    rules.value = data
  } catch {
    rules.value = []
  }
}

async function loadTasks() {
  if (!isLogged.value) return
  loadingTasks.value = true
  try {
    const res = await getIntegralTasks()
    tasks.value = res.data || tasks.value
  } catch {
    // 忽略
  } finally {
    loadingTasks.value = false
  }
}

async function loadLogs() {
  if (!isLogged.value) return
  loadingLogs.value = true
  try {
    const params = {}
    if (direction.value) params.direction = direction.value
    if (typeFilter.value) params.type = typeFilter.value
    const res = await getIntegralLogs(params)
    logs.value = res.data?.data || []
    logSummary.value = res.data?.summary || null
  } catch {
    logs.value = []
    logSummary.value = null
  } finally {
    loadingLogs.value = false
  }
}

function setDirection(v) {
  if (direction.value === v) return
  direction.value = v
  loadLogs()
}

// 卡密兑换：成功后刷新积分概览 / 明细 / 我的卡密
async function redeem() {
  const code = cardCode.value.trim()
  if (!code) {
    toast.warning('请输入卡密')
    return
  }
  redeeming.value = true
  try {
    const res = await redeemIntegralCard(code)
    const value = Number(res?.data?.value) || 0
    toast.success(value > 0 ? `兑换成功，获得 ${value} 积分` : '兑换成功')
    cardCode.value = ''
    await Promise.all([loadSummary(), loadLogs(), loadMyCards()])
  } catch {
    // 失败原因（卡密不存在/已使用/已过期/尝试过于频繁等）已由请求拦截器统一提示
  } finally {
    redeeming.value = false
  }
}

// ---------- 我的待兑换卡密（签到等活动发到账号里的） ----------

// 卡密来源（后端存的是奖励流水类型）
const cardSourceMap = {
  'check-in': '签到获得'
}

function cardSourceText(source) {
  return cardSourceMap[source] || '活动获得'
}

async function loadMyCards() {
  if (!isLogged.value) {
    myCards.value = []
    return
  }
  try {
    const res = await getMyIntegralCards({ limit: 20 })
    myCards.value = Array.isArray(res?.data) ? res.data : []
  } catch {
    // 拿不到不影响页面其它部分
    myCards.value = []
  }
}

// 兑换列表里的某一张（等价于填入输入框再点兑换）
async function redeemCard(item) {
  if (redeeming.value || !item?.card) return
  cardCode.value = item.card
  await redeem()
}

// 一键兑换全部：逐张兑换，单张失败不影响其它（失败的会留在列表里）
async function redeemAll() {
  if (redeeming.value || !myCards.value.length) return

  redeeming.value = true
  let success = 0
  let income = 0

  for (const item of [...myCards.value]) {
    if (item.expired) continue
    try {
      const res = await redeemIntegralCard(item.card)
      if (Number(res?.code) === 200) {
        success++
        income += Number(res?.data?.value) || 0
      }
    } catch {
      // 单张失败（已过期 / 已被使用等）跳过即可
    }
  }

  redeeming.value = false
  toast.success(success ? `已兑换 ${success} 张，共获得 ${income} 积分` : '没有可兑换的卡密')

  await Promise.all([loadMyCards(), loadSummary(), loadLogs()])
}

onMounted(() => {
  loadSummary()
  loadRules()
  loadTasks()
  loadLogs()
  loadMyCards()
})
</script>

<style scoped>
.integral-page {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

/* ---------- 通用小节 ---------- */
.section-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 12px;
}
.section-title {
  margin: 0 0 10px;
  font-size: 14px;
  font-weight: 600;
  color: var(--text);
}
.section-head .section-title {
  margin: 0;
}
.section-extra {
  font-size: 12px;
  color: var(--text-muted);
  font-variant-numeric: tabular-nums;
}
.plus {
  color: var(--success);
}
.minus {
  color: var(--danger);
}
.hint {
  margin: 8px 0 0;
  font-size: 12px;
  line-height: 1.6;
  color: var(--text-light);
}
/* 文字按钮：列表行里的次级操作，不加边框和底色 */
.text-btn {
  padding: 0;
  font-size: 12px;
  font-weight: 500;
  color: var(--primary);
  background: none;
  border: none;
  cursor: pointer;
}
.text-btn:hover {
  text-decoration: underline;
}
.text-btn:disabled {
  color: var(--text-light);
  cursor: not-allowed;
  text-decoration: none;
}

/* ---------- 概览 ---------- */
.balance {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 12px;
}
.balance-main {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}
.balance-label {
  font-size: 12px;
  color: var(--text-muted);
}
.balance-num {
  font-size: 30px;
  font-weight: 600;
  line-height: 1.1;
  color: var(--text);
  font-variant-numeric: tabular-nums;
}
.balance-link {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  color: var(--text-muted);
  text-decoration: none;
  white-space: nowrap;
}
.balance-link:hover {
  color: var(--primary);
}
.balance-stats {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
  margin: 14px 0 0;
  padding-top: 12px;
  border-top: 1px solid var(--border-soft);
}
.balance-stat {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}
.balance-stat dt {
  font-size: 12px;
  color: var(--text-muted);
}
.balance-stat dd {
  margin: 0;
  font-size: 14px;
  font-weight: 500;
  color: var(--text);
  font-variant-numeric: tabular-nums;
}

/* ---------- 卡密兑换 ---------- */
.redeem-row {
  display: flex;
  gap: 8px;
}
.redeem-input {
  flex: 1;
  min-width: 0;
  /* 与同排的兑换按钮等高 */
  height: var(--control-h);
  padding: 0 12px;
  font-size: 13px;
  font-family: inherit;
  letter-spacing: 1px;
  color: var(--text);
  background: var(--bg);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  outline: none;
  transition: border-color 0.2s;
}
.redeem-input:focus {
  border-color: var(--primary);
}
.redeem-input::placeholder {
  letter-spacing: normal;
  color: var(--text-light);
}
.redeem-input:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

/* ---------- 我的待兑换卡密（活动发放） ---------- */
.mine-cards {
  margin-top: 14px;
  padding-top: 10px;
  border-top: 1px solid var(--border-soft);
}
.mine-cards-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 4px;
  font-size: 12px;
  color: var(--text-muted);
}
/* 行式列表：靠分隔线分区，不再给每行加卡片底色和边框 */
.mine-card {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
  padding: 7px 0;
  border-bottom: 1px dashed var(--border-soft);
}
.mine-card:last-child {
  border-bottom: none;
}
.mine-card-code {
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 12px;
  letter-spacing: 1px;
  color: var(--text);
  user-select: all;
}
.mine-card-face {
  font-size: 12px;
  color: var(--text-muted);
}
.mine-card-from {
  font-size: 12px;
  color: var(--text-light);
}
.mine-card-expired {
  font-size: 12px;
  color: var(--danger);
}
.mine-card > .text-btn {
  margin-left: auto;
}

/* ---------- 今日任务 ---------- */
.task-list {
  display: flex;
  flex-direction: column;
}
/* 行式列表：只靠分隔线分区，不再一行一个卡片 */
.task-item {
  padding: 10px 0;
  border-bottom: 1px solid var(--border-soft);
}
.task-item:last-child {
  border-bottom: none;
}
.task-row {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 10px;
}
.task-name {
  font-size: 13px;
  color: var(--text);
}
.task-item.is-done .task-name {
  color: var(--text-muted);
}
.task-state {
  flex-shrink: 0;
  font-size: 12px;
  color: var(--text-light);
  font-variant-numeric: tabular-nums;
}
.task-item.is-done .task-state {
  color: var(--success);
}
.task-progress {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 8px;
}
/* 3px 细线进度，单色，避免和任务文字抢视觉 */
.task-bar {
  flex: 1;
  height: 3px;
  border-radius: 999px;
  background: var(--bg-muted);
  overflow: hidden;
}
.task-fill {
  display: block;
  height: 100%;
  border-radius: 999px;
  background: var(--primary);
  transition: width 0.3s;
}
.task-count {
  flex-shrink: 0;
  font-size: 11px;
  color: var(--text-light);
  font-variant-numeric: tabular-nums;
}

/* ---------- 明细 ---------- */
.log-filter {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 10px;
}
.chip-group {
  display: flex;
  gap: 4px;
}
.chip {
  /* 与同排的类型下拉等高 */
  display: inline-flex;
  align-items: center;
  height: var(--control-h-sm);
  padding: 0 12px;
  border: none;
  border-radius: 999px;
  background: none;
  color: var(--text-muted);
  font-size: 12px;
  line-height: 1.5;
  cursor: pointer;
  transition: color 0.18s, background 0.18s;
}
.chip:hover {
  color: var(--text);
  background: var(--bg-muted);
}
.chip.is-active {
  background: var(--bg-muted);
  color: var(--text);
  font-weight: 600;
}
.is-loading {
  padding: 20px;
  text-align: center;
  font-size: 13px;
  color: var(--text-muted);
}
.empty-text {
  padding: 20px;
  text-align: center;
  font-size: 13px;
  color: var(--text-muted);
}
/* 明细表：去掉表头底色和整行 hover，只留细线，读起来更安静 */
.log-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
}
.log-table th,
.log-table td {
  padding: 9px 0;
  text-align: left;
  border-bottom: 1px solid var(--border-soft);
}
.log-table thead th {
  font-size: 12px;
  font-weight: 500;
  color: var(--text-light);
  border-bottom-color: var(--border);
}
.log-table tbody tr:last-child td {
  border-bottom: none;
}
.log-table .log-desc {
  padding-right: 12px;
  color: var(--text-soft);
}
.log-table .log-num {
  color: var(--success);
  font-weight: 500;
  white-space: nowrap;
  font-variant-numeric: tabular-nums;
}
.log-table .log-num.is-minus {
  color: var(--danger);
}
.log-table .log-time {
  color: var(--text-light);
  white-space: nowrap;
  text-align: right;
}
.log-table thead .log-time {
  text-align: right;
}

@media (max-width: 640px) {
  .balance-stats {
    grid-template-columns: repeat(2, 1fr);
    gap: 10px 12px;
  }
  .balance-num {
    font-size: 26px;
  }
  .log-table .log-time {
    font-size: 12px;
  }
}
</style>
