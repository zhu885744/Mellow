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

// 等级体系列表
export const getLevels = (params = {}) =>
  call('level', 'all', { method: 'GET', params: { page: 1, limit: 100, order: 'exp asc', ...params } })
