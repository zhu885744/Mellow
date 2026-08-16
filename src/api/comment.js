import { call } from './request'

// 评论树结构
export const getCommentTree = (bind_id, bind_type = 'article', params = {}) =>
  call('comment', 'flat', {
    method: 'GET',
    params: { bind_id, bind_type, ...params }
  })

// 创建评论（用 create 而非 save）
export const createComment = (data) =>
  call('comment', 'create', { method: 'POST', data })

// 删除评论
export const removeComment = (ids) =>
  call('comment', 'remove', { method: 'DELETE', params: { ids } })
