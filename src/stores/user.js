import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { checkToken, logout as apiLogout } from '@/api/comm'
import { toast } from '@/utils/toast'

const TOKEN_KEY = 'blog_user'
const TOKEN_VALID = 'blog_token_valid'

export const useUserStore = defineStore('user', () => {
  const user = ref(null)
  const tokenValid = ref(0)
  const isLogged = computed(() => !!user.value)

  function setUser(u, valid = 1296000) {
    user.value = u
    tokenValid.value = valid
    save()
  }

  function clear() {
    user.value = null
    tokenValid.value = 0
    save()
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
    } catch {}
  }

  async function verifyToken(silent = false) {
    if (!user.value) return false
    try {
      const res = await checkToken(false)
      if (res.code === 200) {
        if (res.data?.user) user.value = res.data.user
        if (res.data?.valid_time) tokenValid.value = res.data.valid_time
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

  async function logout() {
    try {
      await apiLogout()
    } catch {}
    clear()
    toast.success('已退出登录')
  }

  return {
    user,
    tokenValid,
    isLogged,
    setUser,
    clear,
    save,
    restore,
    verifyToken,
    logout
  }
})