import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { checkToken, logout as apiLogout } from '@/api/comm'
import { call } from '@/api/request'
import { cache } from '@/utils/cache'
import { toast } from '@/utils/toast'
import { getCookie, setCookie, clearCookie } from '@/utils/cookie'
import { TOKEN_NAME } from '@/api/request'

const TOKEN_KEY = 'blog_user'
const TOKEN_VALID = 'blog_token_valid'
const USER_CACHE = 'user-info'
const TOKEN_LS = 'mellow_token' // token 的 localStorage 兜底（与 request.js readToken 对应）

// 统一持久化 token：cookie（INIS_LOGIN_TOKEN，供同域兜底）+ localStorage（跨域/代理环境兜底）
function persistToken(token, valid) {
  if (!token) return
  try {
    setCookie(TOKEN_NAME, token, valid)
  } catch {}
  try {
    localStorage.setItem(TOKEN_LS, token)
  } catch {}
}

function clearToken() {
  try {
    clearCookie(TOKEN_NAME)
  } catch {}
  try {
    localStorage.removeItem(TOKEN_LS)
  } catch {}
}

// 并发保护
let checkingToken = false
let checkTokenPromise = null
let fetchingSiteInfo = false
let fetchSiteInfoPromise = null

// 规范化用户对象：确保 json 字段是对象（后端可能返回字符串）
function normalizeUser(u) {
  if (!u || typeof u !== 'object') return u || {}
  const user = { ...u }
  if (user.json && typeof user.json === 'string') {
    try {
      user.json = JSON.parse(user.json)
    } catch {
      user.json = {}
    }
  }
  if (!user.json) user.json = {}
  return user
}

export const useUserStore = defineStore('user', () => {
  const user = ref(null)
  const tokenValid = ref(0)
  // 兼容参考主题的 login 结构：finish 表示登录态校验是否完成
  const login = ref({ finish: false, user: {} })
  // 站点信息（从 config/one?key=Mellow_functions 获取）
  const siteInfo = ref({})

  const isLogged = computed(() => !!user.value)
  const isLoggedIn = computed(() => login.value.finish && Object.keys(login.value.user || {}).length > 0)

  // ===== 基础持久化 =====
  function setUser(u, valid = 1296000) {
    const nu = normalizeUser(u)
    user.value = nu
    tokenValid.value = valid
    login.value = { finish: true, user: nu || {} }
    save()
    cache.set(USER_CACHE, nu || {}, Math.ceil(valid / 60))
  }

  function clear() {
    user.value = null
    tokenValid.value = 0
    login.value = { finish: true, user: {} }
    save()
    cache.del(USER_CACHE)
  }

  function save() {
    try {
      localStorage.setItem(TOKEN_KEY, JSON.stringify(user.value || null))
      localStorage.setItem(TOKEN_VALID, String(tokenValid.value || 0))
    } catch {}
  }

  function restore() {
    try {
      const u = localStorage.getItem(TOKEN_KEY)
      const v = localStorage.getItem(TOKEN_VALID)
      user.value = u && u !== 'null' ? JSON.parse(u) : null
      tokenValid.value = v ? parseInt(v) : 0
      if (user.value) {
        login.value = { finish: true, user: user.value }
      }
    } catch {}
  }

  // ===== 登录态校验（参考主题 checkToken）=====
  async function checkLoginState() {
    if (checkingToken && checkTokenPromise) {
      await checkTokenPromise
      return login.value
    }
    checkingToken = true
    checkTokenPromise = (async () => {
      login.value.finish = false
      try {
        const cachedUser = cache.get(USER_CACHE)
        if (cachedUser) {
          user.value = cachedUser
          login.value = { finish: true, user: cachedUser }
        }
        const res = await checkToken(false)
        if (res.code === 200) {
          const u = normalizeUser(res.data?.user || res.data || {})
          user.value = u
          login.value = { finish: true, user: u }
          const valid = Number(res.data?.valid_time) > 0 ? Number(res.data.valid_time) : 2 * 60 * 60
          tokenValid.value = valid
          // 同步 token 到 cookie + localStorage（刷新/续期）
          if (res.data?.token) {
            persistToken(res.data.token, valid)
          }
          cache.set(USER_CACHE, u, Math.ceil(valid / 60))
          save()
        } else if (res.code === 401 || res.code === 412) {
          clear()
        } else {
          login.value.finish = true
        }
      } catch {
        if (cache.get(USER_CACHE)) {
          login.value.finish = true
        }
      } finally {
        checkingToken = false
        checkTokenPromise = null
      }
    })()
    await checkTokenPromise
    return login.value
  }

  // 应用启动时校验（仅当存在 token 或缓存用户时才发请求）
  async function ensureLogin() {
    const hasToken = !!getCookie(TOKEN_NAME)
    const hasCachedUser = user.value || cache.get(USER_CACHE)
    if (!hasToken && !hasCachedUser) {
      login.value.finish = true
      return login.value
    }
    if (!login.value.finish || !hasCachedUser) {
      await checkLoginState()
    }
    return login.value
  }

  async function verifyToken(silent = false) {
    if (!user.value) return false
    try {
      const res = await checkToken(false)
      if (res.code === 200) {
        const u = normalizeUser(res.data?.user || res.data || {})
        user.value = u
        login.value = { finish: true, user: u }
        if (res.data?.valid_time) tokenValid.value = res.data.valid_time
        if (res.data?.token) {
          persistToken(res.data.token, Number(res.data.valid_time) > 0 ? Number(res.data.valid_time) : 2 * 60 * 60)
        }
        save()
        return true
      }
      clear()
      if (!silent) toast.error('登录已过期，请重新登录')
      return false
    } catch {
      return false
    }
  }

  // ===== 站点信息（参考主题 fetchSiteInfo）=====
  async function fetchSiteInfo(force = false) {
    if (!force && fetchingSiteInfo && fetchSiteInfoPromise) {
      return fetchSiteInfoPromise
    }
    fetchingSiteInfo = true
    fetchSiteInfoPromise = (async () => {
      const cacheName = 'Mellow_functions'
      try {
        if (!force) {
          const cached = cache.get(cacheName)
          if (cached && typeof cached === 'object') {
            siteInfo.value = cached
            return cached
          }
        }
        const res = await call('config', 'one', { method: 'GET', params: { key: 'Mellow_functions' } })
        if (res.code === 200 && res.data) {
          let info = res.data.json || res.data
          if (info && typeof info === 'object') {
            siteInfo.value = info
            cache.set(cacheName, info, 30)
          }
          return siteInfo.value
        }
      } catch (e) {
        console.error('获取站点信息失败:', e)
      } finally {
        fetchingSiteInfo = false
        fetchSiteInfoPromise = null
      }
      return siteInfo.value
    })()
    return fetchSiteInfoPromise
  }

  async function logout() {
    try {
      await apiLogout()
    } catch {}
    clear()
    // 清除 token（cookie + localStorage）
    clearToken()
    toast.success('已退出登录')
  }

  return {
    user,
    tokenValid,
    login,
    siteInfo,
    isLogged,
    isLoggedIn,
    setUser,
    clear,
    save,
    restore,
    verifyToken,
    checkLoginState,
    ensureLogin,
    fetchSiteInfo,
    logout,
    persistToken,
    clearToken
  }
})
