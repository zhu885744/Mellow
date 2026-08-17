import { defineStore } from 'pinia'
import { ref } from 'vue'
import { unreadCount, listNotifications, readAllNotifications } from '@/api/tags'

export const useNotificationStore = defineStore('notification', () => {
  const count = ref(0)
  // 最新一条通知（优先取未读的最新一条，无未读时取已读的最新一条）
  const latest = ref(null)
  let timer = null

  const pickFirst = (res) => {
    const payload = res?.data?.data
    const list = Array.isArray(payload) ? payload : payload?.data || []
    return list[0] || null
  }

  async function refresh() {
    try {
      const res = await unreadCount()
      // 后端返回结构: { code, data: { count } }
      count.value = res.data?.data?.count || 0
      const [unread, read] = await Promise.allSettled([
        listNotifications({ page: 1, size: 1, order: 'create_time desc', is_read: 0 }),
        listNotifications({ page: 1, size: 1, order: 'create_time desc', is_read: 1 })
      ])
      const latestUnread = unread.status === 'fulfilled' ? pickFirst(unread.value) : null
      const latestRead = read.status === 'fulfilled' ? pickFirst(read.value) : null
      // 至少一个列表请求成功才更新；都失败则保留旧值，避免误显示"暂无消息"
      if (unread.status === 'fulfilled' || read.status === 'fulfilled') {
        latest.value = latestUnread || latestRead
      }
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
    await refresh()
  }

  return { count, latest, refresh, startPolling, stopPolling, clearCount, readAll }
})