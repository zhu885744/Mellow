import { call } from './request'

export const getUser = (id, field = '') =>
  call('users', 'one', { method: 'GET', params: { id, field } })

export const updateUser = (data) =>
  call('users', 'update', { method: 'PUT', data })

export const uploadAvatar = (formData) =>
  call('attachment', 'batch', { method: 'POST', data: formData })

// 修改邮箱（发验证码 / 提交验证码）
export const updateEmail = (data) =>
  call('users', 'email', { method: 'PUT', data })

// 修改手机号（发验证码 / 提交验证码）
export const updatePhone = (data) =>
  call('users', 'phone', { method: 'PUT', data })

// 注销账户（发验证码）
export const destroySendCode = () =>
  call('users', 'destroy', { method: 'DELETE' })

// 注销账户（提交验证码 + 密码二次验证）
// code/password 为必填，source 为可选注销原因（默认 default）
export const destroy = (code, password, source = 'default') =>
  call('users', 'destroy', { method: 'DELETE', params: { code, password, source } })

// ===== 小黑屋（封禁公示） =====
// 后端已对封禁用户昵称脱敏；默认只查生效中的封禁（status=0）
export const getBlackroom = (params = {}) =>
  call('users', 'blackroom', {
    method: 'GET',
    params: { page: 1, limit: 20, order: 'create_time desc', ...params }
  })

// 提交封禁申诉（需登录，record_id 为当前生效的封禁记录 ID）
export const submitAppeal = (recordId, content) =>
  call('users', 'appeal', { method: 'POST', data: { record_id: recordId, content } })

// ===== 签到 =====
export const checkIn = () =>
  call('exp', 'check-in', { method: 'POST' })

export const checkInStatus = () =>
  call('exp', 'check-in-status', { method: 'GET' })

export const checkInRank = (params = {}) =>
  call('exp', 'check-in-rank', { method: 'GET', params })

export const checkInCalendar = (params = {}) =>
  call('exp', 'check-in-calendar', { method: 'GET', params })

export const expActive = (params = {}) =>
  call('exp', 'active', { method: 'GET', params })

// 经验任务规则
export const getExpRules = () =>
  call('exp', 'rules', { method: 'GET' })

// 经验明细（登录用户，where 传 { uid } 的 JSON 字符串）
export const getExpLogs = (params = {}) =>
  call('exp', 'all', { method: 'GET', params: { page: 1, limit: 20, order: 'create_time desc', ...params } })

// 等级体系列表
export const getLevels = (params = {}) =>
  call('level', 'all', { method: 'GET', params: { page: 1, limit: 100, order: 'exp asc', ...params } })

// ===== 后台（管理员）=====

// 批量按 id 拉取用户基础信息（后台列表展示作者昵称/头像）
// where 使用 $in，后端会转换为 `id` IN (...)
export const listUsersByIds = (ids = []) => {
  const list = (Array.isArray(ids) ? ids : [ids]).map((i) => Number(i)).filter((i) => i > 0)
  if (!list.length) return Promise.resolve({ code: 204, data: null })
  return call('users', 'all', {
    method: 'GET',
    params: {
      page: 1,
      limit: 100,
      field: 'id,nickname,avatar',
      where: JSON.stringify({ id: { $in: list } })
    }
  })
}

// 用户列表（管理员视角，后端不脱敏；field/where/order/like 由 utils/user.js 统一拼装）
export const listUsers = (params = {}) =>
  call('users', 'all', {
    method: 'GET',
    params: { page: 1, limit: 15, order: 'id desc', ...params }
  })

// 用户数量统计（注意：后端 users/count 不支持 onlyTrashed，回收站计数请用 listUsers 的 count）
export const countUsers = (params = {}) =>
  call('users', 'count', { method: 'GET', params })

// 新建用户（后端要求邮箱非空；password 为空时账号无法用密码登录）
export const createUser = (data) =>
  call('users', 'create', { method: 'POST', data })

// 修改用户状态（0 正常 / 1 冻结），后端禁止操作系统管理员
export const setUserStatus = (id, status) =>
  call('users', 'status', { method: 'PUT', data: { id: Number(id), status: Number(status) } })

// 封禁用户（管理员）
// duration 传字符串：'0' 表示永久封禁；不传 duration 并置 auto_gradient=true 时走后端自动梯度
export const banUser = (data) =>
  call('users', 'ban', { method: 'PUT', data })

// 解封用户（传 uid 或 record_id 其一）
export const unbanUser = (data) =>
  call('users', 'unban', { method: 'PUT', data })

/**
 * 清空用户封禁信息（管理员）
 *
 * 物理删除该用户的全部封禁记录（含回收站里的），并把 ban_count / current_ban_id /
 * last_ban_at / restrictions 一起归零；unfreeze=1 时若账号处于「冻结」状态一并恢复为正常。
 * 与 unban 的区别：unban 只撤销当前记录、保留历史；clear-ban 是把封禁痕迹彻底抹掉。
 */
export const clearUserBan = (data) =>
  call('users', 'clear-ban', { method: 'PUT', data })

// 软删除用户（移入回收站），禁止包含系统管理员与自己
export const removeUsers = (ids) =>
  call('users', 'remove', {
    method: 'DELETE',
    params: { ids: (Array.isArray(ids) ? ids : [ids]).join(',') }
  })

// 彻底删除用户（不可恢复）
export const forceDeleteUsers = (ids) =>
  call('users', 'delete', {
    method: 'DELETE',
    params: { ids: (Array.isArray(ids) ? ids : [ids]).join(',') }
  })

// 从回收站恢复用户
export const restoreUsers = (ids) =>
  call('users', 'restore', {
    method: 'PUT',
    data: { ids: Array.isArray(ids) ? ids : [ids] }
  })

// 清空用户回收站
export const clearUserRecycle = () =>
  call('users', 'clear', { method: 'DELETE' })
