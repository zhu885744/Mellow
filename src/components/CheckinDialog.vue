<template>
  <Teleport to="body">
    <Transition name="modal-fade">
      <div v-if="state.visible" class="checkin-overlay" @click.self="hide()">
        <div class="checkin-dialog">
          <!-- 头部 -->
          <div class="checkin-header">
            <span class="checkin-title"><i class="bi bi-calendar-check" /> 每日签到</span>
            <button class="close-btn" @click="hide()"><i class="bi bi-x-lg" /></button>
          </div>

          <!-- Tab -->
          <div class="checkin-tabs">
            <button
              :class="['checkin-tab', { active: state.activeTab === 'checkin' }]"
              @click="switchTab('checkin')"
            >签到</button>
            <button
              :class="['checkin-tab', { active: state.activeTab === 'rank' }]"
              @click="switchTab('rank')"
            >排行榜</button>
          </div>

          <!-- 签到面板 -->
          <div v-show="state.activeTab === 'checkin'" class="checkin-panel">
            <div class="status-card">
              <div :class="['status-icon', { checked: state.checkinStatus.checked }]">
                <i class="bi" :class="state.checkinStatus.checked ? 'bi-check-lg' : 'bi-calendar-check'" />
              </div>
              <div class="status-info">
                <div class="status-title">{{ state.checkinStatus.checked ? '今日已签到' : '今日未签到' }}</div>
                <div class="status-desc">
                  {{ state.checkinStatus.checked ? `已获得 ${state.checkinStatus.value} 经验值` : '每日签到获得经验值' }}
                </div>
              </div>
            </div>

            <div class="stats-row">
              <div class="stat-item">
                <div class="stat-value">{{ state.checkinStatus.streak || 0 }}</div>
                <div class="stat-label">连续签到[天]</div>
              </div>
              <div class="stat-item">
                <div class="stat-value">{{ state.checkinStatus.value || 0 }}</div>
                <div class="stat-label">今日获得[经验]</div>
              </div>
            </div>

            <button
              class="checkin-btn"
              :class="{ disabled: state.loading || state.checkinStatus.checked }"
              :disabled="state.loading || state.checkinStatus.checked"
              @click="performCheckin"
            >
              <span v-if="state.loading" class="spinner"></span>
              <span v-if="state.loading">签到中...</span>
              <span v-else-if="state.checkinStatus.checked">今日已签到</span>
              <span v-else>立即签到</span>
            </button>
          </div>

          <!-- 排行榜面板 -->
          <div v-show="state.activeTab === 'rank'" class="rank-panel">
            <div class="rank-tabs">
              <button
                v-for="item in timeRangeOptions"
                :key="item.key"
                :class="['rank-tab', { active: state.timeRange === item.key }]"
                @click="switchTimeRange(item.key)"
              >{{ item.label }}</button>
            </div>

            <div v-if="state.rankLoading" class="rank-loading">
              <span class="spinner"></span>
              <span>加载中...</span>
            </div>
            <div v-else-if="state.rankList.length === 0" class="rank-empty">
              <div class="empty-icon"><i class="bi bi-trophy" /></div>
              <p>暂无排行数据</p>
            </div>
            <div v-else class="rank-list">
              <div
                v-for="(item, index) in state.rankList"
                :key="item.id || index"
                :class="['rank-item', { top: index < 3 }]"
              >
                <div class="rank-num" :class="`rank-${item.rank}`">
                  <span v-if="item.rank <= 3">
                    <i class="bi" :class="['bi-1-circle-fill', 'bi-2-circle-fill', 'bi-3-circle-fill'][item.rank - 1]" />
                  </span>
                  <span v-else>{{ item.rank }}</span>
                </div>
                <img :src="item.avatar || defaultAvatar" class="rank-avatar" />
                <div class="rank-info">
                  <span class="rank-name">{{ item.nickname || '匿名用户' }}</span>
                  <span class="rank-stats">
                    <i class="bi bi-calendar-check" /> {{ item.check_in_count || 0 }}次 · <i class="bi bi-star" /> {{ item.total_exp || 0 }}经验
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
import { reactive, onUnmounted } from 'vue'
import { checkIn, checkInStatus, checkInRank } from '@/api/users'
import { toast } from '@/utils/toast'

