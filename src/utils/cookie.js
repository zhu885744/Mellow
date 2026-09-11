/**
 * Cookie 工具
 */
export const getCookie = (name) => {
  if (!name || !document.cookie) return ''
  // 用边界匹配，避免 name 命中其它 cookie 名的子串（如 token 匹配 token_backup）
  const match = document.cookie.match(new RegExp('(?:^|;\\s*)' + name + '=([^;]*)'))
  if (!match) return ''
  try {
    return decodeURIComponent(match[1])
  } catch {
    return match[1]
  }
}

export const setCookie = (name, value, seconds = 3600) => {
  const time = new Date()
  time.setTime(time.getTime() + seconds * 1000)
  document.cookie = `${name}=${value}; expires=${time.toUTCString()}; path=/`
}

export const hasCookie = (name) => {
  if (!name) return false
  return document.cookie.indexOf(name + '=') !== -1
}

export const clearCookie = (name) => {
  if (!name) return
  document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`
}
