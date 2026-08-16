import { call } from './request'

// 获取动态列表（默认审核通过 + 已发布）
export const listMoments = (params = {}) =>
  call('moments', 'all', {
    method: 'GET',
    params: {
      where: JSON.stringify({ audit: 1, status: 1 }),
      order: 'top desc, create_time desc',
      ...params
    }
  })

// 获取单条动态
export const getMoment = (id) =>
  call('moments', 'one', { method: 'GET', params: { id } })

// 获取动态评论
export const getMomentComments = (bind_id, params = {}) =>
  call('moments', 'comment', {
    method: 'GET',
    params: { bind_id, ...params }
  })

// 创建动态
export const createMoment = (data) =>
  call('moments', 'save', { method: 'POST', data })

// 删除动态
export const removeMoment = (ids) =>
  call('moments', 'remove', { method: 'DELETE', params: { ids } })