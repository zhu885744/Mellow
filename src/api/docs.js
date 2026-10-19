import { call } from './request'

// ===== 文档项目（docs-project）=====
// 一个项目 = 一套独立文档站，前台通过 /docs/:slug 访问，slug 同时也是 docs.version

// 前台项目列表（只返回启用中且当前访客可见的项目，带文档数）
export const listDocsProjects = (params = {}) =>
  call('docs-project', 'list', { method: 'GET', params: { limit: 100, ...params } })

// 后台项目列表（含草稿 / 禁用）
export const listAllDocsProjects = (params = {}) =>
  call('docs-project', 'all', {
    method: 'GET',
    params: { page: 1, limit: 100, order: 'sort asc, id asc', ...params }
  })

export const getDocsProject = (params = {}) =>
  call('docs-project', 'one', { method: 'GET', params })

export const saveDocsProject = (data) =>
  call('docs-project', 'save', { method: 'POST', data })

export const removeDocsProjects = (ids) =>
  call('docs-project', 'remove', {
    method: 'DELETE',
    params: { ids: (Array.isArray(ids) ? ids : [ids]).join(',') }
  })

// ===== 文档目录（docs-group）=====

export const docsGroupTree = (params = {}) =>
  call('docs-group', 'tree', {
    method: 'GET',
    params: { version: 'latest', with_docs: 1, admin: 1, ...params }
  })

export const docsGroupVersions = () =>
  call('docs-group', 'versions', { method: 'GET' })

export const saveDocsGroup = (data) =>
  call('docs-group', 'save', { method: 'POST', data })

export const removeDocsGroup = (ids) =>
  call('docs-group', 'remove', {
    method: 'DELETE',
    params: { ids: (Array.isArray(ids) ? ids : [ids]).join(',') }
  })

export const sortDocsGroup = (items) =>
  call('docs-group', 'sort', { method: 'POST', data: { items } })

export const moveDocsGroup = (data) =>
  call('docs-group', 'move', { method: 'POST', data })

export const copyDocsVersion = (data) =>
  call('docs-group', 'copy-version', { method: 'POST', data })

// ===== 文档页面（docs）=====

export const listDocs = (params = {}) =>
  call('docs', 'all', {
    method: 'GET',
    params: { version: 'latest', page: 1, limit: 100, admin: 1, order: 'sort asc, id asc', ...params }
  })

export const getDocs = (params = {}) =>
  call('docs', 'one', { method: 'GET', params })

export const saveDocs = (data) =>
  call('docs', 'save', { method: 'POST', data })

export const removeDocs = (ids) =>
  call('docs', 'remove', {
    method: 'DELETE',
    params: { ids: (Array.isArray(ids) ? ids : [ids]).join(',') }
  })

export const sortDocs = (items) =>
  call('docs', 'sort', { method: 'POST', data: { items } })

export const moveDocs = (data) =>
  call('docs', 'move', { method: 'POST', data })

export const docsHistory = (docs_id, params = {}) =>
  call('docs', 'history', {
    method: 'GET',
    params: { docs_id, page: 1, limit: 20, ...params }
  })

export const rollbackDocs = (history_id) =>
  call('docs', 'rollback', { method: 'POST', data: { history_id } })

// 导入 Markdown（FormData：file / version / gid / overwrite）
// 不要手动设置 Content-Type，request 拦截器会移除，由浏览器补 boundary
export const importDocs = (formData) =>
  call('docs', 'import', { method: 'POST', data: formData })
