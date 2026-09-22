import { call } from './request'

// ids 归一化：DELETE 走 query 传参，数组会被序列化成 ids[]= 导致后端取不到，统一转逗号分隔字符串
const toIdsString = (ids) =>
  (Array.isArray(ids) ? ids : [ids])
    .map((i) => Number(i))
    .filter((i) => i > 0)
    .join(',')

// PUT/POST 走 JSON body，直接传数组即可（utils.Unity.Ids 会解析）
const toIdsArray = (ids) =>
  (Array.isArray(ids) ? ids : [ids])
    .map((i) => Number(i))
    .filter((i) => i > 0)

// 列表字段：带上 result 才能拿到触发者（from_user）
export const NOTIFICATION_FIELD =
  'id,uid,from_uid,type,title,content,bind_id,bind_type,is_read,create_time,update_time,delete_time,result'

/**
 * 消息列表（GET notification/all）
 *
 * 作用域由后端决定：普通用户只看自己的；root 可同时看到广播（uid=0）。
 * 显式传 uid 会精确过滤（uid=0 即只看广播；传自己的 id 即只看个人消息）。
 * 支持 where / like（「字段名|值」）/ order / onlyTrashed。
 */
export const listNotifications = (params = {}) =>
  call('notification', 'all', {
    method: 'GET',
    params: { page: 1, limit: 15, order: 'create_time desc', field: NOTIFICATION_FIELD, ...params }
  })

/**
 * 广播（系统公告）列表：uid = 0
 * 仅 root 可见（非 root 传 uid=0 会被后端与自身 uid 求交集，结果为空）
 */
export const listBroadcasts = (params = {}) =>
  listNotifications({ ...params, uid: 0 })

// 消息数量（后端固定按当前登录用户过滤，因此不能用于统计广播）
export const countNotifications = (params = {}) =>
  call('notification', 'count', { method: 'GET', params })

// 当前用户未读消息数
export const getUnreadCount = () =>
  call('notification', 'unread-count', { method: 'GET' })

/**
 * 发送系统消息（POST notification/send-system，仅 root）
 * target_type: all（广播，仅创建一条 uid=0 记录）/ partial / single
 * user_ids: 指定用户 ID 数组（target_type 非 all 时必填）
 * send_email: 是否同时发送邮件（仅指定用户生效）
 * as_system: 是否以「系统消息」身份发送（标题加【系统消息】前缀）
 */
export const sendSystemMessage = (data) =>
  call('notification', 'send-system', { method: 'POST', data })

// 更新消息（PUT notification/update，需 id；允许字段见后端 allowFields）
export const updateNotification = (data) =>
  call('notification', 'update', { method: 'PUT', data })

// 标记单条已读
export const readNotification = (id) =>
  call('notification', 'read', { method: 'PUT', data: { id: Number(id) } })

// 全部标记已读（当前登录用户）
export const readAllNotifications = () =>
  call('notification', 'read-all', { method: 'PUT' })

// 批量标记已读（广播与个人通知分别处理）
export const readBatchNotifications = (ids) =>
  call('notification', 'read-batch', { method: 'PUT', data: { ids: toIdsArray(ids) } })

// 软删除（root 删除广播即「撤回公告」，全体不可见）
export const removeNotifications = (ids) =>
  call('notification', 'remove', { method: 'DELETE', params: { ids: toIdsString(ids) } })

// 彻底删除（不可恢复）
export const forceDeleteNotifications = (ids) =>
  call('notification', 'delete', { method: 'DELETE', params: { ids: toIdsString(ids) } })

// 从回收站恢复
export const restoreNotifications = (ids) =>
  call('notification', 'restore', { method: 'PUT', data: { ids: toIdsArray(ids) } })

// 清空回收站（root 同时清理广播）
export const clearNotificationRecycle = () =>
  call('notification', 'clear', { method: 'DELETE' })

// 清空当前用户的消息（可按 type 过滤；is_read=1 时只清空已读）
export const removeAllNotifications = (params = {}) =>
  call('notification', 'remove-all', { method: 'DELETE', params })
