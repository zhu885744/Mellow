import { call } from './request'

// ===== 商品 =====

// 商品列表（公开，默认仅上架）
export const getGoods = (params = {}) =>
  call('goods', 'all', { method: 'GET', params: { page: 1, limit: 20, order: 'create_time desc', ...params } })

// 商品详情
export const getGoodsOne = (id) =>
  call('goods', 'one', { method: 'GET', params: { id } })

// 购买商品（登录，address 为收货地址 JSON 字符串，实物商品必填）
export const buyGoods = (goodsId, address) =>
  call('goods', 'buy', { method: 'POST', data: { goods_id: goodsId, address } })

// 我的订单（登录）
export const getOrders = (params = {}) =>
  call('goods', 'orders', { method: 'GET', params: { page: 1, limit: 20, order: 'create_time desc', ...params } })

// ===== 积分 =====

// 积分余额（登录）
export const getIntegral = () =>
  call('integral', 'status', { method: 'GET' })

// 积分流水（登录）
export const getIntegralLogs = (params = {}) =>
  call('integral', 'all', { method: 'GET', params: { page: 1, limit: 20, order: 'create_time desc', ...params } })

// 积分任务规则（公开）
export const getIntegralRules = () =>
  call('integral', 'rules', { method: 'GET' })
