import { call } from './request'

// 获取单个配置项（按 key）
export const getConfig = (key) =>
  call('config', 'one', { method: 'GET', params: { key } })

// 获取站点功能配置（inis_functions）
export const getSiteFunctions = () =>
  call('config', 'one', { method: 'GET', params: { key: 'inis_functions' } })

// 保存配置
export const saveConfig = (key, json, value = '') =>
  call('config', 'save', { method: 'POST', data: { key, json, value } })
