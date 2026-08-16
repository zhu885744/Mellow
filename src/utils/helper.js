/**
 * 工具
 */
export const debounce = (fn, wait = 300) => {
  let t
  return function (...args) {
    clearTimeout(t)
    t = setTimeout(() => fn.apply(this, args), wait)
  }
}

/**
 * 解析 tags 字段（格式 "1|2|3|" 或 字符串）
 */
export const parseTagsField = (field) => {
  if (!field) return []
  if (Array.isArray(field)) return field
  return String(field).split('|').filter(Boolean)
}

/**
 * 字符串截断
 */
export const truncate = (str, len = 80) => {
  if (!str) return ''
  str = String(str).replace(/<[^>]+>/g, '')
  return str.length > len ? str.slice(0, len) + '...' : str
}

/**
 * 深拷贝
 */
export const clone = (obj) => JSON.parse(JSON.stringify(obj))

/**
 * 获取 cookie
 */
export const getCookie = (name) => {
  const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'))
  return match ? decodeURIComponent(match[2]) : ''
}

/**
 * 提取 result.author.user 之类的关联数据
 */
export const pickAuthor = (item) => {
  return item?.result?.user?.nickname
    ? item.result.user
    : item?.result?.author || item?.user || { id: item?.uid, nickname: '匿名', avatar: '' }
}

/**
 * 解析评论/动态的作者信息（兼容后端多种关联结构）
 * comment/flat 实际把作者放在 result.author
 */
export const pickCommentAuthor = (item) => {
  const author =
    item?.result?.author ||
    item?.author ||
    item?.user ||
    (item?.result && item.result.user ? item.result.user : null) ||
    {}
  return {
    id: author?.id || item?.uid || null,
    nickname: author?.nickname || item?.nickname || '匿名',
    avatar: author?.avatar || item?.avatar || ''
  }
}

/**
 * 判断用户是否为管理员
 * 兼容两种用户结构：user.auth（顶层）和 user.result.auth（嵌套）
 * 参考主题实现：auth.all 或 auth.group.list 中存在 key === 'admin'
 */
export const isAdmin = (user) => {
  if (!user || typeof user !== 'object') return false
  // 兼容 result.auth 和顶层 auth
  const auth = user?.result?.auth || user?.auth
  if (!auth) return false
  // 拥有 all 权限
  if (auth.all === true || auth.all === 1) return true
  // 权限组中存在 admin
  const groups = auth?.group?.list || auth?.group || []
  if (Array.isArray(groups)) {
    return groups.some((g) => g?.key === 'admin')
  }
  return false
}