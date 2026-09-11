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
