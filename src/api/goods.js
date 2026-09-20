import { call } from './request'

// ===== 商品 =====

// 商品列表（公开，默认仅上架；默认按排序权重展示）
// 支持：category 分类、keyword 关键词、order 排序（sort desc, id desc / price asc / sold desc ...）
export const getGoods = (params = {}) =>
  call('goods', 'all', { method: 'GET', params: { page: 1, limit: 20, order: 'sort desc, id desc', ...params } })

// 商品详情（返回附带 can_buy / buy_reason / limit_remain / my_bought）
export const getGoodsOne = (id) =>
  call('goods', 'one', { method: 'GET', params: { id } })

// 商品分类聚合（公开）
export const getGoodsCategories = () =>
  call('goods', 'categories', { method: 'GET' })

// 购买商品（登录，address 为收货地址 JSON 字符串，实物商品必填）
export const buyGoods = (goodsId, address) =>
  call('goods', 'buy', { method: 'POST', data: { goods_id: goodsId, address } })

// 我的订单（登录，支持 status / goods_id 筛选）
export const getOrders = (params = {}) =>
  call('goods', 'orders', { method: 'GET', params: { page: 1, limit: 20, order: 'create_time desc', ...params } })

// 订单详情（登录，仅本人或管理员）
export const getOrderOne = (id) =>
  call('goods', 'order-one', { method: 'GET', params: { id } })

// 取消订单（登录，仅「待发货」可取消，积分原路退还）
export const cancelOrder = (id) =>
  call('goods', 'cancel-order', { method: 'PUT', data: { id } })

// 确认收货（登录，已发货 → 已完成）
export const receiveOrder = (id) =>
  call('goods', 'receive', { method: 'PUT', data: { id } })

// 我的兑换统计（登录）
export const getMyGoodsStats = () =>
  call('goods', 'my-stats', { method: 'GET' })

// 商城统计（管理员）
export const getGoodsStats = () =>
  call('goods', 'stats', { method: 'GET' })

// ===== 积分 =====

// 积分概览（登录）：余额 + 累计收支 + 今日收支
export const getIntegral = () =>
  call('integral', 'status', { method: 'GET' })

// 积分流水（登录）
// 支持：type 类型、direction（income/expense）、start/end 时间戳、keyword 关键词
export const getIntegralLogs = (params = {}) =>
  call('integral', 'all', { method: 'GET', params: { page: 1, limit: 20, order: 'create_time desc', ...params } })

// 积分任务规则（公开）
export const getIntegralRules = () =>
  call('integral', 'rules', { method: 'GET' })

// 今日积分任务进度（登录）
export const getIntegralTasks = () =>
  call('integral', 'tasks', { method: 'GET' })

// 积分排行榜（公开）：by = earned（累计获得，默认）/ balance（当前余额）
export const getIntegralRank = (params = {}) =>
  call('integral', 'rank', { method: 'GET', params: { by: 'earned', limit: 20, ...params } })

// 卡密兑换积分（登录）：输入卡密即可兑换，成功后积分立即到账
export const redeemIntegralCard = (card) =>
  call('integral', 'card-redeem', { method: 'POST', data: { card } })
