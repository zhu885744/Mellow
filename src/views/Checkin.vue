<template>
  <div class="checkin-page">
    <!-- 未登录：引导登录后回到本页（/auth/login?redirect=/checkin） -->
    <section v-if="!isLogged" class="card card-pad login-tip">
      <div class="login-tip__icon"><i class="bi bi-calendar-check" /></div>
      <h2 class="login-tip__title">登录后即可签到</h2>
      <p class="login-tip__desc">签到可得经验、积分等奖励，连续签到与周期签到还有额外加成。</p>
      <router-link to="/auth/login?redirect=/checkin" class="btn btn-primary btn-lg">去登录</router-link>
    </section>

    <template v-else>
      <!-- 功能未开启 -->
      <section v-if="!status.enabled" class="card card-pad login-tip">
        <div class="login-tip__icon"><i class="bi bi-calendar-x" /></div>
        <h2 class="login-tip__title">签到暂未开放</h2>
        <p class="login-tip__desc">站点当前关闭了每日签到，稍后再来看看吧。</p>
      </section>

      <template v-else>
        <!-- 签到主卡 -->
        <section class="checkin-hero card card-pad" :class="{ 'is-checked': status.checked }">
          <div class="checkin-hero__icon">
            <i class="bi" :class="status.checked ? 'bi-check-lg' : 'bi-calendar-check'" />
          </div>
          <div class="checkin-hero__info">
            <h2 class="checkin-hero__title">
              {{ status.checked ? '今日已签到' : `今日还未签到 · 连续第 ${status.preview_days || 1} 天` }}
            </h2>
            <p class="checkin-hero__desc">
              <template v-if="status.checked">{{ status.tips || '签到成功' }}</template>
              <template v-else>
                签到可得基础奖励
                <span v-for="item in totalChips" :key="item.asset" class="hero-chip">
                  <i class="bi" :class="item.icon" /> {{ item.text }}
                </span>
                <span v-if="!totalChips.length">奖励</span>
                <!-- 概率 / 区间奖励单独说明：它们不是必得，不能混进上面的「签到可得」里 -->
                <span v-if="variableRewards.length" class="hero-variable">
                  <i class="bi bi-dice-5" /> 另有 {{ variableRewards.join('、') }}
                </span>
              </template>
            </p>
          </div>
          <div class="checkin-hero__actions">
            <button
              class="btn btn-primary btn-lg checkin-hero__btn"
              :disabled="loading || status.checked"
              @click="doSign"
            >
              <span v-if="loading" class="spinner spinner--light" />
              {{ loading ? '签到中...' : status.checked ? '今日已签到' : '立即签到' }}
            </button>
            <button
              v-if="makeup.enabled"
              class="btn btn-ghost checkin-hero__ghost"
              type="button"
              @click="scrollToMakeup"
            >
              <i class="bi bi-calendar-plus" /> 补签
            </button>
          </div>
        </section>

        <!-- 数据小卡 -->
        <div class="stat-grid">
          <div class="stat-card">
            <span class="stat-card__num">{{ status.streak }}</span>
            <span class="stat-card__label">连续签到（天）</span>
          </div>
          <div class="stat-card">
            <span class="stat-card__num">{{ status.month_days }}</span>
            <span class="stat-card__label">本月签到（天）</span>
          </div>
          <div class="stat-card">
            <span class="stat-card__num">
              {{ cycleDays.length ? `${status.cycle_day}/${cycleDays.length}` : '—' }}
            </span>
            <span class="stat-card__label">周期进度（天）</span>
          </div>
          <div class="stat-card">
            <span class="stat-card__num">{{ nextMilestone ? nextMilestone.day : '—' }}</span>
            <span class="stat-card__label">下个里程碑（天）</span>
          </div>
        </div>

        <!-- 奖励明细（按来源分组，含概率 / 区间说明） -->
        <section v-if="rewardGroups.length" class="card card-pad">
          <header class="block-head">
            <h3 class="block-title"><i class="bi bi-gift" /> 今日奖励明细</h3>
            <span class="block-count">{{ status.checked ? '本次已发放' : '签到可得' }}</span>
          </header>

          <div v-for="group in rewardGroups" :key="group.key" class="reward-group">
            <div class="reward-group__head">
              <span class="reward-group__title">{{ group.label }}</span>
              <span v-if="group.hint" class="reward-group__hint">{{ group.hint }}</span>
            </div>
            <div class="reward-items">
              <span v-for="(item, index) in group.items" :key="index" class="reward-chip">
                <i class="bi" :class="item.icon" />
                {{ chipText(item) }}
                <em v-if="item.chance" class="reward-chip__chance">{{ item.chance }}% 概率</em>
                <em v-else-if="item.label" class="reward-chip__label">{{ item.label }}</em>
              </span>
            </div>
          </div>
        </section>

        <!-- 今日获得的卡密（发放后才拿得到明文） -->
        <section v-if="todayCards.length" class="card card-pad">
          <header class="block-head">
            <h3 class="block-title"><i class="bi bi-ticket-perforated" /> 今日获得的卡密</h3>
            <router-link to="/user/integral" class="points-link">
              去兑换 <i class="bi bi-arrow-right" />
            </router-link>
          </header>

          <div v-for="(item, index) in todayCards" :key="index" class="card-row">
            <template v-if="item.card">
              <code class="card-code">{{ item.card }}</code>
              <span class="card-face">面额 {{ item.value }} 积分</span>
              <button class="btn btn-sm" type="button" @click="copyText(item.card)">
                <i class="bi bi-clipboard" /> 复制
              </button>
            </template>
            <span v-else class="card-face">
              卡密池暂无库存，本次已改发 {{ item.fallback_value }} {{ unitOf(item.fallback || 'integral') }}
            </span>
          </div>

          <p class="card-tip">
            <i class="bi bi-info-circle" />
            卡密已绑定到你的账号，去「我的积分 → 卡密兑换」输入即可到账（其它人拿到也兑换不了）。
          </p>
        </section>

        <!-- 周期奖励 -->
        <section v-if="cycleDays.length" class="card card-pad">
          <header class="block-head">
            <h3 class="block-title"><i class="bi bi-calendar3-week" /> 周期签到奖励</h3>
            <span class="block-count">每 {{ cycleDays.length }} 天一轮</span>
          </header>
          <div class="cycle-grid">
            <div
              v-for="item in cycleDays"
              :key="item.day"
              class="cycle-cell"
              :class="{ current: item.day === status.cycle_day, done: item.day < status.cycle_day }"
            >
              <span class="cycle-cell__day">第 {{ item.day }} 天</span>
              <span v-if="item.rewards.length" class="cycle-cell__reward">
                <template v-for="(reward, index) in item.rewards" :key="index">
                  +{{ reward.value }} {{ reward.unit }}
                </template>
              </span>
              <span v-else class="cycle-cell__reward is-plain">基础奖励</span>
              <span class="cycle-cell__label">{{ item.label || ' ' }}</span>
            </div>
          </div>
        </section>

        <!-- 里程碑 + 月度奖励 -->
        <section v-if="milestones.length || monthly.length" class="card card-pad">
          <header class="block-head">
            <h3 class="block-title"><i class="bi bi-trophy" /> 连签与月签奖励</h3>
            <span v-if="nextMilestone" class="block-count">
              距「{{ nextMilestone.label || `连续 ${nextMilestone.day} 天` }}」还差 {{ nextMilestone.days_left }} 天
            </span>
          </header>

          <div class="milestone-list">
            <div
              v-for="item in ladderList"
              :key="`${item.kind}-${item.day}`"
              class="milestone-row"
              :class="{ reached: item.reached }"
            >
              <span class="milestone-row__badge">
                <i class="bi" :class="item.reached ? 'bi-check-circle-fill' : item.icon" />
              </span>
              <div class="milestone-row__info">
                <span class="milestone-row__title">
                  {{ item.scope }} {{ item.day }} 天
                  <em v-if="item.label">{{ item.label }}</em>
                </span>
                <span class="milestone-row__rewards">
                  <template v-for="(reward, index) in item.rewards" :key="index">
                    <i class="bi" :class="reward.icon" /> {{ reward.value }} {{ reward.unit }}
                  </template>
                  <span v-if="!item.rewards.length">—</span>
                </span>
              </div>
              <span class="milestone-row__state">
                {{ item.reached ? '已达成' : `还差 ${item.days_left} 天` }}
              </span>
            </div>
          </div>

          <div v-if="nextMilestone" class="milestone-bar">
            <div class="milestone-fill" :style="{ width: `${milestoneProgress}%` }" />
          </div>
        </section>

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
              :class="{
                checked: day.checked,
                makeup: day.checked && day.source === 2,
                today: day.day === calendar.today
              }"
              :title="dayTitle(day)"
            >
              {{ day.day }}
            </span>
          </div>
        </section>

        <!-- 补签 -->
        <section v-if="makeup.enabled" ref="makeupRef" class="card card-pad">
          <header class="block-head">
            <h3 class="block-title"><i class="bi bi-calendar-plus" /> 补签</h3>
            <span class="block-count">
              每次消耗 {{ makeup.cost }} {{ makeup.unit }}
              <template v-if="makeup.limit > 0">· 本月剩余 {{ makeup.remain }} 次</template>
            </span>
          </header>

          <EmptyState
            v-if="!makeup.dates || !makeup.dates.length"
            icon="bi bi-calendar-check"
            text="最近没有可补签的日期"
          />

          <template v-else>
            <p class="makeup-tip">
              可补签最近 {{ makeup.days }} 天内的日期，点击选择后再确认（补签只发放基础奖励）。
            </p>
            <div class="makeup-dates">
              <button
                v-for="item in makeup.dates"
                :key="item.date"
                type="button"
                class="makeup-date"
                :class="{ active: selectedMakeup === item.date }"
                @click="selectedMakeup = selectedMakeup === item.date ? 0 : item.date"
              >
                {{ item.text }}
              </button>
            </div>
            <div class="makeup-foot">
              <button
                class="btn btn-primary"
                type="button"
                :disabled="!selectedMakeup || makeupLoading"
                @click="doMakeup"
              >
                <span v-if="makeupLoading" class="spinner spinner--light" />
                {{ makeupLoading ? '补签中...' : `确认补签（-${makeup.cost} ${makeup.unit}）` }}
              </button>
            </div>
          </template>
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
              :class="{ top: item.rank <= 3, me: item.is_me }"
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
                  <i class="bi bi-coin" /> {{ item.total_integral || 0 }} 积分
                </span>
              </div>
            </li>
          </ul>
        </section>
      </template>
    </template>
  </div>
