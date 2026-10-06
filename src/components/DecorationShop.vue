<template>
  <div class="decoration-shop">
    <!-- 类型分区：由后端 types 元数据驱动，新增装扮类型前端自动出现 -->
    <div class="category-bar">
      <button
        v-for="t in typeTabs"
        :key="t.type"
        type="button"
        class="chip"
        :class="{ active: activeType === t.type }"
        @click="switchType(t.type)"
      >
        <i :class="t.icon" aria-hidden="true" /> {{ t.name }}
      </button>
      <!-- 商城主打「兑换」；已拥有装扮的查看 / 佩戴 / 卸下集中在「我的装扮」页 -->
      <RouterLink v-if="userStore.isLogged" to="/user/decorations" class="mine-link">
        <i class="bi bi-gem" aria-hidden="true" /> 我的装扮
      </RouterLink>
    </div>

    <div v-if="loading" class="loading"><span class="spinner" /> 加载中...</div>
    <div v-else-if="!list.length" class="card card-pad">
      <!-- 接口失败（无权限 / 未开启等）时显示真实原因，避免看起来像「本来就没有装扮」 -->
      <EmptyState icon="bi bi-palette" :text="loadError || '暂无可兑换的装扮'" />
    </div>
    <div v-else class="decoration-grid">
      <div v-for="item in list" :key="item.id" class="decoration-card card">
        <div class="decoration-preview" :class="{ 'is-title': item.type === 'title' }">
          <!-- 头像框：直接展示素材；头衔：用统一渲染组件预览 -->
          <img
            v-if="item.type === 'avatar_frame'"
            :src="item.preview || item.payload?.image"
            class="decoration-frame"
            :alt="item.name"
          />
          <TitleBadge v-else :payload="item.payload" :size="'lg'" />
          <!-- 稀有度：后台「装扮管理」里设置的档位，用于区分装扮的稀有程度 -->
          <span v-if="item.rarity" class="rarity-badge" :class="`is-${rarityMeta(item.rarity).tone}`">
            {{ rarityMeta(item.rarity).label }}
          </span>
        </div>

        <div class="decoration-body">
          <div class="decoration-name">
            {{ item.name }}
            <span v-if="item.is_default" class="decoration-tag">默认</span>
            <span v-else-if="wearingIds[item.type] === item.id" class="decoration-tag is-wearing">佩戴中</span>
            <span v-else-if="ownedIds.includes(item.id)" class="decoration-tag is-owned">已拥有</span>
          </div>
          <div class="decoration-desc">{{ item.description || '暂无描述' }}</div>

          <div class="decoration-foot">
            <span class="decoration-price">
              <template v-if="item.is_default || item.price <= 0">
                <i class="bi bi-gift" /> 免费
              </template>
              <template v-else>
                <i class="bi bi-coin" /> {{ item.price }}
              </template>
            </span>
            <span v-if="Number(item.stock) > 0" class="decoration-stock">
              库存 {{ item.stock }}
            </span>
            <span v-else-if="item.sold_out" class="decoration-stock is-sold-out">已售罄</span>
            <span v-if="Number(item.limit_per_user) > 0" class="decoration-stock">
              限购 {{ item.limit_per_user }} 件<template v-if="Number(item.limit_remain) >= 0"> · 剩 {{ item.limit_remain }}</template>
            </span>
            <!-- 有效期：已拥有的显示剩余天数，未拥有的显示装扮自身的有效期（永久 / N 天） -->
            <span class="decoration-stock is-duration">
              <i class="bi bi-clock-history" aria-hidden="true" /> {{ durationText(item) }}
            </span>
          </div>

          <!-- 操作区：已拥有/默认 → 佩戴；未拥有且有商品 → 兑换 -->
          <button
            v-if="item.is_default || ownedIds.includes(item.id)"
            class="btn btn-block"
            :class="wearingIds[item.type] === item.id ? 'btn-ghost' : 'btn-primary'"
            :disabled="wearingIds[item.type] === item.id || wearingId === item.id"
            @click="wear(item)"
          >
            <span v-if="wearingId === item.id" class="spinner"></span>
            <template v-else-if="wearingIds[item.type] === item.id">
              <i class="bi bi-check-circle-fill" /> 已佩戴
            </template>
            <template v-else>立即佩戴</template>
          </button>
          <button
            v-else
            class="btn btn-primary btn-block"
            :disabled="!item.on_sale || buyingId === item.id"
            :title="item.on_sale ? '' : (item.buy_reason || '该装扮暂未上架，可通过活动获取')"
            @click="askBuy(item)"
          >
            <span v-if="buyingId === item.id" class="spinner"></span>
            <template v-else-if="!item.on_sale">{{ item.buy_reason || '暂未上架' }}</template>
            <template v-else-if="!userStore.isLogged">登录后兑换</template>
            <template v-else>兑换</template>
          </button>
        </div>
      </div>
    </div>

    <!-- 头衔样式模板：佩戴前需要自填文字 -->
    <Teleport to="body">
      <Transition name="modal-fade">
        <div v-if="pendingTitle" class="modal-overlay" @click.self="pendingTitle = null">
          <div class="modal-card">
            <div class="modal-header">
              <span class="modal-title">设置头衔文字</span>
              <button class="btn btn-icon btn-sm btn-round" @click="pendingTitle = null"><i class="bi bi-x-lg" /></button>
            </div>
            <div class="modal-body">
              <div class="pending-preview">
                <TitleBadge :payload="pendingTitle.payload" :text="customTitleText" :size="'lg'" />
              </div>
              <input
                v-model="customTitleText"
                class="input"
                maxlength="10"
                placeholder="请输入头衔文字（最多 10 字）"
                @keyup.enter="confirmWear"
              />
            </div>
            <div class="modal-footer">
              <button class="btn btn-ghost" @click="pendingTitle = null">取消</button>
              <button class="btn btn-primary" @click="confirmWear">确定佩戴</button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- 兑换确认 -->
    <ConfirmDialog
      v-model:visible="showConfirm"
      title="确认兑换"
      :message="`确定使用 ${confirmItem?.price ?? 0} 积分兑换「${confirmItem?.name ?? ''}」吗？有效期 ${formatDuration(confirmItem?.duration)}，兑换后可在「我的装扮」中佩戴。`"
      confirm-text="确认兑换"
      cancel-text="再想想"
      loading-text="兑换中..."
      :loading="buyingId !== null"
      @confirm="doBuy"
    />
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { useUserStore } from '@/stores/user'
import { getDecorationShop, getMyDecorations, wearDecoration, buyDecoration } from '@/api/decoration'
import { toast } from '@/utils/toast'
import { formatDuration } from '@/utils/time'
import { rarityMeta } from '@/utils/decoration'
import TitleBadge from '@/components/TitleBadge.vue'
import EmptyState from '@/components/EmptyState.vue'
import ConfirmDialog from '@/components/ConfirmDialog.vue'

