import axios from 'axios'
import { toast } from '@/utils/toast'
import { useUserStore } from '@/stores/user'
import router from '@/router'
import { cache } from '@/utils/cache'

const service = axios.create({
  baseURL: '/api',
  timeout: 30000,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json'
  }
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
      // 401/412 未登录或 token 失效：静默清理本地状态，不弹错误
      // （check-token 会返回原始码，由调用方处理）
      if (data.code === 401 || data.code === 412) {
        handleLogout()
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
        handleLogout()
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
  const { method: httpMethod = 'GET', params, data } = options
  return service.request({
    url: `/${controller}/${method}`,
    method: httpMethod,
    params: httpMethod === 'GET' || httpMethod === 'DELETE' ? params : undefined,
    data: httpMethod !== 'GET' && httpMethod !== 'DELETE' ? data : undefined
  })
}
