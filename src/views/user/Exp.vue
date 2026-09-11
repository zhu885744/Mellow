<template>
  <div class="exp-page">
    <!-- 用户信息与等级 -->
    <div class="card card-pad">
      <div class="profile-hero">
        <img :src="user?.avatar || defaultAvatar" class="profile-avatar" alt="avatar" />
        <div class="profile-main">
          <div class="profile-name-row">
            <span class="profile-name">{{ user?.nickname || '未登录' }}</span>
            <span v-if="genderText" class="profile-gender">{{ genderText }}</span>
            <span v-if="levelName" class="level-badge">{{ levelName }} · Lv.{{ levelValue ?? 0 }}</span>
          </div>
          <p class="profile-desc">{{ user?.description || '这个人很懒，什么都没留下' }}</p>
          <div class="exp-total">当前经验值 <strong>{{ exp }}</strong></div>
          <div class="exp-bar">
            <div class="exp-bar-fill" :style="{ width: expPercent + '%' }" />
          </div>
          <div class="exp-meta">{{ expText }}</div>
        </div>
      </div>
    </div>

    <!-- 经验获取途径 -->
    <div class="card card-pad">
      <h3 class="block-title">经验获取途径</h3>
      <div v-if="loadingRules" class="loading"><span class="spinner" /> 加载中...</div>
      <table v-else-if="rules.length" class="data-table">
        <thead>
          <tr>
            <th>获取途径</th>
            <th>经验值</th>
            <th>每日上限</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="r in rules" :key="r.type">
            <td>{{ r.name }}</td>
            <td class="td-num">+{{ r.value }}</td>
            <td>{{ r.daily_limit > 0 ? `${r.daily_limit} 次` : '不限' }}</td>
          </tr>
        </tbody>
      </table>
      <p v-else class="empty-text">暂无经验规则</p>
    </div>

    <!-- 等级体系 -->
    <div class="card card-pad">
      <h3 class="block-title">等级体系</h3>
      <div v-if="loadingLevels" class="loading"><span class="spinner" /> 加载中...</div>
      <table v-else-if="levels.length" class="data-table">
        <thead>
          <tr>
            <th>等级</th>
            <th>等级值</th>
            <th>所需经验</th>
            <th>说明</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="lv in levels" :key="lv.id" :class="{ 'row-current': lv.value === levelValue }">
            <td>{{ lv.name }}</td>
            <td>Lv.{{ lv.value }}</td>
            <td class="td-num">{{ lv.exp }}</td>
            <td class="td-desc">{{ lv.description || '—' }}</td>
          </tr>
        </tbody>
      </table>
      <p v-else class="empty-text">暂无等级数据</p>
    </div>

    <!-- 经验明细 -->
    <div class="card card-pad">
      <h3 class="block-title">经验明细</h3>
      <div v-if="loadingLogs" class="loading"><span class="spinner" /> 加载中...</div>
      <div v-else-if="!logs.length" class="empty-text">暂无经验记录</div>
      <template v-else>
        <table class="data-table">
          <thead>
            <tr>
              <th>说明</th>
              <th>变动</th>
              <th>时间</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="l in logs" :key="l.id">
              <td class="td-desc">
                <span>{{ l.description || typeName(l.type) }}</span>
                <span v-if="logExtra(l)" class="log-extra">{{ logExtra(l) }}</span>
              </td>
              <td class="td-num" :class="{ minus: Number(l.value) < 0 }">
                {{ Number(l.value) > 0 ? '+' : '' }}{{ l.value }}
              </td>
              <td class="td-time">{{ formatTime(l.create_time) }}</td>
            </tr>
          </tbody>
        </table>
        <div v-if="hasMore" class="load-more">
          <button class="btn btn-sm btn-ghost" :disabled="loadingMore" @click="loadMoreLogs">
            {{ loadingMore ? '加载中...' : '加载更多' }}
          </button>
        </div>
      </template>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { getLevels, getExpRules, getExpLogs } from '@/api/users'
import { useUserStore } from '@/stores/user'
import { storeToRefs } from 'pinia'
import { formatTime } from '@/utils/time'

const userStore = useUserStore()
const { user } = storeToRefs(userStore)

const rules = ref([])
const levels = ref([])
const loadingRules = ref(false)
const loadingLevels = ref(false)

// 经验明细
const logs = ref([])
const loadingLogs = ref(false)
const loadingMore = ref(false)
const logPage = ref(1)
const logLimit = 20
const logCount = ref(0)
const hasMore = computed(() => logs.value.length < logCount.value)

// 经验类型 -> 中文说明（与后端 model/exp.go 默认规则一致）
const typeMap = {
  'like': '点赞',
  'collect': '收藏',
  'visit': '访问',
  'share': '分享',
  'login': '登录',
  'comment': '评论',
  'check-in': '签到',
  'moments': '发布动态',
  'article-create': '发布文章',
  'article-like': '内容获赞',
  'article-collect': '内容被收藏',
  'comment-create': '发表评论',
  'comment-like': '评论获赞'
}

function typeName(t) {
  return typeMap[t] || t || '经验变动'
}

// 签到记录的奖励构成（基础值之外的连续签到加成 / 里程碑奖励）
function logExtra(l) {
  const j = l.json
  if (!j || typeof j !== 'object') return ''
  const parts = []
  if (Number(j.bonus) > 0) parts.push(`连续签到加成 +${j.bonus}`)
  if (Number(j.milestone) > 0) parts.push(`里程碑奖励 +${j.milestone}`)
  if (Number(j.streak) > 0) parts.push(`已连续签到 ${j.streak} 天`)
  return parts.join(' · ')
}

