import { call } from './request'

export const getUser = (id, field = '') =>
  call('users', 'one', { method: 'GET', params: { id, field } })

export const updateUser = (data) =>
  call('users', 'update', { method: 'PUT', data })

export const uploadAvatar = (formData) =>
  call('attachment', 'batch', {
    method: 'POST',
    data: formData,
    headers: { 'Content-Type': 'multipart/form-data' }
  })

// 修改邮箱（发验证码 / 提交验证码）
export const updateEmail = (data) =>
  call('users', 'email', { method: 'PUT', data })

// 修改手机号（发验证码 / 提交验证码）
export const updatePhone = (data) =>
  call('users', 'phone', { method: 'PUT', data })

// 注销账户（发验证码）
export const destroySendCode = () =>
  call('users', 'destroy', { method: 'DELETE' })

// 注销账户（提交）
export const destroy = (code, password) =>
  call('users', 'destroy', { method: 'DELETE', params: { code, password } })

// ===== 签到 =====
export const checkIn = () =>
  call('exp', 'check-in', { method: 'POST' })

export const checkInStatus = () =>
  call('exp', 'check-in-status', { method: 'GET' })

export const checkInRank = (params = {}) =>
  call('exp', 'check-in-rank', { method: 'GET', params })

export const expActive = (params = {}) =>
  call('exp', 'active', { method: 'GET', params })
