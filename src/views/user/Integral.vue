<template>
  <div class="integral-page">
    <!-- 积分概览 -->
    <div class="card card-pad">
      <div class="balance-hero">
        <div class="balance-icon"><i class="bi bi-coin" /></div>
        <div class="balance-main">
          <div class="balance-label">当前积分余额</div>
          <div class="balance-num">{{ summary.integral }} <span>积分</span></div>
          <router-link to="/goods" class="balance-link"><i class="bi bi-gift" /> 去积分商城兑换</router-link>
        </div>
      </div>

      <div class="overview-grid">
        <div class="overview-item">
          <span class="overview-label">今日获得</span>
          <strong class="overview-value plus">+{{ summary.today_income }}</strong>
        </div>
        <div class="overview-item">
          <span class="overview-label">今日消耗</span>
          <strong class="overview-value minus">-{{ summary.today_expense }}</strong>
        </div>
        <div class="overview-item">
          <span class="overview-label">累计获得</span>
          <strong class="overview-value">{{ summary.total_income }}</strong>
        </div>
        <div class="overview-item">
          <span class="overview-label">累计消耗</span>
          <strong class="overview-value">{{ summary.total_expense }}</strong>
        </div>
      </div>
    </div>

    <!-- 卡密兑换 -->
    <div v-if="isLogged" class="card card-pad">
      <div class="block-head">
        <h3 class="block-title">卡密兑换</h3>
        <span class="block-extra">输入卡密即可兑换积分，兑换后立即到账</span>
      </div>
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
          class="btn btn-primary redeem-btn"
          :disabled="redeeming || !cardCode.trim()"
          @click="redeem"
        >{{ redeeming ? '兑换中...' : '立即兑换' }}</button>
      </div>
      <p class="redeem-tip">
        <i class="bi bi-shield-check" /> 卡密不区分大小写，空格与连字符会被自动忽略；请勿向他人泄露你的卡密。
      </p>
    </div>

    <!-- 今日任务进度 -->
    <div v-if="isLogged" class="card card-pad">
      <div class="block-head">
        <h3 class="block-title">今日任务</h3>
        <span class="block-extra">
          已完成 {{ tasks.done_count }}/{{ tasks.total_count }}
          · 今日已赚 <strong>{{ tasks.today_income }}</strong> 积分
          <template v-if="tasks.streak > 0"> · 连签 {{ tasks.streak }} 天</template>
        </span>
      </div>
      <div v-if="loadingTasks" class="loading"><span class="spinner" /> 加载中...</div>
      <ul v-else-if="taskList.length" class="task-list">
        <li v-for="t in taskList" :key="t.type" class="task-item" :class="{ done: t.done }">
          <span class="task-icon"><i :class="t.icon || 'bi bi-coin'" /></span>
          <div class="task-main">
            <div class="task-row">
              <span class="task-name">
                {{ t.name }}
                <span class="task-state" :class="{ ok: t.done }">
                  「{{ t.done ? '已完成' : (t.remain > 0 ? `还可 +${t.remain} 积分` : '可继续') }}」
                </span>
              </span>
              <span class="task-value">+{{ t.value }}/次</span>
            </div>
            <div class="task-progress">
              <div class="task-bar"><span class="task-fill" :style="{ width: t.progress + '%' }" /></div>
              <span class="task-count">
                {{ t.today_count }}/{{ Number(t.daily_limit) > 0 ? t.daily_limit : '不限' }}
              </span>
            </div>
          </div>
          
        </li>
      </ul>
      <p v-else class="empty-text">暂无任务</p>
    </div>

    <!-- 积分排行榜 -->
    <div class="card card-pad">
      <div class="block-head">
        <h3 class="block-title">积分排行榜</h3>
        <div class="rank-tabs">
          <button
            v-for="opt in rankOptions"
            :key="opt.value"
            type="button"
            class="chip"
            :class="{ active: rankBy === opt.value }"
            @click="switchRank(opt.value)"
          >{{ opt.label }}</button>
        </div>
      </div>
      <div v-if="loadingRank" class="loading"><span class="spinner" /> 加载中...</div>
      <ol v-else-if="rankList.length" class="rank-list">
        <li v-for="r in rankList" :key="r.id" class="rank-item" :class="{ me: r.is_me }">
          <span class="rank-no" :class="`no-${r.rank}`">{{ r.rank }}</span>
          <img :src="r.avatar || defaultAvatar" class="rank-avatar" alt="" @error="onImgError" />
          <div class="rank-info">
            <span class="rank-name">
              {{ r.nickname || '匿名用户' }}
              <em v-if="r.is_me" class="rank-me-tag">我</em>
            </span>
            <span class="rank-desc">{{ r.description || '这个人很懒，什么都没留下' }}</span>
          </div>
          <span class="rank-value"><i class="bi bi-coin" /> {{ r.value }}</span>
        </li>
      </ol>
      <p v-else class="empty-text">暂无排行数据</p>
      <p v-if="rankMy.rank > 0" class="rank-mine">
        我的排名 <strong>第 {{ rankMy.rank }} 名</strong> · {{ rankBy === 'balance' ? '余额' : '累计获得' }} {{ rankMy.value }} 积分
      </p>
    </div>

    <!-- 积分获取途径 -->
    <div class="card card-pad">
      <h3 class="block-title">积分获取途径</h3>
      <div v-if="loadingRules" class="loading"><span class="spinner" /> 加载中...</div>
      <table v-else-if="rules.length" class="data-table">
        <thead>
          <tr>
            <th>获取途径</th>
            <th>积分</th>
            <th>每日上限</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="r in rules" :key="r.type">
            <td><i :class="[r.icon || 'bi bi-coin', 'rule-icon']" /> {{ r.name }}</td>
            <td class="td-num">+{{ r.value }}</td>
            <td>{{ Number(r.daily_limit) > 0 ? `${r.daily_limit} 次` : '不限' }}</td>
          </tr>
        </tbody>
      </table>
      <p v-else class="empty-text">暂无积分规则</p>
    </div>

    <!-- 积分明细 -->
    <div v-if="isLogged" class="card card-pad">
      <div class="block-head">
        <h3 class="block-title">积分明细</h3>
        <span v-if="logSummary" class="block-extra">
          收入 <strong class="plus">{{ logSummary.income }}</strong>
          · 支出 <strong class="minus">{{ logSummary.expense }}</strong>
        </span>
      </div>

      <div class="log-filter">
        <div class="chip-group">
          <button
            v-for="opt in directionOptions"
            :key="opt.value"
            type="button"
            class="chip"
            :class="{ active: direction === opt.value }"
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

      <div v-if="loadingLogs" class="loading"><span class="spinner" /> 加载中...</div>
      <div v-else-if="!logs.length" class="empty-text">暂无积分记录</div>
      <table v-else class="data-table">
        <thead>
          <tr>
            <th>说明</th>
            <th>变动</th>
            <th>时间</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="l in logs" :key="l.id">
            <td class="td-desc">{{ l.description || typeName(l.type) }}</td>
            <td class="td-num" :class="{ minus: Number(l.value) < 0 }">
              {{ Number(l.value) > 0 ? '+' : '' }}{{ l.value }}
            </td>
            <td class="td-time">{{ formatTime(l.create_time) }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import SelectMenu from '@/components/SelectMenu.vue'
import { getIntegral, getIntegralLogs, getIntegralRules, getIntegralTasks, getIntegralRank, redeemIntegralCard } from '@/api/goods'
import { useUserStore } from '@/stores/user'
import { toast } from '@/utils/toast'

const userStore = useUserStore()
const isLogged = computed(() => userStore.isLogged)

const defaultAvatar = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 80"><circle cx="40" cy="40" r="40" fill="%23e8e6dd"/><text x="50%25" y="55%25" text-anchor="middle" font-size="36" fill="%238a8a82" font-family="serif">用</text></svg>'

const summary = ref({ integral: 0, total_income: 0, total_expense: 0, today_income: 0, today_expense: 0 })
const rules = ref([])
const logs = ref([])
const logSummary = ref(null)
const tasks = ref({ list: [], today_income: 0, done_count: 0, total_count: 0, streak: 0 })

const loadingRules = ref(false)
const loadingLogs = ref(false)
const loadingTasks = ref(false)
const loadingRank = ref(false)

// 卡密兑换
const cardCode = ref('')
const redeeming = ref(false)

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

// 排行榜
const rankBy = ref('earned')
const rankList = ref([])
const rankMy = ref({ rank: 0, value: 0 })
const rankOptions = [
  { value: 'earned', label: '累计获得' },
  { value: 'balance', label: '余额榜' }
]

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
  'card': '卡密兑换'
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

function onImgError(e) {
  e.target.src = defaultAvatar
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
  loadingRules.value = true
  try {
    const res = await getIntegralRules()
    const data = Array.isArray(res.data) ? res.data : (res.data?.data || [])
    data.sort((a, b) => Number(b.value) - Number(a.value))
    rules.value = data
  } catch {
    rules.value = []
  } finally {
    loadingRules.value = false
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

async function loadRank() {
  loadingRank.value = true
  try {
    const res = await getIntegralRank({ by: rankBy.value, limit: 20 })
    const data = res.data || {}
    rankList.value = Array.isArray(data.list) ? data.list : []
    rankMy.value = { rank: Number(data.my_rank) || 0, value: Number(data.my_value) || 0 }
  } catch {
    rankList.value = []
    rankMy.value = { rank: 0, value: 0 }
  } finally {
    loadingRank.value = false
  }
}

function setDirection(v) {
  if (direction.value === v) return
  direction.value = v
  loadLogs()
}

function switchRank(v) {
  if (rankBy.value === v) return
  rankBy.value = v
  loadRank()
}

// 卡密兑换：成功后刷新积分概览 / 明细 / 排行榜
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
    await Promise.all([loadSummary(), loadLogs(), loadRank()])
  } catch {
    // 失败原因（卡密不存在/已使用/已过期/尝试过于频繁等）已由请求拦截器统一提示
  } finally {
    redeeming.value = false
  }
}

onMounted(() => {
  loadSummary()
  loadRules()
  loadTasks()
  loadLogs()
  loadRank()
})
</script>

<style scoped>
.integral-page {
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.block-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 14px;
  padding-bottom: 10px;
  border-bottom: 1px solid var(--border-soft);
}
.block-head .block-title {
  margin: 0;
  padding: 0;
  border: none;
}
.block-title {
  font-size: 15px;
  font-weight: 600;
  margin: 0 0 14px;
  padding-bottom: 10px;
  border-bottom: 1px solid var(--border-soft);
}
.block-extra {
  font-size: 12px;
  color: var(--text-muted);
}
.block-extra strong {
  color: #d4a148;
}
.plus {
  color: var(--success);
}
.minus {
  color: var(--danger);
}

/* ---------- 概览 ---------- */
.balance-hero {
  display: flex;
  align-items: center;
  gap: 16px;
}
.balance-icon {
  width: 60px;
  height: 60px;
  border-radius: 50%;
  background: linear-gradient(135deg, #d4a148, var(--cinnabar));
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 28px;
  flex-shrink: 0;
}
.balance-main {
  flex: 1;
  min-width: 0;
}
.balance-label {
  font-size: 13px;
  color: var(--text-muted);
}
.balance-num {
  font-size: 28px;
  font-weight: 700;
  color: var(--primary-deep);
  line-height: 1.3;
  font-variant-numeric: tabular-nums;
}
.balance-num span {
  font-size: 14px;
  font-weight: 500;
  color: var(--text-muted);
}
.balance-link {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  margin-top: 4px;
  font-size: 13px;
  color: #d4a148;
  text-decoration: none;
}
.balance-link:hover {
  text-decoration: underline;
}
.overview-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
  margin-top: 16px;
  padding-top: 14px;
  border-top: 1px dashed var(--border-soft);
}
.overview-item {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}
.overview-label {
  font-size: 12px;
  color: var(--text-muted);
}
.overview-value {
  font-size: 16px;
  font-weight: 600;
  color: var(--text);
  font-variant-numeric: tabular-nums;
}

/* ---------- 卡密兑换 ---------- */
.redeem-row {
  display: flex;
  gap: 10px;
}
.redeem-input {
  flex: 1;
  min-width: 0;
  /* 与同排的兑换按钮等高 */
  height: var(--control-h);
  padding: 0 14px;
  font-size: 14px;
  font-family: inherit;
  letter-spacing: 1px;
  color: var(--text);
  background: var(--bg);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  outline: none;
  transition: border-color 0.2s, box-shadow 0.2s;
}
.redeem-input:focus {
  border-color: var(--primary);
  box-shadow: 0 0 0 3px var(--accent-ring);
}
.redeem-input::placeholder {
  letter-spacing: normal;
  color: var(--text-light);
}
.redeem-input:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}
.redeem-btn {
  flex-shrink: 0;
  white-space: nowrap;
}
.redeem-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
.redeem-tip {
  display: flex;
  align-items: center;
  gap: 6px;
  margin: 10px 0 0;
  font-size: 12px;
  line-height: 1.6;
  color: var(--text-muted);
}

