import { call } from './request'

export const listTags = (params = {}) =>
  call('tags', 'all', { method: 'GET', params })

export const getTag = (id) =>
  call('tags', 'one', { method: 'GET', params: { id } })

// 点赞
export const like = (target_type, target_id) =>
  call('user-likes', 'like', { method: 'POST', data: { target_type, target_id } })

export const unlike = (target_type, target_id) =>
  call('user-likes', 'unlike', { method: 'PUT', data: { target_type, target_id } })

export const isLiked = (target_type, target_id) =>
  call('user-likes', 'is-liked', { method: 'GET', params: { target_type, target_id } })

// 批量查询点赞数（参考 i-comment.vue：user-likes/counts 用 target_ids 数组）
export const likesCount = (target_type, target_ids) => {
  const ids = Array.isArray(target_ids) ? target_ids : [target_ids]
  return call('user-likes', 'counts', {
    method: 'GET',
    params: { target_type, target_ids: ids.join(',') }
  })
}

// 收藏
export const collect = (target_type, target_id) =>
  call('user-collects', 'collect', { method: 'POST', data: { target_type, target_id } })

export const uncollect = (target_type, target_id) =>
  call('user-collects', 'uncollect', { method: 'PUT', data: { target_type, target_id } })

export const isCollected = (target_type, target_id) =>
  call('user-collects', 'is-collected', { method: 'GET', params: { target_type, target_id } })

export const collectsCount = (target_type, target_ids) => {
  // 支持传入单个 id 或 id 数组，统一拼接为逗号分隔的 target_ids
  const ids = Array.isArray(target_ids) ? target_ids : [target_ids]
  return call('user-collects', 'counts', {
    method: 'GET',
    params: { target_type, target_ids: ids.join(',') }
  })
}

export const myCollects = (params = {}) =>
  call('user-collects', 'collects', { method: 'GET', params })

// 获取点赞列表（支持 where: { login } 查询他人点赞）
export const myLikes = (params = {}) =>
  call('user-likes', 'likes', { method: 'GET', params })

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