import { call } from './request'

// 获取文章列表
export const listArticles = (params) =>
  call('article', 'all', { method: 'GET', params })

// 获取单篇文章
export const getArticle = (id) =>
  call('article', 'one', { method: 'GET', params: { id } })

// 文章分组树
export const getArticleGroupTree = () =>
  call('article-group', 'tree', { method: 'GET' })

// 创建文章
export const createArticle = (data) =>
  call('article', 'save', { method: 'POST', data })

// 更新文章
export const updateArticle = (data) =>
  call('article', 'update', { method: 'PUT', data })

// 删除文章
export const removeArticle = (ids) =>
  call('article', 'remove', { method: 'DELETE', params: { ids } })

// 随机文章
export const randArticles = (limit = 4) =>
  call('article', 'rand', { method: 'GET', params: { limit, field: 'id,title,abstract,views,create_time,group' } })