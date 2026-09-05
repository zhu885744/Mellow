<template>
  <div class="integral-page">
    <!-- 积分余额 -->
    <div class="card card-pad">
      <div class="balance-hero">
        <div class="balance-icon"><i class="bi bi-coin" /></div>
        <div class="balance-main">
          <div class="balance-label">当前积分余额</div>
          <div class="balance-num">{{ balance }} <span>积分</span></div>
          <router-link to="/goods" class="balance-link"><i class="bi bi-gift" /> 去积分商城兑换</router-link>
        </div>
      </div>
    </div>

    <!-- 赚取途径 -->
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
            <td>{{ r.name }}</td>
            <td class="td-num">+{{ r.value }}</td>
            <td>{{ Number(r.daily_limit) > 0 ? `${r.daily_limit} 次` : '不限' }}</td>
          </tr>
        </tbody>
      </table>
      <p v-else class="empty-text">暂无积分规则</p>
    </div>

    <!-- 积分流水 -->
    <div class="card card-pad">
      <h3 class="block-title">积分明细</h3>
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
import { ref, onMounted } from 'vue'
import { getIntegral, getIntegralLogs, getIntegralRules } from '@/api/goods'

const balance = ref(0)
const rules = ref([])
const logs = ref([])
const loadingRules = ref(false)
const loadingLogs = ref(false)

const typeMap = {
  'check-in': '每日签到',
  'login': '每日登录',
  'article-create': '发布文章',
  'comment': '发表评论',
  'moments': '发布动态',
  'buy': '积分兑换',
  'give': '积分调整'
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

async function loadBalance() {
  try {
    const res = await getIntegral()
    balance.value = Number(res.data?.integral) || 0
  } catch {
    balance.value = 0
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

async function loadLogs() {
  loadingLogs.value = true
  try {
    const res = await getIntegralLogs()
    logs.value = res.data?.data || []
  } catch {
    logs.value = []
  } finally {
    loadingLogs.value = false
  }
}

onMounted(() => {
  loadBalance()
  loadRules()
  loadLogs()
})
</script>

<style scoped>
.integral-page {
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.block-title {
  font-size: 15px;
  font-weight: 600;
  margin: 0 0 14px;
  padding-bottom: 10px;
  border-bottom: 1px solid var(--border-soft);
}

.balance-hero {
  display: flex;
  align-items: center;
  gap: 16px;
}
.balance-icon {
  width: 60px;
  height: 60px;
  border-radius: 50%;
  background: linear-gradient(135deg, #d4a148, #b89968);
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
</style>
