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

/**
 * unix 秒 -> <input type="datetime-local"> 需要的本地时间字符串（YYYY-MM-DDTHH:mm）
 * 无有效时间戳时返回空串（输入框显示为空）
 */
export const toLocalInput = (timestamp) => {
  const ts = Number(timestamp)
  if (!ts) return ''
  const d = new Date(ts * 1000)
  if (Number.isNaN(d.getTime())) return ''
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

/**
 * <input type="datetime-local"> 的值 -> unix 秒
 * 空值返回 0（业务上 0 表示「未设置 / 不限制」）
 */
export const fromLocalInput = (value) => {
  if (!value) return 0
  const ts = Math.floor(new Date(value).getTime() / 1000)
  return Number.isFinite(ts) ? ts : 0
}