import axios from 'axios'
import { toast } from '@/utils/toast'
import { useUserStore } from '@/stores/user'
import router from '@/router'
import { cache } from '@/utils/cache'
import { getCookie } from '@/utils/cookie'
import { showAuthDialog, clearLocalAuthData } from '@/utils/authDialog'

// 与 stores/user.js、Login.vue、Register.vue 保持一致的 token cookie 名
export const TOKEN_NAME = 'INIS_LOGIN_TOKEN'

// 约定：token 同时存于 cookie（INIS_LOGIN_TOKEN）和 localStorage（mellow_token）两处，
// 便于跨域/代理环境下稳定读取。优先读 cookie，回退读 localStorage。
function readToken() {
  const fromCookie = getCookie(TOKEN_NAME)
  if (fromCookie) return fromCookie
  try {
    const fromLs = localStorage.getItem('mellow_token')
    if (fromLs) return fromLs
  } catch (e) {
    // localStorage 不可用时忽略
  }
  return ''
}

// baseURL 优先取 .env 的 VITE_API_URI（指向真实后端），
// 未配置时回退到 '/api'（配合 vite dev proxy 转发）
const API_URI = import.meta.env.VITE_API_URI || ''
const baseURL = API_URI ? `${API_URI.replace(/\/$/, '')}/api` : '/api'

const service = axios.create({
  baseURL,
  timeout: 30000,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json'
  }
})

// dev 类接口（如 /dev/info/time）不走 /api 前缀，单独导出实例供调用
export const devService = axios.create({
  baseURL: API_URI ? API_URI.replace(/\/$/, '') : '',
  timeout: 10000,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json'
  }
})

// INIS 鉴权说明（参考 Cardify-inis 实现，实测 /api/comm/check-token 返回 "Authorization 不能为空！"）：
// 后端校验的是请求头 Authorization: <token>（裸 JWT，不要加 "Bearer " 前缀）。
// 登录/注册等匿名接口不带 token；check-token 等鉴权接口需要带 token（由拦截器统一注入）。
service.interceptors.request.use((config) => {
  const token = readToken()
  if (token) {
    config.headers.Authorization = token
  }
  // 上传文件：手动设置的 "multipart/form-data" 不带 boundary，Go 后端无法解析
  // （报错：request Content-Type isn't multipart/form-data）。
  // 这里统一移除该请求头，改由浏览器自动生成带 boundary 的 multipart/form-data。
  if (config.data instanceof FormData) {
    const headers = config.headers
    if (headers) {
      if (typeof headers.delete === 'function') headers.delete('Content-Type')
      else delete headers['Content-Type']
    }
  }
  return config
})

// 是否正在登出中，防止重复触发
let isLoggingOut = false

const handleLogout = () => {
  if (isLoggingOut) return
  isLoggingOut = true
  const userStore = useUserStore()
  userStore.clear()
  // 仅当前页面需要登录时才跳转
  const current = router.currentRoute.value
  if (current.meta?.auth) {
    router.push({ name: 'login', query: { redirect: current.fullPath } })
  }
  setTimeout(() => { isLoggingOut = false }, 2000)
}

// 401 弹窗的确认动作：彻底清除本地登录信息（全部 cookie + localStorage + sessionStorage）并跳转登录页
const confirmClearAndRelogin = () => {
  // 先重置内存中的用户状态（store 的内存值不会因存储清空而自动重置）
  useUserStore().clear()
  // 再彻底清空当前域的 cookie 与本地/会话存储
  clearLocalAuthData()
  const current = router.currentRoute.value
  router.push({ name: 'login', query: { redirect: current.fullPath } })
}

// 401 统一处理：自动清理登录态 + 弹窗提示（用户点击可彻底清除并重新登录）
const handleUnauthorized = (msg) => {
  handleLogout()
  showAuthDialog(msg, confirmClearAndRelogin)
}

service.interceptors.response.use(
  (res) => {
    const data = res.data
    if (res.config.responseType === 'blob') return res

    if (data && typeof data === 'object' && 'code' in data) {
      if (data.code === 200 || data.code === 201) {
        return data
      }
      // 204 无数据（如 config 查询不存在的 key），静默返回
      if (data.code === 204) {
        return { code: 204, data: null, msg: data.msg }
      }
      // 401/412 未登录或 token 失效：清理本地状态并弹窗提示
      // 若调用方传了 skipAuthLogout（如 check-token 需要拿到原始码做本地状态清理），
      // 则不触发全局登出，原样返回给调用方处理（参考 Cardify-inis 实现）
      if (data.code === 401 || data.code === 412) {
        if (!res.config?.skipAuthLogout) {
          handleUnauthorized(data.msg)
        }
        return Promise.reject({ ...data, code: data.code })
      }
      if (data.code === 403) {
        toast.error(data.msg || '没有权限')
        return Promise.reject(data)
      }
      toast.error(data.msg || '请求失败')
      return Promise.reject(data)
    }
    return data
  },
  (err) => {
    if (err.response) {
      if (err.response.status === 401) {
        handleUnauthorized(err.response.data?.msg)
      } else {
        toast.error(err.response.data?.msg || `请求异常 (${err.response.status})`)
      }
    } else if (err.request) {
      toast.error('网络异常，请检查连接')
    } else if (err.code !== 'ERR_CANCELED') {
      toast.error(err.message || '请求失败')
    }
    return Promise.reject(err)
  }
)

export default service
export { cache }

/**
 * INIS 控制器通用调用方法
 * @param {string} controller 控制器名,如 'article'
 * @param {string} method 方法名,如 'all'
 * @param {object} options
 * @param {string} options.method HTTP 方法,默认 GET
 * @param {object} options.params GET 参数（where 可直接传对象）
 * @param {object} options.data POST/PUT body
 */
export const call = (controller, method, options = {}) => {
  const { method: httpMethod = 'GET', params, data, config } = options
  return service.request({
    url: `/${controller}/${method}`,
    method: httpMethod,
    params: httpMethod === 'GET' || httpMethod === 'DELETE' ? params : undefined,
    data: httpMethod !== 'GET' && httpMethod !== 'DELETE' ? data : undefined,
    ...config
  })
}
