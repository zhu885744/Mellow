import MarkdownIt from 'markdown-it'
import hljs from 'highlight.js'
// 表情图片地址统一走运行时解析（与 @/utils/emoji 的 renderEmoji 保持一致）
import { getFullUrl } from '@/utils/runtimeConfig'

const md = new MarkdownIt({
  html: false,
  linkify: true,
  breaks: true,
  highlight(str, lang) {
    if (lang && hljs.getLanguage(lang)) {
      try {
        return `<pre class="hljs"><code>${
          hljs.highlight(str, { language: lang, ignoreIllegals: true }).value
        }</code></pre>`
      } catch (e) {}
    }
    return `<pre class="hljs"><code>${md.utils.escapeHtml(str)}</code></pre>`
  }
})

// 自定义链接默认在新窗口打开
const defaultLinkOpen = md.renderer.rules.link_open || function (tokens, idx, options, env, self) {
  return self.renderToken(tokens, idx, options)
}
md.renderer.rules.link_open = function (tokens, idx, options, env, self) {
  const token = tokens[idx]
  const hrefIndex = token.attrIndex('href')
  if (hrefIndex >= 0) {
    const href = token.attrs[hrefIndex][1]
    if (href.startsWith('http')) {
      token.attrSet('target', '_blank')
      token.attrSet('rel', 'noopener noreferrer')
    }
  }
  return defaultLinkOpen(tokens, idx, options, env, self)
}

/**
 * 行内表情：[emoji:表情链接] -> <img class="inline-emoji">
 *
 * 与主题其它页面（动态 / 评论 / 通知）的 renderEmoji 使用同一存储规范，
 * 这样文章正文、独立页面、编辑器预览里的表情也能正常显示，
 * 而不是把 [emoji:https://...] 原样当文本输出。
 */
const EMOJI_RE = /^\[emoji:\s*([^\]\s]+)\s*\]/

md.inline.ruler.before('link', 'emoji', function (state, silent) {
  const match = EMOJI_RE.exec(state.src.slice(state.pos))
  if (!match) return false

  if (!silent) {
    const token = state.push('emoji', 'img', 0)
    token.attrSet('src', getFullUrl(match[1]))
  }
  state.pos += match[0].length
  return true
})

md.renderer.rules.emoji = function (tokens, idx) {
  const src = md.utils.escapeHtml(tokens[idx].attrGet('src') || '')
  if (!src) return ''
  // class="inline-emoji" 由全局样式统一尺寸（styles.css）
  return `<img src="${src}" alt="emoji" class="inline-emoji" loading="lazy" decoding="async">`
}

export const renderMarkdown = (content) => {
  if (!content) return ''
  return md.render(content)
}