</template>

<script setup>
/**
 * 每日签到（/checkin）
 *
 * 签到已从经验模块独立：接口为 /api/checkin/*（见 src/api/checkin.js），奖励由后台
 * 「签到管理」页的配置驱动（SYSTEM_CHECKIN_RULES），不再只有「经验 + 积分」两种：
 * - 基础奖励 / 周期奖励（第 N 天）/ 连签加成 / 里程碑 / 月全勤 / 随机奖励（带概率）都能配；
 * - 奖励项按「资产」渲染（经验、积分，或二次开发注册的自定义资产），名称 / 单位 / 图标
 *   都由后端 assets 清单下发，前端不写死；
 * - 未签到时展示「预期奖励」（含概率与随机区间），签到后展示实际发放明细；
 * - 支持补签（消耗积分，次数与范围由后台配置）。
 */
import { ref, reactive, computed, onMounted, watch } from 'vue'
import EmptyState from '@/components/EmptyState.vue'
import { useUserStore } from '@/stores/user'
import {
  getCheckinStatus,
  getCheckinCalendar,
  getCheckinRank,
  signIn,
  makeupSign
} from '@/api/checkin'
import { toast } from '@/utils/toast'

const defaultAvatar = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40"><circle cx="20" cy="20" r="20" fill="%23e8e6dd"/></svg>'

