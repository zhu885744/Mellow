<template>
  <div class="checkin-page">
    <!-- 未登录：引导登录后回到本页（/auth/login?redirect=/checkin） -->
    <section v-if="!isLogged" class="card card-pad login-tip">
      <div class="login-tip__icon"><i class="bi bi-calendar-check" /></div>
      <h2 class="login-tip__title">登录后即可签到</h2>
      <p class="login-tip__desc">每日签到可得经验与积分，连续签到还有加成与里程碑奖励。</p>
      <router-link to="/auth/login?redirect=/checkin" class="btn btn-primary btn-lg">去登录</router-link>
    </section>

    <template v-else>
      <!-- 签到主卡 -->
      <section class="checkin-hero card card-pad" :class="{ 'is-checked': status.checked }">
        <div class="checkin-hero__icon">
          <i class="bi" :class="status.checked ? 'bi-check-lg' : 'bi-calendar-check'" />
        </div>
        <div class="checkin-hero__info">
          <h2 class="checkin-hero__title">{{ status.checked ? '今日已签到' : '今日还未签到' }}</h2>
          <p class="checkin-hero__desc">
            <template v-if="status.checked">
              已获得 {{ status.value }} 经验
              <span v-if="points > 0" class="is-points"> · {{ points }} 积分</span>
              <span v-if="status.bonus > 0" class="is-bonus">（连续加成 +{{ status.bonus }}）</span>
            </template>
            <template v-else>
              连续签到第 {{ status.streak + 1 }} 天，预计获得 {{ status.base + status.bonus + status.milestone }} 经验
            </template>
          </p>
        </div>
        <button
          class="btn btn-primary btn-lg checkin-hero__btn"
          :disabled="loading || status.checked"
          @click="doCheckin"
        >
          <span v-if="loading" class="spinner spinner--light" />
          {{ loading ? '签到中...' : status.checked ? '今日已签到' : '立即签到' }}
        </button>
      </section>

      <!-- 数据小卡 -->
      <div class="stat-grid">
        <div class="stat-card">
          <span class="stat-card__num">{{ status.streak }}</span>
          <span class="stat-card__label">连续签到（天）</span>
        </div>
        <div class="stat-card">
          <span class="stat-card__num">{{ calendar.total }}</span>
          <span class="stat-card__label">本月签到（天）</span>
        </div>
        <div class="stat-card">
          <span class="stat-card__num">{{ status.checked ? status.value : status.base + status.bonus + status.milestone }}</span>
          <span class="stat-card__label">{{ status.checked ? '今日获得（经验）' : '签到可得（经验）' }}</span>
        </div>
        <div class="stat-card">
          <span class="stat-card__num">{{ nextMilestone ? nextMilestone.day : '—' }}</span>
          <span class="stat-card__label">下个里程碑（天）</span>
        </div>
      </div>

      <!-- 本月日历 -->
      <section class="card card-pad">
        <header class="block-head">
          <h3 class="block-title"><i class="bi bi-calendar3" /> {{ calendar.year }} 年 {{ calendar.month }} 月</h3>
          <span class="block-count">本月已签到 {{ calendar.total }} 天</span>
        </header>
        <div class="calendar-grid">
          <span v-for="week in WEEK_LABELS" :key="week" class="calendar-cell calendar-cell--week">{{ week }}</span>
          <span v-for="i in calendarBlank" :key="`blank-${i}`" class="calendar-cell calendar-cell--blank" />
          <span
            v-for="day in calendar.days"
            :key="day.day"
            class="calendar-cell calendar-cell--day"
            :class="{ checked: day.checked, today: day.day === calendar.today }"
          >
            {{ day.day }}
          </span>
        </div>
      </section>

      <!-- 里程碑进度 -->
      <section class="card card-pad">
        <header class="block-head">
          <h3 class="block-title"><i class="bi bi-gift" /> 连续签到奖励</h3>
          <span v-if="nextMilestone" class="block-count">
            再签到 {{ Math.max(nextMilestone.day - status.streak, 0) }} 天
          </span>
        </header>

        <div class="milestone-tip" :class="{ 'all-done': !nextMilestone }">
          <template v-if="nextMilestone">
            <i class="bi bi-gift-fill" />
            连续 {{ nextMilestone.day }} 天可额外获得 {{ nextMilestone.reward }} 经验
          </template>
          <template v-else>
            <i class="bi bi-trophy-fill" /> 已达成全部签到里程碑
          </template>
        </div>
        <div class="milestone-bar">
          <div class="milestone-fill" :style="{ width: `${milestoneProgress}%` }" />
        </div>
      </section>

      <!-- 积分奖励 -->
      <section class="points-tip">
        <i class="bi bi-coin" />
        <span>签到可得 <strong>+{{ points }}</strong> 积分</span>
        <router-link to="/goods" class="points-link">去兑换 <i class="bi bi-arrow-right" /></router-link>
      </section>

      <!-- 签到排行榜 -->
      <section class="card card-pad">
        <header class="block-head">
          <h3 class="block-title"><i class="bi bi-trophy" /> 签到排行榜</h3>
          <div class="range-tabs">
            <button
              v-for="item in TIME_RANGES"
              :key="item.key"
              type="button"
              class="range-tab"
              :class="{ active: timeRange === item.key }"
              @click="changeRange(item.key)"
            >
              {{ item.label }}
            </button>
          </div>
        </header>

        <div v-if="rankLoading" class="loading"><span class="spinner" /> 加载中...</div>

        <EmptyState v-else-if="!rankList.length" icon="bi bi-trophy" text="暂无排行数据" />

        <ul v-else class="rank-list">
          <li
            v-for="(item, index) in rankList"
            :key="item.id || index"
            class="rank-item"
            :class="{ top: item.rank <= 3 }"
          >
            <span class="rank-num">
              <i v-if="item.rank <= 3" class="bi" :class="`bi-${item.rank}-circle-fill`" />
              <template v-else>{{ item.rank }}</template>
            </span>
            <img class="rank-avatar" :src="item.avatar || defaultAvatar" :alt="item.nickname || '用户'" />
            <div class="rank-info">
              <span class="rank-name">{{ item.nickname || '匿名用户' }}</span>
              <span class="rank-stats">
                <i class="bi bi-calendar-check" /> {{ item.check_in_count || 0 }} 次
                <i class="bi bi-star" /> {{ item.total_exp || 0 }} 经验
              </span>
            </div>
          </li>
        </ul>
      </section>
    </template>
  </div>
