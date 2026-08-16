import { call } from '@/api/request'

/**
 * 表情渲染工具
 * 后端规范：[emoji:表情链接] -> <img>
 */

// 表情图片 URL 前缀（后端静态资源，使用 VITE_API_URI 补全完整地址）
const BASE_URL = import.meta.env.VITE_API_URI || ''

// 获取完整 URL（相对路径补全）
export const getFullUrl = (url) => {
  if (!url) return ''
  if (/^https?:\/\//.test(url)) return url
  if (url.startsWith('//')) return url
  return `${BASE_URL}${url.startsWith('/') ? url : '/' + url}`
}

/**
 * 渲染含 [emoji:url] 的文本为 HTML
 * @param {string} content 原始内容
 * @param {object} options { size: 图片尺寸(px) }
 * @returns {string} HTML 字符串（需配合 v-html 使用）
 */
export const renderEmoji = (content, options = {}) => {
  if (!content) return ''
  const size = options.size || 24
  let html = String(content)
  // 替换 [emoji:url] 为图片
  html = html.replace(
    /\[emoji:\s*(https?:\/\/[^\]]+|\/[^\]]+|[^\]]+)\]/g,
    (match, url) => {
      const fullUrl = getFullUrl(url.trim())
      return `<img src="${fullUrl}" alt="emoji" class="inline-emoji" style="width:${size}px;height:${size}px;vertical-align:middle;display:inline-block;object-fit:contain;margin:0 2px;" loading="lazy" decoding="async">`
    }
  )
  return html
}

/**
 * 渲染含 [emoji:url] 的文本，同时保留换行（转 <br>）
 */
export const renderEmojiWithBreaks = (content, options = {}) => {
  if (!content) return ''
  let html = renderEmoji(content, options)
  html = html.replace(/\n/g, '<br>')
  return html
}

/**
 * 获取后端表情包列表
 * @returns {Promise<Array>} 分类数组 [{ name, items: [{name, url}] }]
 */
export const fetchEmojiCategories = async () => {
  try {
    const res = await call('attachment', 'emoji', { method: 'GET' })
    if (res.code === 200 && res.data?.categories) {
      return res.data.categories
    }
    return []
  } catch {
    return []
  }
}

/**
 * 从文本中提取所有 emoji url（用于编辑时还原）
 */
export const extractEmojiUrls = (content) => {
  if (!content) return []
  const urls = []
  const regex = /\[emoji:\s*([^\]]+)\]/g
  let m
  while ((m = regex.exec(String(content))) !== null) {
    urls.push(m[1].trim())
  }
  return urls
}
