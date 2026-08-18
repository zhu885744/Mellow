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
 * 复制文本到剪贴板（优先 Clipboard API，非安全上下文降级 execCommand）
 * @returns {Promise<boolean>} 是否复制成功
 */
export async function copyText(text) {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text)
      return true
    }
  } catch {
    /* 继续走降级方案 */
  }
  const ta = document.createElement('textarea')
  ta.value = text
  ta.style.position = 'fixed'
  ta.style.left = '-9999px'
  ta.style.top = '0'
  document.body.appendChild(ta)
  ta.select()
  let ok = false
  try {
    ok = document.execCommand('copy')
  } catch {
    /* ignore */
  }
  document.body.removeChild(ta)
  return ok
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
    avatar: author?.avatar || item?.avatar || '',
    title: pickUserTitle(author),
    level: pickUserLevel(author)
  }
}

/**
 * 提取用户等级（兼容 result.level.current / users_rating.users_grade / users_rating.grade / grade）
 * 参考作者主页 Author.vue 的取值逻辑
 */
export const pickUserLevel = (user) => {
  if (!user || typeof user !== 'object') return 0
  const lv = user?.result?.level?.current || user?.users_rating?.users_grade
  return lv?.value ?? user?.users_rating?.grade ?? user?.grade ?? 0
}

/**
 * 提取用户头衔
 */
export const pickUserTitle = (user) => {
  return user?.title || ''
}

/**
 * 头衔配色映射（与 Profile 页 10 个头衔一致）
 */
const titleColorMap = {
  '掌门': 'title-zhangmen',
  '长老': 'title-zhanglao',
  '护法': 'title-hufa',
  '内门弟子': 'title-neimen',
  '外门弟子': 'title-waimen',
  '炼气修士': 'title-lianqi',
  '筑基修士': 'title-zhuji',
  '结丹修士': 'title-jiedan',
  '元婴老祖': 'title-yuanying',
  '化神大能': 'title-huashen',
  // 兼容旧头衔
  '侠客': 'title-xiake',
  '学徒': 'title-xuetu'
}
export const getTitleColorClass = (title) => {
  return titleColorMap[title] || 'title-default'
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