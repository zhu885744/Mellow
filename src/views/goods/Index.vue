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
        <i class="bi bi-coin balance-icon" />
        <div>
          <div class="balance-label">我的积分余额</div>
          <div class="balance-value">{{ balance }} <span class="balance-unit">积分</span></div>
        </div>
      </div>
      <div class="balance-tip">
        <i class="bi bi-lightbulb" /> 通过签到、发布内容等任务赚取积分
      </div>
    </div>
    <div v-else class="card card-pad balance-card">
      <div class="balance-left">
        <i class="bi bi-coin balance-icon" />
        <div>
          <div class="balance-label">登录后查看积分</div>
        </div>
      </div>
      <router-link to="/auth/login" class="btn btn-sm btn-primary">立即登录</router-link>
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
          <div class="goods-foot">
            <span class="goods-price"><i class="bi bi-coin" /> {{ g.price }}</span>
            <span class="goods-stock" :class="{ empty: Number(g.stock) <= 0 }">
              {{ Number(g.stock) > 0 ? `库存 ${g.stock}` : '已售罄' }}
            </span>
          </div>
          <button
            class="btn btn-primary btn-block"
            :disabled="Number(g.stock) <= 0 || buyingId === g.id"
            @click="buy(g)"
          >
            <span v-if="buyingId === g.id" class="spinner"></span>
            <span v-else>兑换</span>
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
              <span class="order-card-title">{{ o.result?.goods?.title || `商品 #${o.goods_id}` }}</span>
              <span class="status-tag" :class="`status-${o.status}`">{{ statusText(o.status) }}</span>
            </div>
            <div class="order-card-meta">
              <span class="order-card-price"><i class="bi bi-coin" /> {{ o.price }}</span>
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
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useUserStore } from '@/stores/user'
import { getGoods, buyGoods, getOrders, getIntegral } from '@/api/goods'
import { toast } from '@/utils/toast'
import SectionTitle from '@/components/SectionTitle.vue'
import EmptyState from '@/components/EmptyState.vue'

const userStore = useUserStore()

const goodsList = ref([])
const orders = ref([])
const balance = ref(0)
const loading = ref(false)
const ordersLoading = ref(false)
const buyingId = ref(null)
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
  const map = { 0: '待发货', 1: '已发货', 2: '已完成' }
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
    const res = await getGoods()
    goodsList.value = res.data?.data || []
  } catch {
    goodsList.value = []
  } finally {
    loading.value = false
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
      await Promise.all([loadGoods(), loadOrders()])
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
  gap: 16px;
  background: linear-gradient(135deg, rgba(212, 161, 72, 0.14), rgba(184, 153, 104, 0.06));
  border: 1px solid rgba(212, 161, 72, 0.28);
}
.balance-left {
  display: flex;
  align-items: center;
  gap: 14px;
}
.balance-icon {
  font-size: 34px;
  color: #d4a148;
}
.balance-label {
  font-size: 12px;
  color: var(--text-muted);
}
.balance-value {
  font-size: 24px;
  font-weight: 700;
  color: var(--primary-deep);
}
.balance-unit {
  font-size: 13px;
  font-weight: 500;
  color: var(--text-muted);
}
.balance-tip {
  font-size: 12px;
  color: var(--text-muted);
  display: flex;
  align-items: center;
  gap: 4px;
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
  background: rgba(212, 161, 72, 0.14);
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
  background: rgba(212, 161, 72, 0.14);
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
  border-radius: var(--radius-lg);
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
</style>