// 兑换成功后通知父页面刷新积分余额与统计
const emit = defineEmits(['purchased'])

const route = useRoute()
const userStore = useUserStore()

const loading = ref(false)
const list = ref([])
// 列表加载失败原因（如后端未补录权限规则导致 403），用于替代「暂无装扮」的空状态文案
const loadError = ref('')
const types = ref([])
const activeType = ref('')
const owning = ref({ wearing: {}, list: {} })

const buyingId = ref(null)
const wearingId = ref(null)
const showConfirm = ref(false)
const confirmItem = ref(null)
const pendingTitle = ref(null)
const customTitleText = ref('')

// 类型分区：始终提供「全部」+ 后端声明的类型
const typeTabs = computed(() => [
  { type: '', name: '全部', icon: 'bi-grid' },
  ...types.value.map((t) => ({ type: t.type, name: t.name, icon: t.icon }))
])

const ownedIds = computed(() => {
  const ids = []
  Object.values(owning.value.list || {}).forEach((group) => {
    ;(group || []).forEach((item) => {
      if (item.owned && !item.expired) ids.push(item.id)
    })
  })
  return ids
})

const wearingIds = computed(() => {
  const map = {}
  Object.values(owning.value.wearing || {}).forEach((item) => {
    if (item?.id) map[item.type] = item.id
  })
  return map
})

