import { call } from './request'

/**
 * toml 配置读写（后端 app/api/controller/toml.go，路由前缀 /api/toml/:method）
 *
 * 约定：
 * 1. 读取：GET /api/toml/{name}，可选 ?name=xxx 只取某个分组；
 *    **storage 不带 name 时后端不脱敏**，因此存储相关一律按分组读取（见 getStorageGroup）。
 * 2. 保存：PUT /api/toml/{method}，各分项方法只更新自己那段，未提交的分组保持原值。
 * 3. 测试：POST /api/toml/test-xxx，用于连通性验证（Redis / 腾讯云 COS / 短信）。
 * 4. 脱敏：后端对**非管理员**会把密钥类字段（password / access_key_secret / secret_key /
 *    access_key / secret_id / key）脱敏成 `****` 占位串；管理员（后台）返回明文。
 *    若拿到的仍是占位串，原样回传即可表示不修改，后端 restoreSecretParams 会还原真实值。
 */

// 读取配置（name 为空时取整份）
export const getToml = (method, params = {}) =>
  call('toml', method, { method: 'GET', params })

// 保存配置
export const saveToml = (method, data = {}) =>
  call('toml', method, { method: 'PUT', data })

// 连通性测试
export const testToml = (method, data = {}) =>
  call('toml', method, { method: 'POST', data })

// ===== 语义化封装 =====

/** 日志配置（只读：后端未提供保存方法） */
export const getTomlLog = () => getToml('log')

/** 通知配置（消息保留天数） */
export const getTomlNotification = () => getToml('notification')

/** 短信配置（不带 name 时返回 drive + 各服务商，且已脱敏） */
export const getTomlSms = () => getToml('sms')

/**
 * 发件队列（config/sms.toml 的 [email] 段：分批 + 重试参数）
 *
 * - 读取：getTomlSms() 的 data.email 里就带着这些字段（与邮件服务配置同表）；
 * - 保存：saveToml('sms-email-queue', { batch_size, batch_interval, retry_delay,
 *   max_attempts, send_timeout, verify_wait, queue_size })，只提交要改的字段，
 *   未提交的保持原值，越界（见后端 facade.MailQueueLimits）返回 400。
 */

/** 缓存配置（返回 open / default / redis / file / ram） */
export const getTomlCache = () => getToml('cache')

/** JWT 配置（返回 { jwt: { key, expire, issuer, subject } }） */
export const getTomlJwt = () => getToml('crypt', { name: 'jwt' })

/**
 * 存储配置：必须按分组读取，避免拿到明文密钥
 * @param {string} name local / cos / attachment
 */
export const getStorageGroup = (name) => getToml('storage', { name })
