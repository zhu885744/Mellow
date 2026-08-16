import { call } from './request'

// 获取文章列表
export const listArticles = (params) =>
  call('article', 'all', { method: 'GET', params })

// 获取单篇文章
export const getArticle = (id) =>
  call('article', 'one', { method: 'GET', params: { id } })

// 文章分组（扁平列表，用 pid 表达层级）
export const getArticleGroups = (params = {}) =>
  call('article-group', 'all', {
    method: 'GET',
    params: { page: 1, limit: 100, field: 'id,pid,name,description,article_count', ...params }
  })

// 统计某分组下的文章数量（后端 article-group 的 article_count 字段未维护，需自行统计）
// group 字段在文章里以 |id| 形式存储，用 like 模糊匹配
export const countArticlesByGroup = (groupId) =>
  call('article', 'count', {
    method: 'GET',
    params: { like: `group|%7C${groupId}%7C`, where: JSON.stringify({ audit: 1 }) }
  })

// 统计某作者发布的文章数量
export const countArticlesByAuthor = (uid) =>
  call('article', 'count', {
    method: 'GET',
    params: { where: JSON.stringify({ uid, audit: 1 }) }
  })

// 获取某作者发布的文章列表（分页）
export const getAuthorArticles = (uid, params = {}) =>
  call('article', 'all', {
    method: 'GET',
    params: {
      where: JSON.stringify({ uid, audit: 1 }),
      field: 'id,title,abstract,views,create_time,group,login',
      order: 'create_time desc',
      page: 1,
      limit: 10,
      ...params
    }
  })

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