</template>

<script setup>
/**
 * 每日签到（/checkin）
 *
 * 由原来的签到弹窗改成独立页面：
 * - 弹窗里的「签到 / 排行榜」两个 Tab 摊开成同一页的多个区块（签到卡 → 数据卡 → 日历 →
 *   里程碑 → 积分 → 排行榜），不再需要吸底按钮与滚动容器；
 * - 未登录时只展示登录引导（check-in-status / check-in-calendar / check-in 都是
 *   type=login 接口，匿名调用会 401）；排行榜是公共接口，登录后一起加载；
 * - 接口：exp/check-in（POST）、exp/check-in-status、exp/check-in-calendar、exp/check-in-rank。
 */
import { ref, reactive, computed, onMounted, watch } from 'vue'
import EmptyState from '@/components/EmptyState.vue'
import { useUserStore } from '@/stores/user'
import { checkIn, checkInStatus, checkInRank, checkInCalendar } from '@/api/users'
import { getIntegralRules } from '@/api/goods'
import { toast } from '@/utils/toast'

const defaultAvatar = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40"><circle cx="20" cy="20" r="20" fill="%23e8e6dd"/></svg>'

const WEEK_LABELS = ['日', '一', '二', '三', '四', '五', '六']

const TIME_RANGES = [
  { key: 'today', label: '今日' },
  { key: 'week', label: '本周' },
  { key: 'month', label: '本月' }
]

const userStore = useUserStore()
const isLogged = computed(() => userStore.isLogged)

const loading = ref(false)
const points = ref(0)

const status = reactive({
  checked: false,
  value: 0,
  base: 0,
  bonus: 0,
  milestone: 0,
  check_in_time: 0,
  streak: 0,
  today: 0,
  next_milestone: null
})

