import { call } from './request'

// 评论列表（树）
export const getCommentTree = (bind_id, bind_type = 'article', params = {}) =>
  call('comment', 'flat', {
    method: 'GET',
    params: { bind_id, bind_type, ...params }
  })

// 创建评论
export const createComment = (data) =>
  call('comment', 'save', { method: 'POST', data })

// 删除评论
export const removeComment = (ids) =>
  call('comment', 'remove', { method: 'DELETE', params: { ids } })