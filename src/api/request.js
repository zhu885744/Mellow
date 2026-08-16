import axios from 'axios'
import { toast } from '@/utils/toast'
import { useUserStore } from '@/stores/user'
import router from '@/router'

const service = axios.create({
  baseURL: '/api',
  timeout: 15000,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json'
  }
})

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
      if (data.code === 401 || data.code === 412) {
        const userStore = useUserStore()
        userStore.clear()
        if (router.currentRoute.value.name !== 'login') {
          router.push({
            name: 'login',
            query: { redirect: router.currentRoute.value.fullPath }
          })
        }
        toast.error(data.msg || '请先登录')
        return Promise.reject(data)
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
        const userStore = useUserStore()
        userStore.clear()
        router.push({ name: 'login' })
      }
      toast.error(err.response.data?.msg || `请求异常 (${err.response.status})`)
    } else if (err.request) {
      toast.error('网络异常，请检查连接')
    } else {
      toast.error(err.message || '请求失败')
    }
    return Promise.reject(err)
  }
)

export default service

export const call = (controller, method, options = {}) => {
  const { method: httpMethod = 'GET', params, data } = options
  return service.request({
    url: `/${controller}/${method}`,
    method: httpMethod,
    params: httpMethod === 'GET' || httpMethod === 'DELETE' ? params : undefined,
    data: httpMethod !== 'GET' && httpMethod !== 'DELETE' ? data : undefined
  })
}