// 有效期文案：已拥有且带过期时间 → 剩余天数；否则按装扮自身有效期（0=永久）
function durationText(item) {
  if (item.expire_time) {
    const days = Math.ceil((Number(item.expire_time) * 1000 - Date.now()) / 86400000)
    return days <= 0 ? '已过期' : `有效期 剩余 ${days} 天`
  }
  if (item.is_default && !Number(item.duration)) return '有效期 永久'
  return `有效期 ${formatDuration(item.duration)}`
}

async function loadShop() {
  loading.value = true
  loadError.value = ''
  try {
    const res = await getDecorationShop(activeType.value ? { type: activeType.value } : {})
    const data = res.data
    // 后端「装扮商城未开启」等业务性拒绝：200 + 空 data + 说明性 msg
    if (!data) {
      list.value = []
      loadError.value = res.msg || ''
      return
    }
    list.value = data.data || []
    if (data.types?.length) types.value = data.types
  } catch (err) {
    list.value = []
    loadError.value = err?.msg || '装扮列表加载失败，请稍后重试'
  } finally {
    loading.value = false
  }
}

async function loadMine() {
  if (!userStore.isLogged) {
    owning.value = { wearing: {}, list: {} }
    return
  }
  try {
    const res = await getMyDecorations()
    owning.value = res.data || { wearing: {}, list: {} }
  } catch {
    owning.value = { wearing: {}, list: {} }
  }
}

function switchType(type) {
  if (activeType.value === type) return
  activeType.value = type
  loadShop()
}

function wear(item) {
  // 纯样式类头衔：先让用户填写文字
  if (item.type === 'title' && !item.payload?.text) {
    pendingTitle.value = item
    customTitleText.value = item.custom_text || ''
    return
  }
  doWear(item, '')
}

async function doWear(item, text) {
  wearingId.value = item.id
  try {
    await wearDecoration(item.id, text)
    toast.success('佩戴成功')
    pendingTitle.value = null
    await Promise.all([loadMine(), loadShop(), userStore.checkLoginState()])
    emit('purchased')
  } catch {
    // 错误已由拦截器提示
  } finally {
    wearingId.value = null
  }
}

function confirmWear() {
  const item = pendingTitle.value
  if (!item) return
  if (!customTitleText.value.trim()) {
    toast.warning('请输入头衔文字')
    return
  }
  doWear(item, customTitleText.value.trim())
}

function askBuy(item) {
  if (!userStore.isLogged) {
    toast.info('请先登录')
    return
  }
  confirmItem.value = item
  showConfirm.value = true
}

async function doBuy() {
  const item = confirmItem.value
  if (!item) return
  buyingId.value = item.id
  try {
    // 直接兑换装扮（只扣积分，与积分商城的商品/订单无关）
    const res = await buyDecoration(item.id)
    const balance = res?.data?.integral
    toast.success(balance === undefined ? '兑换成功，快去佩戴吧' : `兑换成功，剩余 ${balance} 积分`)
    showConfirm.value = false
    confirmItem.value = null
    await Promise.all([loadMine(), loadShop()])
    emit('purchased')
  } catch {
    // 错误已由拦截器提示
  } finally {
    buyingId.value = null
  }
}

onMounted(() => {
  // 支持 /goods?tab=decoration 直接从外部进入装扮分区
  if (route.query.tab === 'decoration') activeType.value = ''
  loadShop()
  loadMine()
})

// 供父组件在切换到装扮分区时调用
defineExpose({ refresh: () => Promise.all([loadShop(), loadMine()]) })
</script>

