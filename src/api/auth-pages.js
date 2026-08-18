import { call } from '@/api/request'

/**
 * 获取全部后台权限页面（扁平列表）
 * 接口：GET /api/auth-pages/all
 * 返回结构：res.data = { data: [...], count, page }
 * 单页 limit 给大一点，确保一次拉全（INIS 默认单页上限通常 10/20，这里用 1000）
 */
export const getAuthPagesFlat = () =>
  call('auth-pages', 'all', {
    method: 'GET',
    params: { page: 1, limit: 1000, order: 'create_time asc' }
  })
