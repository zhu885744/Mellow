import { call } from '@/api/request'
// 表情图片为后端静态资源，统一复用运行时地址解析（见 @/utils/runtimeConfig）
import { getFullUrl } from '@/utils/runtimeConfig'

/**
 * 表情渲染工具
 * 后端规范：[emoji:表情链接] -> <img>
 */

export { getFullUrl }

/**
 * 渲染 @ 提及
 *
 * 后端保存内容时会把 @昵称 规范化为 markdown 链接 @[昵称](/author/12)
 * （见 app/model/mention.go，只有「已关注的人」才会被规范化）。文章 / 独立页由
 * markdown-it 直接渲染，评论 / 动态走这里转成 <a>，四处表现一致。
 *
 * 链接目标固定是数字 id（后端写的），昵称做 HTML 转义后输出，避免昵称里的
 * 特殊字符（< > & " '）破坏结构。
 */
export const renderMention = (content) => {
  if (!content || !String(content).includes('@[')) return content || ''
  return String(content).replace(/@\[([^\[\]]*)\]\(\/author\/(\d+)\)/g, (match, name, id) => {
    const safe = escapeHtml(name)
    return `<a class="mention" data-mention-id="${id}" href="/author/${id}">@${safe}</a>`
  })
}

/**
 * 渲染 #话题#
 *
 * 后端保存内容时会把 #话题# 规范化为 markdown 链接 #[话题名](/topic/12)
 * （见 app/model/topics.go，不存在的话题会自动创建），这里转成可点击的 <a>，
 * 与 @提及 同一套做法：文章 / 独立页由 markdown-it 渲染，评论 / 动态走这里，表现一致。
 */
export const renderHashtag = (content) => {
  if (!content || !String(content).includes('#[')) return content || ''
  return String(content).replace(/#\[([^\[\]]*)\]\(\/topic\/(\d+)\)/g, (match, name, id) => {
    const safe = escapeHtml(name)
    return `<a class="hashtag" data-topic-id="${id}" href="/topic/${id}">#${safe}#</a>`
  })
}

/** HTML 转义（v-html 前的兜底，避免昵称里的特殊字符被当标签解析） */
export const escapeHtml = (text) => {
  return String(text ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
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
  // @ 提及、#话题# 先转链接：链接文本里不会出现 [emoji:]，与表情互不干扰
  let html = renderHashtag(renderMention(String(content)))
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