const calendar = reactive({
  year: new Date().getFullYear(),
  month: new Date().getMonth() + 1,
  days: [],
  total: 0,
  today: new Date().getDate()
})

const timeRange = ref('month')
const rankList = ref([])
const rankLoading = ref(false)

// 当月 1 号是星期几（日历空白占位）
const calendarBlank = computed(
  () => new Date(calendar.year, calendar.month - 1, 1).getDay()
)

const nextMilestone = computed(() => status.next_milestone || null)

// 里程碑进度：已连续天数 / 下个里程碑天数
const milestoneProgress = computed(() => {
  const milestone = nextMilestone.value
  if (!milestone) return 100
  return Math.min(100, Math.max(0, Math.round(((status.streak || 0) / milestone.day) * 100)))
})

// ---------- 数据加载 ----------
async function loadStatus() {
  try {
    const res = await checkInStatus()
    if (res.code === 200 && res.data) {
      Object.assign(status, {
        checked: res.data.checked || false,
        value: res.data.value || 0,
        base: res.data.base || 0,
        bonus: res.data.bonus || 0,
        milestone: res.data.milestone || 0,
        check_in_time: res.data.check_in_time || 0,
        streak: res.data.streak || 0,
        today: res.data.today || 0,
        next_milestone: res.data.next_milestone || null
      })
    }
  } catch {
    // 静默：错误提示由请求拦截器统一给出
  }
}

async function loadCalendar() {
  try {
    const res = await checkInCalendar()
    if (res.code === 200 && res.data) {
      Object.assign(calendar, {
        year: res.data.year || calendar.year,
        month: res.data.month || calendar.month,
        days: res.data.days || [],
        total: res.data.total || 0,
        today: res.data.today || calendar.today
      })
    }
  } catch {
    // 静默
  }
}

async function loadPoints() {
  try {
    const res = await getIntegralRules()
    const list = Array.isArray(res.data) ? res.data : res.data?.data || []
    const rule = list.find((item) => item.type === 'check-in')
    if (rule) points.value = Number(rule.value) || 0
  } catch {
    // 静默，用默认值
  }
}

async function loadRank() {
  rankLoading.value = true
  try {
    const res = await checkInRank(rangeParams())
    if (res.code === 200 && res.data) {
      rankList.value = Array.isArray(res.data) ? res.data : res.data.data || []
    }
  } catch {
    rankList.value = []
  } finally {
    rankLoading.value = false
  }
}

// 排行榜时间范围 → start / end 时间戳
function rangeParams() {
  const now = new Date()
  let start
  let end

  switch (timeRange.value) {
    case 'today':
      start = new Date(now.getFullYear(), now.getMonth(), now.getDate())
      end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59)
      break
    case 'week': {
      const day = now.getDay() || 7
      start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - day + 1)
      end = new Date(now.getFullYear(), now.getMonth(), now.getDate() - day + 7, 23, 59, 59)
      break
    }
    case 'month':
    default:
      start = new Date(now.getFullYear(), now.getMonth(), 1)
      end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59)
      break
  }

  return {
    start: start ? Math.floor(start.getTime() / 1000) : undefined,
    end: end ? Math.floor(end.getTime() / 1000) : undefined
  }
}

function changeRange(key) {
  if (timeRange.value === key) return
  timeRange.value = key
  rankList.value = []
  loadRank()
}

// ---------- 签到 ----------
async function doCheckin() {
  if (loading.value || status.checked) return
  loading.value = true
  try {
    const res = await checkIn()
    if (res.code === 200 && res.data) {
      const { value, base, bonus, milestone, streak } = res.data
      const parts = [`签到成功！获得 ${value} 经验值`]
      if (bonus > 0) parts.push(`连续加成 +${bonus}`)
      if (milestone > 0) parts.push(`里程碑奖励 +${milestone}`)
      if (points.value > 0) parts.push(`积分 +${points.value}`)
      toast.success(parts.join('，'))

      Object.assign(status, {
        checked: true,
        value: value || 0,
        base: base || 0,
        bonus: bonus || 0,
        milestone: milestone || 0,
        streak: streak || 0
      })
      loadCalendar()
      loadStatus()
    } else if (res.code === 202) {
      toast.info(res.msg || '今日已签到')
      status.checked = true
    }
  } catch {
    // 错误已由拦截器提示
  } finally {
    loading.value = false
  }
}