/* ---------- 今日任务 ---------- */
.task-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.task-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 12px;
  border: 1px solid var(--border-soft);
  border-radius: var(--radius);
  background: var(--bg-card);
  transition: border-color 0.18s, background 0.18s;
}
.task-item:hover {
  border-color: var(--primary-soft);
}
.task-item.done {
  background: var(--bg-muted);
}
.task-icon {
  width: 34px;
  height: 34px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: var(--gold-soft);
  color: #c7902f;
  font-size: 16px;
}
.task-main {
  flex: 1;
  min-width: 0;
}
.task-row {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 8px;
}
.task-name {
  font-size: 14px;
  font-weight: 500;
  color: var(--text);
}
.task-value {
  font-size: 12px;
  font-weight: 600;
  color: #d4a148;
}
.task-progress {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 6px;
}
.task-bar {
  flex: 1;
  height: 5px;
  border-radius: 999px;
  background: var(--bg-muted);
  overflow: hidden;
}
.task-fill {
  display: block;
  height: 100%;
  border-radius: 999px;
  background: linear-gradient(90deg, #d4a148, var(--primary));
  transition: width 0.3s;
}
.task-count {
  flex-shrink: 0;
  font-size: 11px;
  color: var(--text-muted);
  font-variant-numeric: tabular-nums;
}
.task-state {
  flex-shrink: 0;
  font-size: 12px;
  color: var(--text-muted);
}
.task-state.ok {
  color: var(--success);
  font-weight: 600;
}

/* ---------- 排行榜 ---------- */
.rank-tabs {
  display: flex;
  gap: 6px;
}
.rank-list {
  display: flex;
  flex-direction: column;
}
.rank-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 9px 6px;
  border-bottom: 1px dashed var(--border-soft);
}
.rank-item:last-child {
  border-bottom: none;
}
.rank-item.me {
  background: var(--gold-wash);
  border-radius: var(--radius-sm);
}
.rank-no {
  width: 22px;
  flex-shrink: 0;
  text-align: center;
  font-size: 13px;
  font-weight: 700;
  color: var(--text-light);
  font-variant-numeric: tabular-nums;
}
.rank-no.no-1 { color: #d4a148; }
.rank-no.no-2 { color: #a8a29a; }
.rank-no.no-3 { color: #c08a5e; }
.rank-avatar {
  width: 34px;
  height: 34px;
  border-radius: 50%;
  object-fit: cover;
  flex-shrink: 0;
  border: 1px solid var(--border);
}
.rank-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
}
.rank-name {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  font-weight: 600;
  color: var(--text);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.rank-me-tag {
  flex-shrink: 0;
  padding: 0 5px;
  font-size: 10px;
  font-style: normal;
  border-radius: 4px;
  background: var(--primary);
  color: #fff;
}
.rank-desc {
  font-size: 12px;
  color: var(--text-muted);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.rank-value {
  flex-shrink: 0;
  font-size: 14px;
  font-weight: 700;
  color: #d4a148;
  font-variant-numeric: tabular-nums;
}
.rank-value .bi {
  font-size: 12px;
}
.rank-mine {
  margin: 12px 0 0;
  padding-top: 10px;
  border-top: 1px solid var(--border-soft);
  font-size: 12px;
  color: var(--text-muted);
  text-align: center;
}
.rank-mine strong {
  color: var(--primary-deep);
}

/* ---------- 明细 ---------- */
.log-filter {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 12px;
}
.chip-group {
  display: flex;
  gap: 6px;
}
.chip {
  /* 与同排的类型下拉 / 其它筛选控件等高 */
  display: inline-flex;
  align-items: center;
  height: var(--control-h-sm);
  padding: 0 12px;
  border: 1px solid var(--border);
  border-radius: 999px;
  background: var(--bg-card);
  color: var(--text-soft);
  font-size: 12px;
  line-height: 1.5;
  cursor: pointer;
  transition: all 0.18s;
}
.chip:hover {
  border-color: var(--primary-soft);
  color: var(--primary);
}
.chip.active {
  background: var(--accent-soft);
  border-color: var(--primary);
  color: var(--primary-deep);
  font-weight: 600;
}
.rule-icon {
  margin-right: 6px;
  color: #d4a148;
}

.loading {
  padding: 24px;
  text-align: center;
  color: var(--text-muted);
}
.empty-text {
  padding: 20px;
  text-align: center;
  font-size: 13px;
  color: var(--text-muted);
}
.data-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
}
.data-table th,
.data-table td {
  padding: 10px 12px;
  text-align: left;
  border-bottom: 1px solid var(--border-soft);
}
.data-table thead th {
  font-size: 12px;
  font-weight: 600;
  color: var(--text-muted);
  background: var(--bg-muted);
  white-space: nowrap;
}
.data-table thead th:first-child {
  border-top-left-radius: var(--radius-sm);
}
.data-table thead th:last-child {
  border-top-right-radius: var(--radius-sm);
}
.data-table tbody tr:last-child td {
  border-bottom: none;
}
.data-table tbody tr:hover {
  background: var(--bg-muted);
}
.data-table .td-num {
  color: #d4a148;
  font-weight: 600;
  white-space: nowrap;
}
.data-table .td-num.minus {
  color: var(--danger);
}
.data-table .td-desc {
  color: var(--text-soft);
}
.data-table .td-time {
  color: var(--text-muted);
  white-space: nowrap;
}

@media (max-width: 640px) {
  .overview-grid {
    grid-template-columns: repeat(2, 1fr);
    gap: 10px 12px;
  }
  .balance-num {
    font-size: 24px;
  }
  .task-item {
    padding: 10px;
    gap: 10px;
  }
  .task-state {
    display: none;
  }
}
</style>
