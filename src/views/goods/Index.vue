<template>
  <div class="goods-page">
    <SectionTitle title="积分商城">
      <template #extra>
        <router-link to="/user/integral" class="text-muted link">我的积分 <i class="bi bi-arrow-right" /></router-link>
      </template>
    </SectionTitle>

    <!-- 积分余额卡片 -->
    <div v-if="userStore.isLogged" class="card card-pad balance-card">
      <div class="balance-left">
        <i class="bi bi-coin balance-icon" aria-hidden="true" />
        <div class="balance-info">
          <div class="balance-label">我的积分余额</div>
          <div class="balance-value">
            <span class="balance-num">{{ balance }}</span>
            <span class="balance-unit">积分</span>
          </div>
        </div>
      </div>
      <div class="balance-tip">
        <i class="bi bi-lightbulb" aria-hidden="true" />
        <span>通过签到、发布内容等任务赚取积分</span>
      </div>
      <!-- 我的兑换统计 -->
      <div class="balance-stats">
        <div class="stat-item">
          <span class="stat-num">{{ myStats.pending }}</span>
          <span class="stat-label">待发货</span>
        </div>
        <div class="stat-item">
          <span class="stat-num">{{ myStats.shipped }}</span>
          <span class="stat-label">已发货</span>
        </div>
        <div class="stat-item">
          <span class="stat-num">{{ myStats.completed }}</span>
          <span class="stat-label">已完成</span>
        </div>
        <div class="stat-item">
          <span class="stat-num">{{ myStats.integral_spent }}</span>
          <span class="stat-label">累计消耗积分</span>
        </div>
      </div>
    </div>
    <div v-else class="card card-pad balance-card">
      <div class="balance-left">
        <i class="bi bi-coin balance-icon" aria-hidden="true" />
        <div class="balance-info">
          <div class="balance-label">登录后查看积分</div>
        </div>
      </div>
      <router-link to="/auth/login" class="btn btn-sm btn-primary">立即登录</router-link>
    </div>

    <!-- 商品分类 -->
    <div v-if="categories.length > 1" class="category-bar">
      <button
        v-for="c in categories"
        :key="c.category || 'all'"
        type="button"
        class="chip"
        :class="{ active: activeCategory === c.category }"
        @click="setCategory(c.category)"
      >
        {{ c.name }}
        <em class="chip-count">{{ c.count }}</em>
      </button>
    </div>

    <!-- 商品列表 -->
    <div v-if="loading" class="loading"><span class="spinner" /> 加载中...</div>
    <div v-else-if="!goodsList.length" class="card card-pad">
      <EmptyState text="暂无商品" />
    </div>
    <div v-else class="goods-grid">
      <div v-for="g in goodsList" :key="g.id" class="goods-card card">
        <div class="goods-cover-wrap">
          <img :src="g.cover || defaultCover" class="goods-cover" :alt="g.title" @error="onCoverError" />
        </div>
        <div class="goods-body">
          <div class="goods-title">
            {{ g.title }}
            <span class="type-tag" :class="g.type === 'physical' ? 'physical' : 'virtual'">
              {{ g.type === 'physical' ? '实物' : '虚拟' }}
            </span>
          </div>
          <div class="goods-desc">{{ g.description || '暂无描述' }}</div>
          <div class="goods-tags">
            <span v-if="Number(g.limit_per_user) > 0" class="goods-tag">
              限购 {{ g.limit_per_user }} 件<template v-if="Number(g.limit_remain) >= 0"> · 剩 {{ g.limit_remain }}</template>
            </span>
            <span v-if="Number(g.min_exp) > 0" class="goods-tag">需经验达到 {{ g.min_exp }} 可兑换</span>
            <span v-if="Number(g.sold) > 0" class="goods-tag">已兑 {{ g.sold }}</span>
          </div>
          <div class="goods-foot">
            <span class="goods-price"><i class="bi bi-coin" /> {{ g.price }}</span>
            <span class="goods-stock" :class="{ empty: Number(g.stock) <= 0 }">
              {{ Number(g.stock) > 0 ? `库存 ${g.stock}` : '已售罄' }}
            </span>
          </div>
          <button
            class="btn btn-primary btn-block"
            :disabled="g.can_buy === false || buyingId === g.id"
            @click="buy(g)"
          >
            <span v-if="buyingId === g.id" class="spinner"></span>
            <span v-else>{{ g.can_buy === false ? (g.buy_reason || '不可兑换') : '兑换' }}</span>
          </button>
        </div>
      </div>
    </div>

    <!-- 我的订单 -->
    <template v-if="userStore.isLogged">
      <h3 class="block-title">我的兑换记录</h3>
      <div v-if="ordersLoading" class="loading"><span class="spinner" /> 加载中...</div>
      <div v-else-if="!orders.length" class="card card-pad">
        <EmptyState text="还没有兑换记录" />
      </div>
      <div v-else class="order-list">
        <div v-for="o in orders" :key="o.id" class="order-card card">
          <img :src="o.result?.goods?.cover || defaultCover" class="order-card-cover" :alt="o.result?.goods?.title" @error="onCoverError" />
          <div class="order-card-body">
            <div class="order-card-head">
              <span class="order-card-title">{{ o.result?.goods?.title || o.goods_title || `商品 #${o.goods_id}` }}</span>
              <span class="status-tag" :class="`status-${o.status}`">{{ statusText(o.status) }}</span>
            </div>
            <div class="order-card-meta">
              <span class="order-card-price"><i class="bi bi-coin" /> {{ o.price }}</span>
              <span v-if="o.order_no" class="order-card-no">单号 {{ o.order_no }}</span>
              <span class="order-card-time">{{ formatTime(o.create_time) }}</span>
            </div>
            <!-- 发货内容（虚拟商品） -->
            <div v-if="o.deliver_content" class="order-card-deliver">
              <span class="deliver-tag">发货</span>
              <span class="deliver-text">{{ o.deliver_content }}</span>
              <button class="copy-btn" title="复制" @click="copyDeliverText(o.deliver_content)"><i class="bi bi-copy" /></button>
            </div>
            <!-- 物流（实物商品） -->
            <div v-else-if="o.logistics" class="order-card-deliver">
              <span class="deliver-tag">物流</span>
              <span class="deliver-text">{{ o.logistics }}</span>
            </div>
            <!-- 收货地址（实物商品） -->
            <div v-if="o.result?.address" class="order-card-address">
              <i class="bi bi-geo-alt" />
              <span>{{ o.result.address.name }} · {{ o.result.address.phone }}</span>
              <span class="address-detail">{{ o.result.address.address }}</span>
            </div>
            <!-- 已取消：展示退款金额 -->
            <div v-if="o.status === 3" class="order-card-refund">
              <i class="bi bi-arrow-counterclockwise" />
              <span>订单已取消，已退还 {{ o.refund || o.price }} 积分</span>
            </div>
            <!-- 订单操作 -->
            <div v-if="o.status === 0 || o.status === 1" class="order-card-actions">
              <button
                v-if="o.status === 0"
                type="button"
                class="btn btn-sm btn-ghost"
                :disabled="cancelingId === o.id"
                @click="askCancel(o)"
              >
                <i class="bi bi-x-circle" /> {{ cancelingId === o.id ? '取消中...' : '取消订单' }}
              </button>
              <button
                v-if="o.status === 1"
                type="button"
                class="btn btn-sm btn-primary"
                :disabled="receivingId === o.id"
                @click="doReceive(o)"
              >
                <i class="bi bi-check2-circle" /> {{ receivingId === o.id ? '处理中...' : '确认收货' }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </template>

    <!-- 兑换确认弹窗（虚拟商品） -->
    <Teleport to="body">
      <Transition name="modal-fade">
        <div v-if="showConfirm" class="modal-overlay" @click.self="showConfirm = false">
          <div class="modal-card">
            <div class="modal-header">
              <span class="modal-title">确认兑换</span>
              <button class="btn btn-icon btn-sm btn-round" @click="showConfirm = false"><i class="bi bi-x-lg" /></button>
            </div>
            <div class="modal-body">
              <div class="confirm-goods">
                <img :src="confirmGoods?.cover || defaultCover" class="confirm-cover" :alt="confirmGoods?.title" @error="onCoverError" />
                <div class="confirm-info">
                  <div class="confirm-title">{{ confirmGoods?.title }}</div>
                  <div class="confirm-price"><i class="bi bi-coin" /> {{ confirmGoods?.price }} 积分</div>
                </div>
              </div>
              <div class="confirm-tip">
                兑换后立即发货，确定使用 <strong>{{ confirmGoods?.price }}</strong> 积分兑换吗？
              </div>
            </div>
            <div class="modal-footer">
              <button class="btn btn-ghost" @click="showConfirm = false">取消</button>
              <button class="btn btn-primary" @click="confirmBuy">确认兑换</button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- 收货地址弹窗（实物商品） -->
    <Teleport to="body">
      <Transition name="modal-fade">
        <div v-if="showAddress" class="modal-overlay" @click.self="showAddress = false">
          <div class="modal-card">
            <div class="modal-header">
              <span class="modal-title">填写收货地址</span>
              <button class="btn btn-icon btn-sm btn-round" @click="showAddress = false"><i class="bi bi-x-lg" /></button>
            </div>
            <div class="modal-body">
              <div class="field">
                <label>收货人</label>
                <input v-model="addressForm.name" class="input" placeholder="请输入收货人姓名" />
              </div>
              <div class="field">
                <label>联系电话</label>
                <input v-model="addressForm.phone" class="input" placeholder="请输入联系电话" />
              </div>
              <div class="field">
                <label>收货地址</label>
                <textarea v-model="addressForm.address" class="input" rows="3" placeholder="请输入详细收货地址"></textarea>
              </div>
            </div>
            <div class="modal-footer">
              <button class="btn btn-ghost" @click="showAddress = false">取消</button>
              <button class="btn btn-primary" :disabled="addressSubmitting" @click="submitAddress">确认兑换</button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- 发货内容弹窗（虚拟商品） -->
    <Teleport to="body">
      <Transition name="modal-fade">
        <div v-if="showDeliver" class="modal-overlay" @click.self="showDeliver = false">
          <div class="modal-card">
            <div class="modal-header">
              <span class="modal-title">兑换成功</span>
              <button class="btn btn-icon btn-sm btn-round" @click="showDeliver = false"><i class="bi bi-x-lg" /></button>
            </div>
            <div class="modal-body">
              <div class="deliver-label">{{ deliverGoods?.title }}</div>
              <div class="deliver-content">{{ deliverContent }}</div>
              <button class="btn btn-sm btn-ghost btn-block" @click="copyDeliver">复制内容</button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- 取消订单确认弹窗 -->
    <ConfirmDialog
      v-model:visible="showCancelConfirm"
      title="取消订单"
      message="确定取消该订单吗？取消后积分将原路退还，商品库存会恢复。"
      confirm-text="取消订单"
      cancel-text="再想想"
      loading-text="取消中..."
      danger
      :loading="cancelingId !== null"
      @confirm="doCancel"
    />
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useUserStore } from '@/stores/user'
import {
  getGoods,
  buyGoods,
  getOrders,
  getIntegral,
  getGoodsCategories,
  getMyGoodsStats,
  cancelOrder,
  receiveOrder
} from '@/api/goods'
import { toast } from '@/utils/toast'
import SectionTitle from '@/components/SectionTitle.vue'
import EmptyState from '@/components/EmptyState.vue'
import ConfirmDialog from '@/components/ConfirmDialog.vue'

