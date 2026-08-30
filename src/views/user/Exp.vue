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
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { getLevels } from '@/api/users'
import { getConfig } from '@/api/config'
import { useUserStore } from '@/stores/user'
import { storeToRefs } from 'pinia'

const userStore = useUserStore()
const { user } = storeToRefs(userStore)

const rules = ref([])
const levels = ref([])
const loadingRules = ref(false)
const loadingLevels = ref(false)

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
    const res = await getConfig('SYSTEM_EXP_RULES')
    let data = res.data?.json || res.data || {}
    if (typeof data === 'string') {
      try { data = JSON.parse(data) } catch { data = {} }
    }
    const arr = Object.entries(data).map(([type, r]) => ({
      type,
      name: r?.name || type,
      value: Number(r?.value) || 0,
      daily_limit: Number(r?.daily_limit) || 0
    }))
    arr.sort((a, b) => b.value - a.value)
    rules.value = arr
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

onMounted(() => {
  loadRules()
  loadLevels()
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
.data-table .td-desc {
  color: var(--text-muted);
}
.data-table .row-current {
  background: rgba(184, 153, 104, 0.1);
}
.data-table .row-current td:first-child {
  color: var(--primary-deep);
  font-weight: 600;
}
</style>
