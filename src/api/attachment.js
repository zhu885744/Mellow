import { call } from './request'

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