const WEEK_LABELS = ['日', '一', '二', '三', '四', '五', '六']

const TIME_RANGES = [
  { key: 'today', label: '今日' },
  { key: 'week', label: '本周' },
  { key: 'month', label: '本月' }
]

// 奖励来源分组 → 展示名（与后端 model/checkin.go 的 CheckinGroup* 一致）
const GROUP_LABELS = {
  base: '基础奖励',
  cycle: '周期奖励',
  streak: '连续签到加成',
  milestone: '里程碑奖励',
  monthly: '月度奖励',
  random: '随机奖励',
  makeup: '补签奖励'
}
const GROUP_ORDER = ['base', 'cycle', 'streak', 'milestone', 'monthly', 'random', 'makeup']

// 卡密资产标识（与后端 model/reward-card.go 的 RewardCardAssetKey 对应）：
// 它的 value 是「面额」而不是数量，展示时需要特殊处理
const RewardCardKey = 'card'

const userStore = useUserStore()
const isLogged = computed(() => userStore.isLogged)

const loading = ref(false)
const makeupLoading = ref(false)
const selectedMakeup = ref(0)
const makeupRef = ref(null)

const status = reactive({
  enabled: true,
  name: '每日签到',
  checked: false,
  check_in_time: 0,
  streak: 0,
  preview_days: 1,
  cycle_day: 0,
  cycle_days: [],
  month_days: 0,
  rewards: {},
  items: [],
  total: {},
  // 概率 / 区间奖励（非必得）：由后端拆分返回，单独提示
  chance_items: [],
  chance_total: {},
  milestones: [],
  monthly: [],
  next_milestone: null,
  next_monthly: null,
  assets: [],
  makeup: {},
  cards: [],
  tips: ''
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

const cycleDays = computed(() => status.cycle_days || [])
const milestones = computed(() => status.milestones || [])
const monthly = computed(() => status.monthly || [])
const makeup = computed(() => {
  const data = status.makeup || {}
  return {
    enabled: !!data.enabled,
    days: data.days || 0,
    limit: data.limit || 0,
    remain: data.remain || 0,
    cost: data.cost || 0,
    unit: unitOf(data.asset || 'integral'),
    dates: data.dates || []
  }
})

const nextMilestone = computed(() => status.next_milestone || null)

// 里程碑进度：当前连签 / 下个里程碑天数
const milestoneProgress = computed(() => {
  const milestone = nextMilestone.value
  if (!milestone) return 100
  const day = Number(milestone.day) || 1
  return Math.min(100, Math.max(0, Math.round(((status.streak || 0) / day) * 100)))
})

// 资产清单：asset 标识 → { name, unit, icon }
const assetMap = computed(() => {
  const map = {}
  ;(status.assets || []).forEach((item) => {
    map[item.key] = item
  })
  return map
})

function unitOf(asset) {
  return assetMap.value[asset]?.unit || asset
}

// 主卡上的奖励预览（把各项奖励按资产合并成「12 经验、5 积分、卡密 ×1」）
const totalChips = computed(() => {
  const total = status.total || {}
  return Object.entries(total)
    .filter(([, value]) => Number(value) > 0)
    .map(([asset, value]) => {
      // 卡密的 value 是面额而不是数量，这里按「张数」展示
      if (asset === RewardCardKey) {
        const count = (status.items || []).filter((item) => item.asset === RewardCardKey).length
        return {
          asset,
          text: `卡密 ×${count || 1}`,
          icon: assetMap.value[asset]?.icon || 'bi-ticket-perforated'
        }
      }
      return {
        asset,
        text: `${Number(value)} ${unitOf(asset)}`,
        icon: assetMap.value[asset]?.icon || 'bi-gift'
      }
    })
})

// 今日获得的卡密（后端在发放后写入明细的 extra，未签到 / 没配卡密时为空）
const todayCards = computed(() =>
  (status.cards || []).map((item) => ({
    card: item.card || '',
    value: Number(item.value || 0),
    fallback: item.fallback || 'integral',
    fallback_value: Number(item.fallback_value || 0)
  }))
)

// 概率 / 区间奖励的说明（例如「10% 概率 20 积分」「5~15 积分」）
// 这些奖励不是必得，所以单独提示，不能算进「签到可得」的合计里
const variableRewards = computed(() => (status.chance_items || []).map((item) => variableText(item)))

function variableText(item) {
  const unit = item?.unit || unitOf(item?.asset)
  const value = Number(item?.value || 0)
  const min = Number(item?.min || 0)
  const max = Number(item?.max || 0)
  const chance = Number(item?.chance || 0)

  // 只配了 min/max 时按区间展示，配了固定值就展示固定值
  const amount = value > 0 ? `${value} ${unit}` : `${min}~${max} ${unit}`
  return chance > 0 && chance < 100 ? `${chance}% 概率 ${amount}` : amount
}

// 奖励项文案：卡密显示面额（或降级说明），其它资产显示「数值 单位」（区间奖励显示上下限）
function chipText(item) {
  if (item?.asset !== RewardCardKey) {
    const unit = item?.unit || unitOf(item?.asset)
    const value = Number(item?.value || 0)
    const min = Number(item?.min || 0)
    const max = Number(item?.max || 0)
    if (!value && (min > 0 || max > 0)) {
      return `${min}~${max} ${unit}`
    }
    return `${value} ${unit}`
  }

  const extra = item.extra || {}
  if (extra.card_missing) {
    return `卡密（暂无库存，已改发 ${extra.fallback_value || item.value} ${unitOf(extra.fallback || 'integral')}）`
  }
  return `卡密（面额 ${item.value} 积分）`
}

// 复制文本（卡密）：优先用剪贴板 API，非 HTTPS / 老浏览器走 execCommand 兜底
async function copyText(text) {
  if (!text) return

  try {
    await navigator.clipboard.writeText(text)
    toast.success('卡密已复制')
    return
  } catch {
    // 继续走兜底方案
  }

  const input = document.createElement('textarea')
  input.value = text
  input.style.position = 'fixed'
  input.style.opacity = '0'
  document.body.appendChild(input)
  input.select()
  document.execCommand('copy')
  document.body.removeChild(input)
  toast.success('卡密已复制')
}

// 奖励明细分组（后端 rewards 是按来源分好组的对象）
const rewardGroups = computed(() => {
  const groups = status.rewards || {}
  return GROUP_ORDER.filter((key) => Array.isArray(groups[key]) && groups[key].length)
    .map((key) => {
      // 概率奖励给个提示文案，避免用户以为「一定能拿到」
      const chance = groups[key].filter((item) => item.chance)
      let hint = ''
      if (chance.length) {
        hint = chance.map((item) => `${item.chance}% 概率`).join('、')
      }
      return { key, label: GROUP_LABELS[key] || key, items: groups[key], hint }
    })
})

// 里程碑 + 月度奖励合成一个列表展示（scope 区分是「连续」还是「当月」）
const ladderList = computed(() => [
  ...milestones.value.map((item) => ({ ...item, kind: 'streak', scope: '连续', icon: 'bi-gift' })),
  ...monthly.value.map((item) => ({ ...item, kind: 'month', scope: '当月签到', icon: 'bi-calendar-check' }))
])

// ---------- 数据加载 ----------
async function loadStatus() {
  try {
    const res = await getCheckinStatus()
    if (res.code === 200 && res.data) {
      Object.assign(status, {
        enabled: res.data.enabled !== false,
        name: res.data.name || '每日签到',
        checked: !!res.data.checked,
        check_in_time: res.data.check_in_time || 0,
        streak: res.data.streak || 0,
        preview_days: res.data.preview_days || 1,
        cycle_day: res.data.cycle_day || 0,
        cycle_days: res.data.cycle_days || [],
        month_days: res.data.month_days || 0,
        rewards: res.data.rewards || {},
        items: res.data.items || [],
        total: res.data.total || {},
        chance_items: res.data.chance_items || [],
        chance_total: res.data.chance_total || {},
        milestones: res.data.milestones || [],
        monthly: res.data.monthly || [],
        next_milestone: res.data.next_milestone || null,
        next_monthly: res.data.next_monthly || null,
        assets: res.data.assets || [],
        makeup: res.data.makeup || {},
        cards: res.data.cards || [],
        tips: res.data.tips || ''
      })
    } else if (res.code === 202) {
      // 功能关闭等提示
      status.enabled = false
    }
  } catch {
    // 静默：错误提示由请求拦截器统一给出
  }
}

async function loadCalendar() {
  try {
    const res = await getCheckinCalendar()
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

async function loadRank() {
  rankLoading.value = true
  try {
    const res = await getCheckinRank(rangeParams())
    if (res.code === 200 && res.data) {
      rankList.value = Array.isArray(res.data.list) ? res.data.list : []
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

function dayTitle(day) {
  if (!day.checked) return `${calendar.month} 月 ${day.day} 日 · 未签到`
  const parts = [`${calendar.month} 月 ${day.day} 日 · ${day.source === 2 ? '补签' : '已签到'}`]
  if (Number(day.exp) > 0) parts.push(`经验 +${day.exp}`)
  if (Number(day.integral) > 0) parts.push(`积分 +${day.integral}`)
  return parts.join('\n')
}

// 奖励明细 → 文案（「12 经验、5 积分、卡密 ×1」）
function itemsText(items) {
  const total = {}
  ;(items || []).forEach((item) => {
    const asset = item.asset || 'reward'
    // 卡密按张数统计（它的 value 是面额）
    total[asset] = (total[asset] || 0) + (asset === RewardCardKey ? 1 : Number(item.value || 0))
  })
  const parts = Object.entries(total)
    .filter(([, value]) => value !== 0)
    .map(([asset, value]) => (asset === RewardCardKey ? `卡密 ×${value}` : `${value} ${unitOf(asset)}`))
  return parts.join('、') || '奖励'
}

// ---------- 签到 / 补签 ----------
async function doSign() {
  if (loading.value || status.checked) return
  loading.value = true
  try {
    const res = await signIn()
    if (res.code === 200 && res.data) {
      const {
        streak, total, items, tips, cards,
        cycle_day: cycleDay, month_days: monthDays
      } = res.data

      const parts = [tips || '签到成功']
      if (items?.length || total) parts.push(`获得 ${itemsText(items)}`)

      // 拿到卡密时直接报出来，用户不用再去翻消息中心
      const codes = (cards || []).filter((item) => item.card).map((item) => item.card)
      if (codes.length) parts.push(`卡密 ${codes.join('、')}`)

      if (streak > 1) parts.push(`已连续 ${streak} 天`)
      if (cycleDay) parts.push(`周期第 ${cycleDay} 天`)

      // 里程碑 / 月度档位达成的反馈（明细里也有，这里提示得更显眼）
      const crossed = res.data.crossed || {}
      const achieved = []
      if ((crossed.streak || []).length) achieved.push(`连续 ${crossed.streak.join('、')} 天里程碑`)
      if ((crossed.monthly || []).length) achieved.push(`当月满 ${crossed.monthly.join('、')} 天奖励`)
      if (achieved.length) parts.push(`达成 ${achieved.join('、')}`)

      toast.success(parts.join('，'), codes.length ? 6000 : undefined)

      if (monthDays) status.month_days = monthDays
      if (cards) status.cards = cards
      loadStatus()
      loadCalendar()
      loadRank()
    } else if (res.code === 202) {
      toast.info(res.msg || '今日已签到')
      loadStatus()
    }
  } catch {
    // 错误已由拦截器提示
  } finally {
    loading.value = false
  }
}

function scrollToMakeup() {
  makeupRef.value?.scrollIntoView({ behavior: 'smooth', block: 'center' })
}

async function doMakeup() {
  if (!selectedMakeup.value || makeupLoading.value) return
  makeupLoading.value = true
  try {
    const res = await makeupSign(selectedMakeup.value)
    if (res.code === 200 && res.data) {
      const cost = res.data.cost?.integral || res.data.cost?.exp || makeup.value.cost || 0
      const parts = [
        `${res.data.date_text || '补签'}成功`,
        `获得 ${itemsText(res.data.items)}`,
        `消耗 ${cost} ${makeup.value.unit}`
      ]

      // 补签把断掉的连签补起来时，可能顺带达成里程碑 / 月度档位（后端按跨越口径补发）
      const crossed = res.data.crossed || {}
      const achieved = []
      if ((crossed.streak || []).length) achieved.push(`连续 ${crossed.streak.join('、')} 天里程碑`)
      if ((crossed.monthly || []).length) achieved.push(`当月满 ${crossed.monthly.join('、')} 天奖励`)
      if (achieved.length) parts.push(`并达成 ${achieved.join('、')}`)

      toast.success(parts.join('，'), achieved.length ? 5000 : undefined)
      selectedMakeup.value = 0
      loadStatus()
      loadCalendar()
      loadRank()
    } else if (res.code === 202) {
      toast.info(res.msg || '补签失败')
      loadStatus()
    }
  } catch {
    // 错误已由拦截器提示
  } finally {
    makeupLoading.value = false
  }
}

function loadAll() {
  if (!isLogged.value) return
  loadStatus()
  loadCalendar()
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

/* ---------- 未登录 / 未开放引导 ---------- */
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
.hero-chip {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  margin-right: 8px;
  color: var(--primary);
  font-weight: 600;
}
/* 概率 / 区间奖励：非必得，弱化展示，避免与「签到可得」混淆 */
.hero-variable {
  display: block;
  margin-top: 3px;
  font-size: 12px;
  color: var(--text-muted);
}
.hero-variable i {
  color: #d4a148;
}
.checkin-hero__actions {
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.checkin-hero__btn {
  /* 保留渐变作为签到按钮的专属视觉标识 */
  background: linear-gradient(135deg, var(--primary), var(--primary-deep));
}
.checkin-hero__btn:hover:not(:disabled) {
  filter: brightness(1.05);
}
.checkin-hero__ghost {
  font-size: 12px;
  color: var(--text-muted);
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

/* ---------- 奖励明细 ---------- */
.reward-group + .reward-group {
  margin-top: 12px;
}
.reward-group__head {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 6px;
}
.reward-group__title {
  font-size: 13px;
  font-weight: 600;
  color: var(--text);
}
.reward-group__hint {
  font-size: 12px;
  color: #d4a148;
}
.reward-items {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.reward-chip {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 5px 10px;
  font-size: 13px;
  color: var(--text);
  background: var(--bg-muted);
  border: 1px solid var(--border-soft);
  border-radius: 999px;
}
.reward-chip i {
  color: var(--primary);
}
.reward-chip em {
  font-style: normal;
  font-size: 11px;
  color: var(--text-muted);
}
.reward-chip__chance {
  color: #d4a148;
}

/* ---------- 卡密 ---------- */
.card-row {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
  padding: 10px 12px;
  margin-bottom: 8px;
  background: linear-gradient(135deg, var(--gold-wash), var(--accent-wash));
  border: 1px dashed var(--gold-line);
  border-radius: var(--radius-sm);
}
.card-code {
  padding: 4px 10px;
  font-size: 14px;
  font-weight: 700;
  letter-spacing: 1px;
  color: var(--primary-deep);
  background: var(--bg-card);
  border: 1px solid var(--gold-line);
  border-radius: 6px;
  user-select: all;
}
.card-face {
  font-size: 12px;
  color: var(--text-muted);
}
.card-tip {
  display: flex;
  align-items: center;
  gap: 6px;
  margin: 4px 0 0;
  font-size: 12px;
  color: var(--text-muted);
}

/* ---------- 周期奖励 ---------- */
.cycle-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(92px, 1fr));
  gap: 8px;
}
.cycle-cell {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  padding: 10px 6px;
  text-align: center;
  background: var(--bg-muted);
  border: 1px solid var(--border-soft);
  border-radius: var(--radius-sm);
}
.cycle-cell.done {
  opacity: 0.6;
}
.cycle-cell.current {
  background: linear-gradient(135deg, var(--accent-soft), var(--accent-wash));
  border-color: var(--gold-line);
}
.cycle-cell__day {
  font-size: 12px;
  color: var(--text-muted);
}
.cycle-cell__reward {
  font-size: 13px;
  font-weight: 600;
  color: var(--primary-deep);
}
.cycle-cell__reward.is-plain {
  font-size: 12px;
  font-weight: 500;
  color: var(--text-muted);
}
.cycle-cell__label {
  min-height: 14px;
  font-size: 11px;
  color: var(--text-muted);
}

/* ---------- 里程碑 / 月度 ---------- */
.milestone-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.milestone-row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border: 1px solid var(--border-soft);
  border-radius: var(--radius-sm);
  background: var(--bg-muted);
}
.milestone-row.reached {
  background: linear-gradient(135deg, var(--gold-wash), var(--accent-wash));
  border-color: var(--gold-line);
}
.milestone-row__badge {
  font-size: 16px;
  color: var(--text-muted);
}
.milestone-row.reached .milestone-row__badge {
  color: var(--success);
}
.milestone-row__info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.milestone-row__title {
  font-size: 13px;
  font-weight: 600;
  color: var(--text);
}
.milestone-row__title em {
  margin-left: 6px;
  font-style: normal;
  font-size: 12px;
  font-weight: 500;
  color: var(--text-muted);
}
.milestone-row__rewards {
  display: inline-flex;
  flex-wrap: wrap;
  gap: 10px;
  font-size: 12px;
  color: var(--text-muted);
}
.milestone-row__rewards i {
  color: #d4a148;
}
.milestone-row__state {
  flex-shrink: 0;
  font-size: 12px;
  color: var(--text-muted);
}
.milestone-bar {
  height: 8px;
  margin-top: 10px;
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
/* 补签：虚框 + 斜纹，和正常签到区分 */
.calendar-cell--day.makeup {
  background: repeating-linear-gradient(45deg, var(--accent-soft), var(--accent-soft) 4px, var(--bg-card) 4px, var(--bg-card) 8px);
  border-color: var(--primary);
  color: var(--primary);
}
.calendar-cell--day.today {
  border-color: var(--primary);
  color: var(--primary);
  font-weight: 700;
}
.calendar-cell--day.today.checked {
  color: #fff;
}

/* ---------- 补签 ---------- */
.makeup-tip {
  margin: 0 0 10px;
  font-size: 12px;
  color: var(--text-muted);
}
.makeup-dates {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.makeup-date {
  padding: 5px 10px;
  font-size: 12px;
  color: var(--text-soft);
  background: var(--bg-muted);
  border: 1px solid var(--border-soft);
  border-radius: 999px;
  cursor: pointer;
  transition: all 0.15s;
}
.makeup-date:hover {
  border-color: var(--primary);
  color: var(--primary);
}
.makeup-date.active {
  color: #fff;
  background: linear-gradient(135deg, var(--primary), var(--primary-deep));
  border-color: transparent;
}
.makeup-foot {
  margin-top: 12px;
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
.rank-item.me {
  border-color: var(--primary);
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
  gap: 6px;
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
  .checkin-hero__actions {
    width: 100%;
    flex-direction: row;
    align-items: center;
  }
  .checkin-hero__btn {
    flex: 1;
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
