import { call } from './request'

// 获取动态列表（默认审核通过 + 已发布）
export const listMoments = (params = {}) =>
  call('moments', 'all', {
    method: 'GET',
    params: {
      where: { audit: 1, status: 1 },
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

// 创建动态（用 create）
export const createMoment = (data) =>
  call('moments', 'create', { method: 'POST', data })

// 上传动态图片（attachment/batch，multipart/form-data）
export const uploadMomentImages = (formData) =>
  call('attachment', 'batch', {
    method: 'POST',
    data: formData,
    headers: { 'Content-Type': 'multipart/form-data' }
  })

// 删除动态
export const removeMoment = (ids) =>
  call('moments', 'remove', { method: 'DELETE', params: { ids } })