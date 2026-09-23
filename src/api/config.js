import { call } from './request'

// 获取单个配置项（按 key）
// config 透传给 axios（如 { silent: true } 表示失败时不弹全局提示）
export const getConfig = (key, config) =>
  call('config', 'one', { method: 'GET', params: { key }, config })

// 获取站点功能配置（Mellow_functions）
export const getSiteFunctions = (config) =>
  call('config', 'one', { method: 'GET', params: { key: 'Mellow_functions' }, config })

// 保存配置
export const saveConfig = (key, json, value = '') =>
  call('config', 'save', { method: 'POST', data: { key, json, value } })

/**
 * 保存系统配置项（自定义字段版）
 *
 * config 表结构是 key / value / json / text，不同配置项用的字段不同：
 * - SYSTEM_API_KEY、ALLOW_REGISTER 只用 value（"0"/"1"）
 *   ALLOW_REGISTER 额外用 text 存「新用户默认权限组」ID 列表（如 "1,2"）
 * - SYSTEM_QPS、SYSTEM_QPS_BLOCK、SYSTEM_QPS_NOTIFY 用 value + json
 * - SYSTEM_PAGE_LIMIT 用 value + text（最大条数）
 * 这里只提交调用方显式传入的字段，避免把不需要的字段写成空值。
 *
 * @param {{key: string, value?: string, json?: any, text?: string}} data
 */
export const saveSystemConfig = (data) =>
  call('config', 'save', { method: 'POST', data })