const defaultAvatar = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 80"><circle cx="40" cy="40" r="40" fill="%23e8e6dd"/><text x="50%25" y="55%25" text-anchor="middle" font-size="36" fill="%238a8a82" font-family="serif">用</text></svg>'

// 性别映射（boy/girl -> 男/女）
const genderText = computed(() => {
  const g = user.value?.gender
  if (g === 'boy' || g === 1) return '男'
  if (g === 'girl' || g === 2) return '女'
  return ''
})

// 等级与经验（来自登录态 user.result.level / user.exp）
const levelInfo = computed(() => user.value?.result?.level || null)
const levelName = computed(() => levelInfo.value?.current?.name || '')
const levelValue = computed(() => levelInfo.value?.current?.value ?? null)
const exp = computed(() => Number(user.value?.exp) || 0)
const expPercent = computed(() => {
  const cur = Number(levelInfo.value?.current?.exp) || 0
  const next = Number(levelInfo.value?.next?.exp) || 0
  if (!next || next <= cur) return 100
  const p = ((exp.value - cur) / (next - cur)) * 100
  return Math.max(0, Math.min(100, Math.round(p)))
})
const expText = computed(() => {
  const next = Number(levelInfo.value?.next?.exp) || 0
  return next ? `${exp.value} / ${next} EXP` : `${exp.value} EXP`
})

async function loadRules() {
  loadingRules.value = true
  try {
    const res = await getExpRules()
    const data = Array.isArray(res.data) ? res.data : (res.data?.data || [])
    data.sort((a, b) => Number(b.value) - Number(a.value))
    rules.value = data
  } catch {
    rules.value = []
  } finally {
    loadingRules.value = false
  }
}

async function loadLevels() {
  loadingLevels.value = true
  try {
    const res = await getLevels()
    levels.value = res.data?.data || []
  } catch {
    levels.value = []
  } finally {
    loadingLevels.value = false
  }
}

async function loadLogs(more = false) {
  const uid = Number(user.value?.id) || 0
  if (!uid) {
    logs.value = []
    return
  }
  if (more) loadingMore.value = true
  else loadingLogs.value = true
  try {
    const res = await getExpLogs({
      page: logPage.value,
      limit: logLimit,
      // exp/all 是通用查询接口，用 where 限定为当前用户
      where: JSON.stringify({ uid }),
      field: 'id,value,type,description,json,create_time'
    })
    const items = res.data?.data || []
    logs.value = more ? [...logs.value, ...items] : items
    logCount.value = Number(res.data?.count) || logs.value.length
  } catch {
    if (!more) logs.value = []
  } finally {
    loadingLogs.value = false
    loadingMore.value = false
  }
}

function loadMoreLogs() {
  if (loadingMore.value || !hasMore.value) return
  logPage.value += 1
  loadLogs(true)
}

onMounted(() => {
  loadRules()
  loadLevels()
  loadLogs()
})

// 登录态就绪后再拉取明细，避免刷新时 uid 尚未加载导致空列表
watch(() => user.value?.id, (id) => {
  if (id && !logs.value.length) {
    logPage.value = 1
    loadLogs()
  }
})
</script>

<style scoped>
.exp-page {
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

/* 用户信息卡片 */
.profile-hero {
  display: flex;
  align-items: flex-start;
  gap: 16px;
}
.profile-avatar {
  width: 64px;
  height: 64px;
  border-radius: 50%;
  object-fit: cover;
  flex-shrink: 0;
  border: 2px solid var(--border);
}
.profile-main {
  flex: 1;
  min-width: 0;
}
.profile-name-row {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}
.profile-name {
  font-size: 17px;
  font-weight: 700;
}
.profile-gender {
  font-size: 11px;
  padding: 1px 8px;
  border-radius: 999px;
  background: var(--bg-muted);
  color: var(--text-soft);
}
.level-badge {
  padding: 2px 10px;
  font-size: 12px;
  font-weight: 600;
  color: #fff;
  background: linear-gradient(135deg, var(--primary), var(--primary-deep));
  border-radius: 999px;
}
.profile-desc {
  margin: 6px 0 12px;
  font-size: 13px;
  color: var(--text-soft);
  line-height: 1.6;
}
.exp-total {
  font-size: 13px;
  color: var(--text-muted);
  margin-bottom: 8px;
}
.exp-total strong {
  color: var(--primary-deep);
  font-size: 16px;
}
.exp-bar {
  height: 8px;
  border-radius: 999px;
  background: var(--border);
  overflow: hidden;
}
.exp-bar-fill {
  height: 100%;
  background: linear-gradient(90deg, var(--primary), var(--primary-deep));
  border-radius: 999px;
  transition: width 0.3s ease;
}
.exp-meta {
  margin-top: 6px;
  font-size: 12px;
  color: var(--text-muted);
}

/* 数据表格 */
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
  color: var(--primary-deep);
  font-weight: 600;
  white-space: nowrap;
}
.data-table .td-num.minus {
  color: var(--danger);
}
.data-table .td-desc {
  color: var(--text-muted);
}
.data-table .td-time {
  color: var(--text-muted);
  white-space: nowrap;
}
.log-extra {
  display: block;
  margin-top: 2px;
  font-size: 12px;
  color: var(--text-muted);
}
.load-more {
  display: flex;
  justify-content: center;
  margin-top: 14px;
}
.data-table .row-current {
  background: rgba(184, 153, 104, 0.1);
}
.data-table .row-current td:first-child {
  color: var(--primary-deep);
  font-weight: 600;
}
</style>
