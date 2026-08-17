import { call, devService } from './request'
import cryptoUtil from '@/utils/crypto'

/**
 * 获取服务器 unix 时间戳（用于加密盐派生）
 * 接口路径为 /dev/info/time（不带 /api 前缀，属于 dev 类接口）
 * 优先请求后端时间接口，失败则回退本地时间（参考 Cardify-inis 实现）
 */
async function getUnix() {
  try {
    const { code, data } = await devService.get('/dev/info/time')
    if (code === 200 && data && typeof data.unix === 'number') {
      return data.unix
    }
  } catch (e) {
    // 忽略，使用本地时间
  }
  return Math.round(Date.now() / 1000)
}

/**
 * 生成加密所需的 AES 实例与请求头（参考 Cardify-inis 登录加密实现）
 * 返回 { AES, headers }
 */
async function buildEncryptedRequest(account, password) {
  const unix = await getUnix()

  // 基于时间派生 key / iv（各 16 位）
  const iv = cryptoUtil.token
    ? cryptoUtil.token(`iv-${unix}`, 16, 'aes')
    : cryptoUtil.random(16)
  const key = cryptoUtil.token
    ? cryptoUtil.token(`key-${unix}`, 16, 'aes')
    : cryptoUtil.random(16)

  const safeIv = iv.length >= 16 ? iv.substring(0, 16) : iv.padEnd(16, '0')
  const safeKey = key.length >= 16 ? key.substring(0, 16) : key.padEnd(16, '0')

  const AES = cryptoUtil.createAES
    ? cryptoUtil.createAES(safeKey, safeIv)
    : new cryptoUtil.AES(safeKey, safeIv)

  const headers = {
    'X-Khronos': String(unix),
    'X-Gorgon': `${safeKey} ${safeIv}`,
    'X-Argus': AES.encrypt(
      JSON.stringify({ unix, account, password })
    )
  }

  return { AES, headers }
}

// 登录（加密传输）
export const login = async (account, password) => {
  const { AES, headers } = await buildEncryptedRequest(account, password)
  return call('comm', 'login', {
    method: 'POST',
    data: {
      account: AES.encrypt(account),
      password: AES.encrypt(password),
      source: 'default'
    },
    config: { headers, timeout: 10000 }
  })
}

// 注册（发送验证码）
export const registerSendCode = (social) =>
  call('comm', 'register', {
    method: 'POST',
    data: { social }
  })

// 注册（提交，加密传输）
export const register = async (social, code, password, account = '', nickname = '') => {
  // 注册接口使用 social 作为登录账号，password 需加密
  const { AES, headers } = await buildEncryptedRequest(social, password)
  return call('comm', 'register', {
    method: 'POST',
    data: {
      social,
      code,
      account: account ? AES.encrypt(account) : '',
      nickname: nickname ? AES.encrypt(nickname) : '',
      password: AES.encrypt(password)
    },
    config: { headers, timeout: 10000 }
  })
}

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
// skipAuthLogout: 让 401/412 原样返回，由调用方（user store 的 checkLoginState）统一处理本地登录态清理，
// 避免全局拦截直接 reject 导致误判为"保持登录"或误清有效登录态（参考 Cardify-inis 实现）
export const checkToken = (renew = false) =>
  call('comm', 'check-token', {
    method: 'POST',
    params: { renew },
    config: { skipAuthLogout: true }
  })

// 退出登录
export const logout = () =>
  call('comm', 'logout', { method: 'DELETE' })
