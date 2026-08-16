import { defineStore } from 'pinia'
import { ref } from 'vue'
import { unreadCount, readAllNotifications } from '@/api/tags'

export const useNotificationStore = defineStore('notification', () => {
  const count = ref(0)
  let timer = null

  async function refresh() {
    try {
      const res = await unreadCount()
      count.value = res.data || 0
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