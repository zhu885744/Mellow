import { call } from './request'

// 友链分组
export const listLinkGroups = (params = {}) =>
  call('links-group', 'all', { method: 'GET', params })

// 友链列表
export const listLinks = (params = {}) =>
  call('links', 'all', { method: 'GET', params })

// 申请友链
export const createLink = (data) =>
  call('links', 'create', { method: 'POST', data })

// 删除友链
export const removeLink = (ids) =>
  call('links', 'remove', { method: 'DELETE', params: { ids } })