function loadAll() {
  if (!isLogged.value) return
  loadStatus()
  loadCalendar()
  loadPoints()
  loadRank()
}

onMounted(loadAll)

// 在本页登录成功（或其它标签页登录）后自动补加载，不必手动刷新
watch(isLogged, (logged) => {
  if (logged) loadAll()
})
</script>

<style scoped>
.checkin-page {
  display: flex;
  flex-direction: column;
  gap: 16px;
  min-width: 0;
}

/* ---------- 未登录引导 ---------- */
.login-tip {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  padding: 48px 24px;
  text-align: center;
}
.login-tip__icon {
  width: 64px;
  height: 64px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  font-size: 28px;
  color: var(--primary);
  background: var(--accent-soft);
}
.login-tip__title {
  margin: 0;
  font-family: var(--font-serif);
  font-size: 18px;
  font-weight: 700;
}
.login-tip__desc {
  margin: 0 0 6px;
  font-size: 13px;
  color: var(--text-muted);
}

/* ---------- 签到主卡 ---------- */
.checkin-hero {
  display: flex;
  align-items: center;
  gap: 16px;
  background: linear-gradient(135deg, var(--accent-soft), var(--accent-wash));
  border: 1px solid var(--gold-line);
}
.checkin-hero.is-checked {
  border-color: var(--border-soft);
}
.checkin-hero__icon {
  width: 56px;
  height: 56px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  font-size: 26px;
  color: #fff;
  background: linear-gradient(135deg, var(--primary), var(--primary-deep));
}
.checkin-hero.is-checked .checkin-hero__icon {
  background: linear-gradient(135deg, var(--success), #5a8a3a);
}
.checkin-hero__info {
  flex: 1;
  min-width: 0;
}
.checkin-hero__title {
  margin: 0 0 4px;
  font-family: var(--font-serif);
  font-size: 18px;
  font-weight: 700;
  color: var(--text);
}
.checkin-hero__desc {
  margin: 0;
  font-size: 13px;
  color: var(--text-muted);
}
.checkin-hero__desc .is-bonus {
  color: var(--primary);
  font-weight: 600;
}
.checkin-hero__desc .is-points {
  color: #d4a148;
  font-weight: 600;
}
.checkin-hero__btn {
  flex-shrink: 0;
  /* 保留渐变作为签到按钮的专属视觉标识 */
  background: linear-gradient(135deg, var(--primary), var(--primary-deep));
}
.checkin-hero__btn:hover:not(:disabled) {
  filter: brightness(1.05);
}
/* 主色按钮上的转圈：白边，避免深色底看不清 */
.spinner--light {
  width: 16px;
  height: 16px;
  border-color: rgba(255, 255, 255, 0.4);
  border-top-color: #fff;
}

/* ---------- 数据小卡 ---------- */
.stat-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
}
.stat-card {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 14px 16px;
  background: var(--bg-card);
  border: 1px solid var(--border-soft);
  border-radius: var(--radius);
}
.stat-card__num {
  font-family: var(--font-serif);
  font-size: 22px;
  font-weight: 700;
  color: var(--primary-deep);
  line-height: 1.2;
  font-variant-numeric: tabular-nums;
}
.stat-card__label {
  font-size: 12px;
  color: var(--text-muted);
}

/* ---------- 区块头 ---------- */
.block-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 12px;
}
.block-title {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  margin: 0;
  font-family: var(--font-serif);
  font-size: 15px;
  font-weight: 700;
  color: var(--text);
}
.block-count {
  font-size: 12px;
  color: var(--text-muted);
  font-variant-numeric: tabular-nums;
}