const defaultAvatar = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40"><circle cx="20" cy="20" r="20" fill="%23e8e6dd"/></svg>'

const timeRangeOptions = [
  { key: 'today', label: '今日' },
  { key: 'week', label: '本周' },
  { key: 'month', label: '本月' }
]

const state = reactive({
  visible: false,
  activeTab: 'checkin',
  loading: false,
  timeRange: 'month',
  rankList: [],
  rankLoading: false,
  checkinStatus: {
    checked: false,
    value: 0,
    check_in_time: 0,
    streak: 0,
    today: 0
  }
})

const show = () => {
  state.visible = true
  state.activeTab = 'checkin'
  state.rankList = []
  document.body.style.overflow = 'hidden'
  loadCheckinStatus()
}

const hide = () => {
  state.visible = false
  document.body.style.overflow = ''
}

const switchTab = (tab) => {
  state.activeTab = tab
  if (tab === 'rank' && state.rankList.length === 0) {
    loadRankList()
  }
}

const switchTimeRange = (key) => {
  state.timeRange = key
  state.rankList = []
  loadRankList()
}

const getTimeRange = () => {
  const now = new Date()
  let start, end
  switch (state.timeRange) {
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

const loadCheckinStatus = async () => {
  try {
    const res = await checkInStatus()
    if (res.code === 200 && res.data) {
      state.checkinStatus = {
        checked: res.data.checked || false,
        value: res.data.value || 0,
        check_in_time: res.data.check_in_time || 0,
        streak: res.data.streak || 0,
        today: res.data.today || 0
      }
    }
  } catch {
    // 静默
  }
}

const performCheckin = async () => {
  if (state.loading || state.checkinStatus.checked) return
  state.loading = true
  try {
    const res = await checkIn()
    if (res.code === 200 && res.data) {
      toast.success(`签到成功！获得 ${res.data.value} 经验值`)
      state.checkinStatus.checked = true
      state.checkinStatus.value = res.data.value || 10
      state.checkinStatus.streak = (state.checkinStatus.streak || 0) + 1
    } else if (res.code === 202) {
      toast.info(res.msg || '今日已签到')
      state.checkinStatus.checked = true
    }
  } catch {
    // 错误已由拦截器提示
  } finally {
    state.loading = false
  }
}

const loadRankList = async () => {
  state.rankLoading = true
  try {
    const { start, end } = getTimeRange()
    const params = {}
    if (start !== undefined) params.start = start
    if (end !== undefined) params.end = end
    const res = await checkInRank(params)
    if (res.code === 200 && res.data) {
      state.rankList = Array.isArray(res.data) ? res.data : (res.data.data || [])
    }
  } catch {
    // 静默
  } finally {
    state.rankLoading = false
  }
}

onUnmounted(() => {
  document.body.style.overflow = ''
})

defineExpose({ show, hide })
</script>

<style scoped>
.checkin-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
}
.checkin-dialog {
  width: 100%;
  max-width: 460px;
  background: var(--bg-card);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-md);
  overflow: hidden;
}
.checkin-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 18px 20px;
  background: linear-gradient(135deg, rgba(184, 153, 104, 0.12), rgba(184, 153, 104, 0.05));
  border-bottom: 1px solid var(--border-soft);
}
.checkin-title {
  font-size: 16px;
  font-weight: 600;
  color: var(--text);
}
.close-btn {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: var(--bg-muted);
  color: var(--text-muted);
  font-size: 18px;
  line-height: 1;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}
.close-btn:hover {
  background: var(--danger);
  color: #fff;
}

.checkin-tabs {
  display: flex;
  border-bottom: 2px solid var(--border-soft);
  padding: 0 20px;
}
.checkin-tab {
  padding: 10px 16px;
  background: none;
  border: none;
  color: var(--text-muted);
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  position: relative;
  transition: color 0.2s;
}
.checkin-tab:hover {
  color: var(--primary);
}
.checkin-tab.active {
  color: var(--primary);
}
.checkin-tab.active::after {
  content: '';
  position: absolute;
  bottom: -2px;
  left: 0;
  right: 0;
  height: 3px;
  background: var(--primary);
  border-radius: 3px 3px 0 0;
}

