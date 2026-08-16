import { call } from './request'

// 登录
export const login = (account, password) =>
  call('comm', 'login', {
    method: 'POST',
    data: { account, password, source: 'default' }
  })

// 注册（发送验证码）
export const registerSendCode = (social) =>
  call('comm', 'register', {
    method: 'POST',
    data: { social }
  })

// 注册（提交）
export const register = (social, code, password, account = '', nickname = '') =>
  call('comm', 'register', {
    method: 'POST',
    data: { social, code, password, account, nickname }
  })

// 重置密码 - 发送验证码
export const resetPasswordSendCode = (social) =>
  call('comm', 'reset-password', {
    method: 'POST',
    data: { social }
  })

// 重置密码 - 提交
export const resetPassword = (social, code, password) =>
  call('comm', 'reset-password', {
    method: 'POST',
    data: { social, code, password }
  })

// 校验 Token
export const checkToken = (renew = false) =>
  call('comm', 'check-token', { method: 'POST', params: { renew } })

// 退出登录
export const logout = () =>
  call('comm', 'logout', { method: 'DELETE' })