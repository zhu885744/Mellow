import { call } from './request'

export const listTags = (params = {}) =>
  call('tags', 'all', { method: 'GET', params })

export const getTag = (id) =>
  call('tags', 'one', { method: 'GET', params: { id } })

// 点赞
export const like = (target_type, target_id) =>
  call('user-likes', 'like', { method: 'POST', data: { target_type, target_id } })

export const unlike = (target_type, target_id) =>
  call('user-likes', 'unlike', { method: 'POST', data: { target_type, target_id } })

export const isLiked = (target_type, target_id) =>
  call('user-likes', 'is-liked', { method: 'GET', params: { target_type, target_id } })

export const likesCount = (target_type, target_id) =>
  call('user-likes', 'counts', { method: 'GET', params: { target_type, target_id } })

// 收藏
export const collect = (target_type, target_id) =>
  call('user-collects', 'collect', { method: 'POST', data: { target_type, target_id } })

export const uncollect = (target_type, target_id) =>
  call('user-collects', 'uncollect', { method: 'POST', data: { target_type, target_id } })

export const isCollected = (target_type, target_id) =>
  call('user-collects', 'is-collected', { method: 'GET', params: { target_type, target_id } })

export const collectsCount = (target_type, target_id) =>
  call('user-collects', 'counts', { method: 'GET', params: { target_type, target_id } })

export const myCollects = (params = {}) =>
  call('user-collects', 'collects', { method: 'GET', params })

// 关注
export const follow = (follow_uid) =>
  call('user-follows', 'follow', { method: 'POST', data: { follow_uid } })

export const unfollow = (follow_uid) =>
  call('user-follows', 'unfollow', { method: 'POST', data: { follow_uid } })

export const isFollowing = (follow_uid) =>
  call('user-follows', 'is-following', { method: 'GET', params: { follow_uid } })

// 通知
export const listNotifications = (params = {}) =>
  call('notification', 'list', { method: 'GET', params })

export const unreadCount = () =>
  call('notification', 'unread-count', { method: 'GET' })

export const readNotification = (id) =>
  call('notification', 'read', { method: 'PUT', data: { id } })

export const readAllNotifications = () =>
  call('notification', 'read-all', { method: 'PUT' })

export const removeAllNotifications = () =>
  call('notification', 'remove-all', { method: 'DELETE' })

// 经验榜
export const expActive = () =>
  call('exp', 'active', { method: 'GET' })