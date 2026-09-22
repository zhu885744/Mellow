import { call } from './request'

// ids 归一化：DELETE 走 query 传参，数组会被序列化成 ids[]= 导致后端取不到，统一转逗号分隔字符串
const toIdsString = (ids) =>
  (Array.isArray(ids) ? ids : [ids])
    .map((i) => Number(i))
    .filter((i) => i > 0)
    .join(',')

// PUT/POST 走 JSON body，直接传数组即可（utils.Unity.Ids 会解析）
const toIdsArray = (ids) =>
  (Array.isArray(ids) ? ids : [ids])
    .map((i) => Number(i))
    .filter((i) => i > 0)

// 评论树结构
export const getCommentTree = (bind_id, bind_type = 'article', params = {}) =>
  call('comment', 'flat', {
    method: 'GET',
    params: { bind_id, bind_type, ...params }
  })

// 创建评论（用 create 而非 save）
export const createComment = (data) =>
  call('comment', 'create', { method: 'POST', data })

// 删除评论（软删除，移入回收站）
export const removeComment = (ids) =>
  call('comment', 'remove', { method: 'DELETE', params: { ids: toIdsString(ids) } })

// 上传评论图片（attachment/batch，multipart/form-data）
// 返回 res.data.results：数组项含 status 与 full_url
// 注意：不要手动设置 Content-Type，request 拦截器会移除它，
// 由浏览器自动生成带 boundary 的 multipart/form-data
export const uploadCommentImages = (formData) =>
  call('attachment', 'batch', { method: 'POST', data: formData })

// ===== 后台（管理员）=====

// 评论列表（管理员视角：IP 不脱敏；field/where/order/like 由 utils/comment.js 统一拼装）
export const listComments = (params = {}) =>
  call('comment', 'all', {
    method: 'GET',
    params: { page: 1, limit: 15, order: 'create_time desc', ...params }
  })

// 评论数量统计（后端 comment/count 支持 onlyTrashed）
export const countComments = (params = {}) =>
  call('comment', 'count', { method: 'GET', params })

// 更新评论：管理员可改任意评论的 content / images，普通用户仅限自己的
export const updateComment = (data) =>
  call('comment', 'update', { method: 'PUT', data })

// 软删除（移入回收站），批量
export const removeComments = (ids) =>
  call('comment', 'remove', { method: 'DELETE', params: { ids: toIdsString(ids) } })

// 彻底删除（不可恢复）
export const forceDeleteComments = (ids) =>
  call('comment', 'delete', { method: 'DELETE', params: { ids: toIdsString(ids) } })

// 从回收站恢复
export const restoreComments = (ids) =>
  call('comment', 'restore', { method: 'PUT', data: { ids: toIdsArray(ids) } })

// 清空回收站
export const clearCommentRecycle = () =>
  call('comment', 'clear', { method: 'DELETE' })
