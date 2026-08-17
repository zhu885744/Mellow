import { defineStore } from 'pinia'
import { ref } from 'vue'
import { unreadCount, readAllNotifications } from '@/api/tags'

export const useNotificationStore = defineStore('notification', () => {
  const count = ref(0)
  let timer = null

  async function refresh() {
    try {
      const res = await unreadCount()
      // 后端返回结构: { code, data: { count } }
      count.value = res.data?.data?.count || 0
    } catch {}
  }

  function startPolling() {
    stopPolling()
    refresh()
    timer = setInterval(refresh, 60 * 1000)
  }

  function stopPolling() {
    if (timer) {
      clearInterval(timer)
      timer = null
    }
  }

  function clearCount() {
    count.value = 0
  }

  async function readAll() {
    await readAllNotifications()
    count.value = 0
  }

  return { count, refresh, startPolling, stopPolling, clearCount, readAll }
})