const userStore = useUserStore()

const goodsList = ref([])
const orders = ref([])
const balance = ref(0)
const loading = ref(false)
const ordersLoading = ref(false)
const buyingId = ref(null)

// 分类
const categories = ref([])
const activeCategory = ref('')

// 我的兑换统计
const myStats = ref({ pending: 0, shipped: 0, completed: 0, canceled: 0, integral_spent: 0 })

// 订单操作
const showCancelConfirm = ref(false)
const cancelTarget = ref(null)
const cancelingId = ref(null)
const receivingId = ref(null)
const showAddress = ref(false)
const addressForm = ref({ name: '', phone: '', address: '', goods: null })
const addressSubmitting = ref(false)
const showConfirm = ref(false)
const confirmGoods = ref(null)
const showDeliver = ref(false)
const deliverContent = ref('')
const deliverGoods = ref(null)

const defaultCover = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120"><rect width="120" height="120" fill="%23e8e6dd"/><text x="50%25" y="55%25" text-anchor="middle" font-size="28" fill="%238a8a82" font-family="serif">兑</text></svg>'

function onCoverError(e) {
  e.target.src = defaultCover
}

function statusText(s) {
  const map = { 0: '待发货', 1: '已发货', 2: '已完成', 3: '已取消' }
  return map[s] ?? '未知'
}

