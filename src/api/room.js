import { call } from './request'

/**
 * 公共聊天室（id=1）
 *
 * 后端：app/api/controller/room.go（模块 room，全部 type=login）。
 * 实时消息走同一个 WebSocket：服务端广播 { type:'room' | 'room_revoke' | 'room_delete' | 'room_mute' | 'room_unmute' | 'room_update' | 'room_clear', data }，
 * 由 stores/chat.js 转成 { type:'room', event } 事件给房间页订阅。
 *
 * 为什么发言也走 HTTP：与私信一致 —— 能拿到明确的业务错误（禁言 / 关闭 / 超长），
 * 幂等键 client_msg_id 让连点与重试都不会产生重复消息；落库后服务端会广播给所有人。
 */

// 房间资料 + 我的状态（是否超级管理员 / 是否被禁言）
export const getRoomInfo = () => call('room', 'info', { method: 'GET' })

/**
 * 历史消息
 * @param {object} [params] before_id：往前翻页；after_seq：断线补拉；limit：条数
 */
export const listRoomMessages = (params = {}) =>
  call('room', 'messages', { method: 'GET', params: { limit: 30, ...params } })

export const sendRoomMessage = (data) => call('room', 'send', { method: 'POST', data })

// 撤回：本人 2 分钟内，管理员不限
export const revokeRoomMessage = (msgId) =>
  call('room', 'revoke', { method: 'POST', data: { msg_id: Number(msgId) } })

/**
 * 删除一条消息（只对自己生效）
 *
 * 与撤回不同：撤回会清空内容并广播给所有人；删除只是把自己视图里的这条藏起来，
 * 对方 / 其他人完全无感。
 */
export const deleteRoomMessage = (msgId) =>
  call('room', 'delete', { method: 'POST', data: { msg_id: Number(msgId) } })

/**
 * 禁言（仅超级管理员）
 * @param {number} uid 目标用户
 * @param {number} [minutes] 禁言分钟数，0 = 永久
 */
export const muteRoomUser = (uid, minutes = 0, reason = '') =>
  call('room', 'mute', { method: 'POST', data: { uid: Number(uid), minutes: Number(minutes), reason } })

export const unmuteRoomUser = (uid) =>
  call('room', 'unmute', { method: 'POST', data: { uid: Number(uid) } })

// 生效中的禁言名单（仅超级管理员）
export const listRoomMutes = () => call('room', 'mutes', { method: 'GET' })

/**
 * 修改房间资料（仅超级管理员）
 * @param {object} data { name, description, avatar }
 */
export const updateRoom = (data) => call('room', 'update', { method: 'PUT', data })

/**
 * 自动清空配置（仅超级管理员）
 *
 * 返回 { days, options, last_time, last_count, next_time }：
 * 清空本身由服务端定时任务执行（app/timer/room.go），前端只负责改间隔。
 */
export const getRoomAutoClear = () => call('room', 'auto-clear', { method: 'GET' })

/**
 * 保存自动清空间隔（仅超级管理员）
 * @param {number} days 间隔天数，只接受后端提供的选项
 */
export const saveRoomAutoClear = (days) =>
  call('room', 'auto-clear', { method: 'PUT', data: { days: Number(days) } })
