import { call } from './request'

/**
 * 第三方登录（QQ / GitHub / Gitee）接口封装
 *
 * 后端见 app/api/controller/OAuth.go，行为（同一个入口按条件自动分流）：
 *   - 已绑定 + 未登录 → 发 token 登录
 *   - 未绑定 + 未登录 → 自动注册新账号并登录（后台关闭自动注册时返回 need_bind + ticket）
 *   - 未绑定 + 已登录 → 绑定到当前账号
 */

// 第三方登录配置（公开）：前端据此拼授权地址
// cache=false：避免命中接口结果缓存，后台改完配置前端立刻拿到新值
export const getOauthConfig = (config) =>
  call('oauth', 'config', { method: 'GET', params: { cache: false }, config: { silent: true, ...config } })

// 用授权码登录 / 注册 / 绑定（服务端按是否已登录自动分流）
export const oauthSignIn = (platform, code, state = '') =>
  call('oauth', platform, { method: 'POST', data: { code, state }, config: { dedupe: false } })

/**
 * 绑定第三方账号（需登录）
 * - { key }：先登录再绑定（ticket 来自未登录时的第三方登录响应）
 * - { platform, code }：已登录状态下重新发起授权
 */
export const oauthBind = (data) =>
  call('oauth', 'bind', { method: 'POST', data, config: { dedupe: false } })

// 解绑第三方账号（需登录）
export const oauthUnbind = (platform) =>
  call('oauth', 'unbind', { method: 'POST', data: { platform } })

// 我绑定的第三方账号 + 还能绑哪些（需登录）
export const getMyOauth = (config) =>
  call('oauth', 'mine', { method: 'GET', config: { silent: true, ...config } })
