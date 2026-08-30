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

// 上传评论图片（attachment/batch，multipart/form-data）
// 返回 res.data.results：数组项含 status 与 full_url
// 注意：不要手动设置 Content-Type，request 拦截器会移除它，
// 由浏览器自动生成带 boundary 的 multipart/form-data
export const uploadCommentImages = (formData) =>
  call('attachment', 'batch', { method: 'POST', data: formData })
