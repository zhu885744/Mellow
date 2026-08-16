/**
 * Cookie 工具
 */
export const getCookie = (name) => {
  if (!name) return ''
  if (document.cookie.length === 0) return ''
  const begin = document.cookie.indexOf(name + '=')
  if (begin === -1) return ''
  let end = document.cookie.indexOf(';', begin)
  if (end === -1) end = document.cookie.length
  try {
    return decodeURIComponent(document.cookie.substring(begin + name.length + 1, end))
  } catch {
    return document.cookie.substring(begin + name.length + 1, end)
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
