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

// 我的附件库（当前用户上传的附件，分页）
// 文档：docs/API docs/attachment.md · GET /api/attachment/list
export const listMyAttachments = (params = {}) =>
  call('attachment', 'list', {
    method: 'GET',
    params: {
      page: 1,
      limit: 24,
      field: 'id,uuid,original_name,full_url,file_size,mime_type,file_ext,create_time',
      ...params
    }
  })

// 批量上传（单文件/多文件通用），multipart/form-data
// 注意：不要手动设置 Content-Type，request 拦截器会移除它，由浏览器自动补 boundary
export const uploadAttachments = (formData) =>
  call('attachment', 'batch', { method: 'POST', data: formData })

// ===== 后台（管理员）=====

/**
 * 附件列表（管理员）
 * 非管理员只能查到 uploader_id 为自己的附件，后台依赖管理员身份才能管理全站附件。
 * 支持 where / like（「字段名|值」）/ order / onlyTrashed。
 */
export const listAttachmentsAdmin = (params = {}) =>
  call('attachment', 'all', {
    method: 'GET',
    params: { page: 1, limit: 24, order: 'create_time desc', ...params }
  })

/**
 * 附件数量（count 支持 onlyTrashed，回收站数量可直接用该接口）
 */
export const countAttachments = (params = {}) =>
  call('attachment', 'count', { method: 'GET', params })

// 附件体积合计（返回 { file_size: 合计字节数 }）
export const sumAttachmentSize = (params = {}) =>
  call('attachment', 'sum', { method: 'GET', params: { field: 'file_size', ...params } })

// 更新附件：允许字段仅 original_name / target_type / target_id
export const updateAttachment = (data) =>
  call('attachment', 'update', { method: 'PUT', data })

// 软删除（移入回收站，不删除存储文件）
export const removeAttachments = (ids) =>
  call('attachment', 'remove', { method: 'DELETE', params: { ids: toIdsString(ids) } })

// 彻底删除（仅管理员：连同存储文件一起删除，不可恢复）
export const forceDeleteAttachments = (ids) =>
  call('attachment', 'delete', { method: 'DELETE', params: { ids: toIdsString(ids) } })

// 从回收站恢复
export const restoreAttachments = (ids) =>
  call('attachment', 'restore', { method: 'PUT', data: { ids: toIdsArray(ids) } })

// 清空回收站（仅管理员：连同存储文件一起删除）
export const clearAttachmentRecycle = () =>
  call('attachment', 'clear', { method: 'DELETE' })