.checkin-panel,
.rank-panel {
  padding: 20px;
}

.status-card {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 20px;
  background: var(--bg-muted);
  border: 1px solid var(--border-soft);
  border-radius: var(--radius);
  margin-bottom: 16px;
}
.status-icon {
  width: 52px;
  height: 52px;
  border-radius: 50%;
  background: linear-gradient(135deg, var(--primary), var(--primary-deep));
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  flex-shrink: 0;
}
.status-icon.checked {
  background: linear-gradient(135deg, var(--success), #5a8a3a);
}
.status-info {
  flex: 1;
  min-width: 0;
}
.status-title {
  font-size: 15px;
  font-weight: 700;
  margin-bottom: 4px;
}
.status-desc {
  font-size: 13px;
  color: var(--text-muted);
}

.stats-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  margin-bottom: 20px;
}
.stat-item {
  text-align: center;
  padding: 16px 8px;
  background: var(--bg-muted);
  border: 1px solid var(--border-soft);
  border-radius: var(--radius);
}
.stat-value {
  font-size: 26px;
  font-weight: 700;
  color: var(--primary-deep);
  line-height: 1.2;
}
.stat-label {
  font-size: 12px;
  color: var(--text-muted);
}

.checkin-btn {
  width: 100%;
  padding: 14px 24px;
  border: none;
  border-radius: var(--radius);
  background: linear-gradient(135deg, var(--primary), var(--primary-deep));
  color: #fff;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.25s;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}
.checkin-btn:hover:not(.disabled) {
  transform: translateY(-2px);
  filter: brightness(1.05);
}
.checkin-btn.disabled {
  background: var(--border);
  color: var(--text-muted);
  cursor: not-allowed;
}
.checkin-btn .spinner {
  width: 16px;
  height: 16px;
  border: 2px solid rgba(255, 255, 255, 0.4);
  border-top-color: #fff;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

.rank-tabs {
  display: flex;
  gap: 6px;
  margin-bottom: 16px;
  background: var(--bg-muted);
  padding: 4px;
  border-radius: var(--radius);
}
.rank-tab {
  flex: 1;
  padding: 7px 8px;
  border: none;
  border-radius: 6px;
  background: transparent;
  color: var(--text-muted);
  font-size: 13px;
  cursor: pointer;
  transition: all 0.2s;
}
.rank-tab.active {
  background: var(--bg-card);
  color: var(--primary);
  font-weight: 600;
  box-shadow: var(--shadow-sm);
}
.rank-loading,
.rank-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 40px 20px;
  color: var(--text-muted);
  gap: 8px;
}
.rank-empty .empty-icon {
  font-size: 36px;
  opacity: 0.5;
}
.rank-empty p {
  margin: 0;
  font-size: 13px;
}
.rank-list {
  max-height: 360px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.rank-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  border-radius: var(--radius-sm);
  background: var(--bg-muted);
  border: 1px solid var(--border-soft);
}
.rank-item.top {
  background: linear-gradient(135deg, rgba(212, 161, 72, 0.12), rgba(184, 153, 104, 0.06));
  border-color: rgba(212, 161, 72, 0.3);
}
.rank-num {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 15px;
  font-weight: 700;
  flex-shrink: 0;
  border-radius: 50%;
  background: var(--bg-card);
  border: 1px solid var(--border);
}
.rank-item.top .rank-num {
  border: none;
  background: transparent;
}
.rank-avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  object-fit: cover;
  flex-shrink: 0;
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
  font-size: 12px;
  color: var(--text-muted);
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.modal-fade-enter-active,
.modal-fade-leave-active {
  transition: opacity 0.25s;
}
.modal-fade-enter-active .checkin-dialog,
.modal-fade-leave-active .checkin-dialog {
  transition: transform 0.25s, opacity 0.25s;
}
.modal-fade-enter-from,
.modal-fade-leave-to {
  opacity: 0;
}
.modal-fade-enter-from .checkin-dialog,
.modal-fade-leave-to .checkin-dialog {
  transform: scale(0.95) translateY(-10px);
  opacity: 0;
}
</style>
