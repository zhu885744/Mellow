import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import 'dayjs/locale/zh-cn'

dayjs.extend(relativeTime)
dayjs.locale('zh-cn')

export const formatTime = (timestamp) => {
  if (!timestamp) return ''
  const t = typeof timestamp === 'string' ? parseInt(timestamp) * 1000 : timestamp * 1000
  return dayjs(t).format('YYYY-MM-DD HH:mm')
}

export const formatDate = (timestamp) => {
  if (!timestamp) return ''
  const t = typeof timestamp === 'string' ? parseInt(timestamp) * 1000 : timestamp * 1000
  return dayjs(t).format('YYYY-MM-DD')
}

export const fromNow = (timestamp) => {
  if (!timestamp) return ''
  const t = typeof timestamp === 'string' ? parseInt(timestamp) * 1000 : timestamp * 1000
  return dayjs(t).fromNow()
}