function formatTime(t) {
  if (!t) return '-'
  const d = new Date(Number(t) * 1000)
  if (isNaN(d)) return '-'
  const p = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`
}

async function loadGoods() {
  loading.value = true
  try {
    const params = {}
    if (activeCategory.value) params.category = activeCategory.value
    const res = await getGoods(params)
    goodsList.value = res.data?.data || []
  } catch {
    goodsList.value = []
  } finally {
    loading.value = false
  }
}

async function loadCategories() {
  try {
    const res = await getGoodsCategories()
    const data = Array.isArray(res.data) ? res.data : (res.data?.data || [])
    categories.value = data
  } catch {
    categories.value = []
  }
}

function setCategory(category) {
  if (activeCategory.value === category) return
  activeCategory.value = category || ''
  loadGoods()
}

async function loadMyStats() {
  if (!userStore.isLogged) return
  try {
    const res = await getMyGoodsStats()
    const data = res.data || {}
    myStats.value = {
      pending: Number(data.pending) || 0,
      shipped: Number(data.shipped) || 0,
      completed: Number(data.completed) || 0,
      canceled: Number(data.canceled) || 0,
      integral_spent: Number(data.integral_spent) || 0
    }
  } catch {
    // 忽略
  }
}

// 取消订单：弹窗二次确认后提交，积分原路退还
function askCancel(order) {
  cancelTarget.value = order
  showCancelConfirm.value = true
}

async function doCancel() {
  const order = cancelTarget.value
  if (!order || cancelingId.value) return
  cancelingId.value = order.id
  try {
    const res = await cancelOrder(order.id)
    toast.success(`订单已取消，退还 ${res.data?.refund ?? order.price} 积分`)
    if (res.data?.integral !== undefined) balance.value = Number(res.data.integral) || 0
    showCancelConfirm.value = false
    cancelTarget.value = null
    await Promise.all([loadOrders(), loadGoods(), loadMyStats()])
  } catch {
    // 拦截器已提示
  } finally {
    cancelingId.value = null
  }
}

async function doReceive(order) {
  if (receivingId.value) return
  receivingId.value = order.id
  try {
    await receiveOrder(order.id)
    toast.success('确认收货成功')
    await Promise.all([loadOrders(), loadMyStats()])
  } catch {
    // 拦截器已提示
  } finally {
    receivingId.value = null
  }
}

async function loadBalance() {
  if (!userStore.isLogged) return
  try {
    const res = await getIntegral()
    balance.value = Number(res.data?.integral) || 0
  } catch {
    balance.value = 0
  }
}

async function loadOrders() {
  if (!userStore.isLogged) return
  ordersLoading.value = true
  try {
    const res = await getOrders()
    orders.value = res.data?.data || []
  } catch {
    orders.value = []
  } finally {
    ordersLoading.value = false
  }
}

async function buy(g) {
  if (!userStore.isLogged) {
    toast.info('请先登录')
    return
  }
  if (buyingId.value) return

  // 实物商品：先填写收货地址
  if (g.type === 'physical') {
    addressForm.value = { name: '', phone: '', address: '', goods: g }
    showAddress.value = true
    return
  }

  // 虚拟商品：弹窗确认后立即购买
  confirmGoods.value = g
  showConfirm.value = true
}

function confirmBuy() {
  const g = confirmGoods.value
  if (!g) return
  showConfirm.value = false
  doBuy(g, '')
}

async function submitAddress() {
  const g = addressForm.value.goods
  if (!g) return
  if (!addressForm.value.name.trim()) return toast.info('请填写收货人')
  if (!addressForm.value.phone.trim()) return toast.info('请填写联系电话')
  if (!addressForm.value.address.trim()) return toast.info('请填写收货地址')

  const address = JSON.stringify({
    name: addressForm.value.name.trim(),
    phone: addressForm.value.phone.trim(),
    address: addressForm.value.address.trim()
  })

  addressSubmitting.value = true
  showAddress.value = false
  try {
    await doBuy(g, address)
  } finally {
    addressSubmitting.value = false
  }
}

async function doBuy(g, address) {
  buyingId.value = g.id
  try {
    const res = await buyGoods(g.id, address)
    if (res.code === 200) {
      toast.success(`兑换成功！剩余 ${res.data?.integral ?? 0} 积分`)
      balance.value = Number(res.data?.integral) || 0
      // 虚拟商品：弹出发货内容
      if (g.type !== 'physical' && res.data?.deliver_content) {
        deliverContent.value = res.data.deliver_content
        deliverGoods.value = g
        showDeliver.value = true
      }
      await Promise.all([loadGoods(), loadOrders(), loadMyStats()])
    } else {
      toast.error(res.msg || '兑换失败')
    }
  } catch {
    // 错误已由拦截器提示
  } finally {
    buyingId.value = null
  }
}

async function copyDeliver() {
  try {
    await navigator.clipboard.writeText(deliverContent.value || '')
    toast.success('已复制到剪贴板')
  } catch {
    toast.info('复制失败，请手动复制')
  }
}

async function copyDeliverText(text) {
  try {
    await navigator.clipboard.writeText(text || '')
    toast.success('已复制到剪贴板')
  } catch {
    toast.info('复制失败，请手动复制')
  }
}

onMounted(() => {
  loadGoods()
  loadBalance()
  loadOrders()
  loadCategories()
  loadMyStats()
})
</script>

<style scoped>
.goods-page {
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.link {
  font-size: 13px;
  text-decoration: none;
}
.link:hover {
  color: var(--primary);
}
.block-title {
  font-size: 15px;
  font-weight: 600;
  margin: 8px 0 0;
  padding-bottom: 10px;
  border-bottom: 1px solid var(--border-soft);
}

.balance-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  /* 空间不足时提示文案自动换到下一排，避免被挤压成竖排文字 */
  flex-wrap: wrap;
  gap: 12px 16px;
  background: linear-gradient(135deg, var(--gold-soft), var(--accent-wash));
  border: 1px solid var(--gold-line);
}
.balance-left {
  display: flex;
  align-items: center;
  gap: 14px;
  min-width: 0;
}
.balance-info {
  min-width: 0;
}
.balance-icon {
  flex-shrink: 0;
  font-size: 34px;
  color: #d4a148;
}
.balance-label {
  font-size: 12px;
  color: var(--text-muted);
}
.balance-value {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 0 5px;
  font-size: 24px;
  font-weight: 700;
  line-height: 1.25;
  color: var(--primary-deep);
  /* 数字等宽，余额变化时不抖动 */
  font-variant-numeric: tabular-nums;
}
.balance-num {
  overflow-wrap: anywhere;
}
.balance-unit {
  font-size: 13px;
  font-weight: 500;
  color: var(--text-muted);
}
.balance-tip {
  display: flex;
  align-items: center;
  gap: 5px;
  min-width: 0;
  font-size: 12px;
  line-height: 1.5;
  color: var(--text-muted);
}
.balance-tip .bi {
  flex-shrink: 0;
}
/* 我的兑换统计：整行占满，与余额区隔开 */
.balance-stats {
  flex-basis: 100%;
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
  margin-top: 4px;
  padding-top: 12px;
  border-top: 1px dashed var(--gold-line);
}
.stat-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
}
.stat-num {
  font-size: 17px;
  font-weight: 700;
  color: #d4a148;
  font-variant-numeric: tabular-nums;
}
.stat-label {
  font-size: 12px;
  color: var(--text-muted);
}

/* 商品分类 */
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
.chip-count {
  font-size: 11px;
  font-style: normal;
  color: var(--text-muted);
}
.chip.active .chip-count {
  color: var(--primary-deep);
}

.loading {
  padding: 48px;
  text-align: center;
  color: var(--text-muted);
}

.goods-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 16px;
}
.goods-card {
  overflow: hidden;
  padding: 0;
  display: flex;
  flex-direction: column;
}
.goods-cover-wrap {
  width: 100%;
  aspect-ratio: 4 / 3;
  overflow: hidden;
  background: var(--bg-muted);
}
.goods-cover {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}
.goods-body {
  padding: 14px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  flex: 1;
}
.goods-title {
  font-size: 15px;
  font-weight: 600;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.goods-desc {
  font-size: 12px;
  color: var(--text-muted);
  line-height: 1.5;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  min-height: 36px;
}
.goods-foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.goods-price {
  font-size: 16px;
  font-weight: 700;
  color: #d4a148;
}
.goods-price .bi {
  font-size: 13px;
}
.goods-stock {
  font-size: 12px;
  color: var(--text-muted);
}
.goods-stock.empty {
  color: var(--danger);
}
/* 商品标签：限购 / 经验门槛 / 已兑换 */
.goods-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
.goods-tag {
  padding: 1px 8px;
  font-size: 11px;
  border-radius: 999px;
  background: var(--bg-muted);
  color: var(--text-muted);
  white-space: nowrap;
}

.status-tag {
  display: inline-block;
  padding: 2px 10px;
  font-size: 12px;
  border-radius: 999px;
  background: var(--bg-muted);
  color: var(--text-soft);
}
.status-tag.status-1 {
  background: rgba(74, 144, 226, 0.12);
  color: #4a90e2;
}
.status-tag.status-2 {
  background: rgba(108, 154, 77, 0.12);
  color: var(--success);
}
.status-tag.status-3 {
  background: var(--bg-muted);
  color: var(--text-light);
}

/* 商品类型标签 */
.type-tag {
  display: inline-block;
  margin-left: 6px;
  padding: 1px 8px;
  font-size: 11px;
  border-radius: 999px;
  vertical-align: middle;
  font-weight: 500;
}
.type-tag.virtual {
  background: rgba(108, 154, 77, 0.14);
  color: var(--success);
}
.type-tag.physical {
  background: var(--gold-soft);
  color: #c7902f;
}

/* 兑换记录卡片 */
.order-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.order-card {
  display: flex;
  gap: 14px;
  padding: 14px;
}
.order-card-cover {
  width: 56px;
  height: 56px;
  border-radius: 8px;
  object-fit: cover;
  flex-shrink: 0;
}
.order-card-body {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.order-card-head {
  display: flex;
  align-items: center;
  gap: 8px;
}
.order-card-title {
  flex: 1;
  min-width: 0;
  font-size: 14px;
  font-weight: 600;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.order-card-meta {
  display: flex;
  align-items: center;
  gap: 14px;
  font-size: 12px;
  color: var(--text-muted);
}
.order-card-price {
  color: #d4a148;
  font-weight: 600;
}
.order-card-price .bi {
  font-size: 12px;
}
.order-card-no {
  color: var(--text-light);
  font-variant-numeric: tabular-nums;
}
.order-card-refund {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 10px;
  border-radius: 6px;
  background: var(--bg-muted);
  font-size: 12px;
  color: var(--text-muted);
}
.order-card-refund .bi {
  color: var(--success);
}
.order-card-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  padding-top: 2px;
}
.order-card-deliver {
  display: flex;
  align-items: flex-start;
  gap: 6px;
  padding: 8px 10px;
  background: var(--bg-muted);
  border-radius: 6px;
  font-size: 12px;
}
.deliver-tag {
  flex-shrink: 0;
  padding: 0 6px;
  font-size: 11px;
  border-radius: 4px;
  background: var(--gold-soft);
  color: #c7902f;
  font-weight: 600;
  line-height: 18px;
}
.deliver-text {
  flex: 1;
  min-width: 0;
  color: var(--text-soft);
  word-break: break-all;
  line-height: 1.5;
}
.copy-btn {
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border: none;
  border-radius: 5px;
  background: transparent;
  color: var(--text-muted);
  cursor: pointer;
  transition: all 0.15s;
}
.copy-btn:hover {
  background: var(--bg-card);
  color: var(--primary);
}
.order-card-address {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: var(--text-muted);
  flex-wrap: wrap;
}
.order-card-address .bi {
  color: var(--primary);
}
.address-detail {
  color: var(--text-soft);
}
.text-muted {
  color: var(--text-muted);
}

/* 弹窗 */
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
.field {
  margin-bottom: 14px;
}
.field label {
  display: block;
  margin-bottom: 6px;
  font-size: 13px;
  color: var(--text-soft);
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
.deliver-label {
  font-size: 14px;
  font-weight: 600;
  margin-bottom: 10px;
}
.deliver-content {
  padding: 14px;
  background: var(--bg-muted);
  border: 1px dashed var(--border);
  border-radius: var(--radius);
  font-size: 14px;
  line-height: 1.6;
  word-break: break-all;
  white-space: pre-wrap;
  margin-bottom: 14px;
}

.confirm-goods {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 14px;
}
.confirm-cover {
  width: 52px;
  height: 52px;
  border-radius: 8px;
  object-fit: cover;
  flex-shrink: 0;
}
.confirm-info {
  min-width: 0;
}
.confirm-title {
  font-size: 14px;
  font-weight: 600;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.confirm-price {
  margin-top: 4px;
  font-size: 15px;
  font-weight: 700;
  color: #d4a148;
}
.confirm-tip {
  font-size: 13px;
  color: var(--text-muted);
  line-height: 1.6;
}
.confirm-tip strong {
  color: #d4a148;
  font-weight: 700;
}

.modal-fade-enter-active,
.modal-fade-leave-active {
  transition: opacity 0.2s;
}
.modal-fade-enter-active .modal-card,
.modal-fade-leave-active .modal-card {
  transition: transform 0.2s, opacity 0.2s;
}
.modal-fade-enter-from,
.modal-fade-leave-to {
  opacity: 0;
}
.modal-fade-enter-from .modal-card,
.modal-fade-leave-to .modal-card {
  transform: scale(0.95) translateY(-8px);
  opacity: 0;
}

/* 手机端：余额与提示上下排列，提示文案独立一行，不再与余额争抢横向空间 */
@media (max-width: 640px) {
  .balance-card.card-pad {
    flex-direction: column;
    align-items: stretch;
    gap: 12px;
    padding: 16px;
  }
  .balance-left {
    gap: 12px;
  }
  .balance-icon {
    font-size: 30px;
  }
  .balance-value {
    font-size: 22px;
  }
  .balance-tip {
    align-items: flex-start;
    padding-top: 11px;
    border-top: 1px dashed var(--gold-line);
    line-height: 1.6;
  }
  .balance-tip .bi {
    margin-top: 3px;
  }
  /* 未登录态：登录按钮占满整行，点击区域更大 */
  .balance-card > .btn {
    width: 100%;
  }
}
</style>