/* ---------- 日历 ---------- */
.calendar-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 5px;
}
.calendar-cell {
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 13px;
  border-radius: 8px;
  font-variant-numeric: tabular-nums;
}
.calendar-cell--week {
  color: var(--text-muted);
  font-weight: 500;
}
.calendar-cell--blank {
  visibility: hidden;
}
.calendar-cell--day {
  background: var(--bg-muted);
  border: 1px solid var(--border-soft);
  color: var(--text-muted);
}
.calendar-cell--day.checked {
  background: linear-gradient(135deg, var(--primary), var(--primary-deep));
  border-color: transparent;
  color: #fff;
  font-weight: 600;
}
.calendar-cell--day.today {
  border-color: var(--primary);
  color: var(--primary);
  font-weight: 700;
}
.calendar-cell--day.today.checked {
  color: #fff;
}

/* ---------- 里程碑 ---------- */
.milestone-tip {
  display: flex;
  align-items: center;
  gap: 5px;
  margin-bottom: 8px;
  font-size: 13px;
  color: var(--text-muted);
}
.milestone-tip i {
  color: #e6a23c;
}
.milestone-tip.all-done {
  color: var(--success);
}
.milestone-tip.all-done i {
  color: var(--success);
}
.milestone-bar {
  height: 8px;
  border-radius: 999px;
  background: var(--bg-muted);
  overflow: hidden;
}
.milestone-fill {
  height: 100%;
  border-radius: 999px;
  background: linear-gradient(90deg, #e6a23c, var(--primary-deep));
  transition: width 0.3s ease;
}

/* ---------- 积分提示 ---------- */
.points-tip {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 12px 16px;
  font-size: 13px;
  color: var(--text-soft);
  background: linear-gradient(135deg, var(--gold-soft), var(--accent-wash));
  border: 1px dashed var(--gold-line);
  border-radius: var(--radius);
}
.points-tip .bi-coin,
.points-tip strong {
  color: #d4a148;
  font-weight: 700;
}
.points-link {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  margin-left: auto;
  font-size: 12px;
  color: var(--primary);
}
.points-link:hover {
  text-decoration: underline;
}

/* ---------- 排行榜 ---------- */
.range-tabs {
  display: flex;
  gap: 4px;
  padding: 3px;
  border-radius: var(--radius);
  background: var(--bg-muted);
}
.range-tab {
  padding: 4px 12px;
  font-size: 12px;
  border-radius: calc(var(--radius) - 3px);
  color: var(--text-muted);
  transition: all 0.2s;
}
.range-tab.active {
  color: var(--primary);
  font-weight: 600;
  background: var(--bg-card);
  box-shadow: var(--shadow-sm);
}

.rank-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin: 0;
  padding: 0;
  list-style: none;
}
.rank-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 12px;
  border: 1px solid var(--border-soft);
  border-radius: var(--radius-sm);
  background: var(--bg-muted);
}
.rank-item.top {
  background: linear-gradient(135deg, var(--gold-wash), var(--accent-wash));
  border-color: var(--gold-line);
}
.rank-num {
  width: 30px;
  height: 30px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  font-weight: 700;
  color: var(--text-muted);
  border-radius: 50%;
  background: var(--bg-card);
  border: 1px solid var(--border);
}
.rank-item.top .rank-num {
  font-size: 18px;
  border: none;
  background: transparent;
}
.rank-avatar {
  width: 40px;
  height: 40px;
  flex-shrink: 0;
  border-radius: 50%;
  object-fit: cover;
}
.rank-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.rank-name {
  font-size: 14px;
  font-weight: 600;
  color: var(--text);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.rank-stats {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  color: var(--text-muted);
}

.loading {
  padding: 32px;
  text-align: center;
  color: var(--text-muted);
}

@media (max-width: 768px) {
  .checkin-hero {
    flex-wrap: wrap;
    gap: 12px;
  }
  .checkin-hero__icon {
    width: 46px;
    height: 46px;
    font-size: 21px;
  }
  .checkin-hero__title {
    font-size: 16px;
  }
  .checkin-hero__btn {
    width: 100%;
  }
  .stat-grid {
    grid-template-columns: repeat(2, 1fr);
  }
  .calendar-cell {
    height: 32px;
    font-size: 12px;
  }
  .block-head {
    flex-wrap: wrap;
  }
}
</style>