<style scoped>
.decoration-shop {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

/* 复用商品分类 chip 的视觉（scoped 样式无法继承父页面，这里单独声明） */
.category-bar {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
}
.chip {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 12px;
  border: 1px solid var(--border);
  border-radius: 999px;
  background: var(--bg-card);
  color: var(--text-soft);
  font-size: 13px;
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
/* 去「我的装扮」的入口：贴在分类条右侧，不抢类型分区的视觉重心 */
.mine-link {
  margin-left: auto;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 12px;
  border: 1px solid var(--border);
  border-radius: 999px;
  background: var(--bg-card);
  color: var(--text-soft);
  font-size: 13px;
  text-decoration: none;
  transition: all 0.18s;
}
.mine-link:hover {
  border-color: var(--primary-soft);
  color: var(--primary);
}

.decoration-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(190px, 1fr));
  gap: 14px;
}

.decoration-card {
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.decoration-preview {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  height: 132px;
  background: var(--bg-muted);
  border-bottom: 1px solid var(--border-soft);
  padding: 8px;
  overflow: hidden;
}

.decoration-preview.is-title {
  padding: 16px;
}

/* 稀有度角标：普通 / 稀有 / 史诗 / 传说，取值来自后台「装扮管理」的设置 */
.rarity-badge {
  position: absolute;
  top: 8px;
  right: 8px;
  padding: 0 8px;
  font-size: 11px;
  font-weight: 600;
  line-height: 18px;
  border-radius: 999px;
  background: var(--bg-card);
  color: var(--text-muted);
}
.rarity-badge.is-rare {
  background: rgba(74, 144, 226, 0.14);
  color: #4a90e2;
}
.rarity-badge.is-epic {
  background: rgba(143, 106, 214, 0.16);
  color: #8f6ad6;
}
.rarity-badge.is-legend {
  background: var(--gold-soft);
  color: #c7902f;
}

.decoration-frame {
  width: 84px;
  height: 84px;
  object-fit: contain;
}

.decoration-body {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 12px;
  flex: 1;
}

.decoration-name {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 14px;
  font-weight: 600;
}

.decoration-tag {
  padding: 1px 6px;
  font-size: 11px;
  font-weight: 500;
  border-radius: 4px;
  background: var(--bg-muted);
  color: var(--text-muted);
}

.decoration-tag.is-wearing {
  background: var(--primary-soft, rgba(64, 128, 255, 0.14));
  color: var(--primary, #4080ff);
}

.decoration-tag.is-owned {
  background: rgba(63, 160, 106, 0.14);
  color: #3fa06a;
}

.decoration-desc {
  font-size: 12px;
  color: var(--text-muted);
  line-height: 1.5;
  min-height: 36px;
}

.decoration-foot {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 6px 8px;
  font-size: 12px;
  color: var(--text-muted);
  margin-top: auto;
}

.decoration-price {
  font-size: 14px;
  font-weight: 600;
  color: var(--primary, #4080ff);
}

.decoration-stock {
  font-size: 11px;
}

/* 售罄：用警示色与普通库存信息区分 */
.decoration-stock.is-sold-out {
  color: var(--danger);
}

/* 有效期：稍作强调，避免被库存等次要信息淹没 */
.decoration-stock.is-duration {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  color: #c7902f;
}

.pending-preview {
  display: flex;
  justify-content: center;
  padding: 12px 0 16px;
}

/* 弹窗：商品页的弹窗样式是 scoped 的，组件内需要单独声明 */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
}
.modal-card {
  width: 100%;
  max-width: 420px;
  background: var(--bg-card);
  border-radius: var(--radius-xl);
  box-shadow: var(--shadow-md);
  overflow: hidden;
}
.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  border-bottom: 1px solid var(--border-soft);
}
.modal-title {
  font-size: 16px;
  font-weight: 600;
}
.modal-body {
  padding: 20px;
}
.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  padding: 16px 20px;
  border-top: 1px solid var(--border-soft);
}
.input {
  width: 100%;
  padding: 9px 12px;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  background: var(--bg);
  color: var(--text);
  font-size: 14px;
  outline: none;
  box-sizing: border-box;
  font-family: inherit;
}
.input:focus {
  border-color: var(--primary);
}

.modal-fade-enter-active,
.modal-fade-leave-active {
  transition: opacity 0.2s;
}
.modal-fade-enter-from,
.modal-fade-leave-to {
  opacity: 0;
}

.loading {
  padding: 48px;
  text-align: center;
  color: var(--text-muted);
}
</style>
