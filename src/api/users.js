import { call } from './request'

export const getUser = (id) =>
  call('users', 'one', { method: 'GET', params: { id } })

export const updateUser = (data) =>
  call('users', 'update', { method: 'PUT', data })

export const uploadAvatar = (formData) =>
  call('attachment', 'batch', { method: 'POST', data: formData, headers: { 'Content-Type': 'multipart/form-data' } })

// 签到
export const checkIn = () =>
  call('exp', 'check-in', { method: 'POST' })

export const checkInStatus = () =>
  call('exp', 'check-in-status', { method: 'GET' })

// 注销账户（发验证码）
export const destroySendCode = () =>
  call('users', 'destroy', { method: 'DELETE' })

// 注销账户（提交）
export const destroy = (code, password) =>
  call('users', 'destroy', { method: 'DELETE', params: { code, password } })