import MarkdownIt from 'markdown-it'
// 按需引入 highlight.js：默认入口会把 190+ 种语言全部注册进 bundle（min 后 500KB+），
// 而正文页（文章 / 独立页）每次打开都要下载它。这里只注册博客实际会出现的语言，
// 未注册的语言会退化成不高亮的纯文本（不影响阅读），需要时在下面补一行即可。
import hljs from 'highlight.js/lib/core'
import bash from 'highlight.js/lib/languages/bash'
import c from 'highlight.js/lib/languages/c'
import cpp from 'highlight.js/lib/languages/cpp'
import csharp from 'highlight.js/lib/languages/csharp'
import css from 'highlight.js/lib/languages/css'
import diff from 'highlight.js/lib/languages/diff'
import dockerfile from 'highlight.js/lib/languages/dockerfile'
import go from 'highlight.js/lib/languages/go'
import ini from 'highlight.js/lib/languages/ini'
import java from 'highlight.js/lib/languages/java'
import javascript from 'highlight.js/lib/languages/javascript'
import json from 'highlight.js/lib/languages/json'
import less from 'highlight.js/lib/languages/less'
import markdown from 'highlight.js/lib/languages/markdown'
import nginx from 'highlight.js/lib/languages/nginx'
import php from 'highlight.js/lib/languages/php'
import plaintext from 'highlight.js/lib/languages/plaintext'
import python from 'highlight.js/lib/languages/python'
import rust from 'highlight.js/lib/languages/rust'
import scss from 'highlight.js/lib/languages/scss'
import shell from 'highlight.js/lib/languages/shell'
import sql from 'highlight.js/lib/languages/sql'
import typescript from 'highlight.js/lib/languages/typescript'
import xml from 'highlight.js/lib/languages/xml'
import yaml from 'highlight.js/lib/languages/yaml'
// 表情图片地址统一走运行时解析（与 @/utils/emoji 的 renderEmoji 保持一致）
import { getFullUrl } from '@/utils/runtimeConfig'

// 语言名 + 常见别名（同一份语法注册多次，兼容 ```js / ```javascript 等写法）
const HIGHLIGHT_LANGUAGES = {
  javascript, js: javascript, jsx: javascript, mjs: javascript, cjs: javascript, node: javascript,
  typescript, ts: typescript, tsx: typescript,
  json, jsonc: json,
  bash, sh: bash, zsh: bash,
  shell, console: shell,
  go, golang: go,
  python, py: python,
  java, kotlin: java,
  php,
  rust, rs: rust,
  c, cpp, 'c++': cpp, cc: cpp, h: c, hpp: cpp, csharp, cs: csharp,
  sql, mysql: sql,
  xml, html: xml, vue: xml, svg: xml,
  css, scss, less,
  yaml, yml: yaml,
  ini, toml: ini, conf: ini,
  markdown, md: markdown,
  diff, patch: diff,
  dockerfile, docker: dockerfile,
  nginx, conf_nginx: nginx,
  plaintext, text: plaintext, txt: plaintext
}

Object.entries(HIGHLIGHT_LANGUAGES).forEach(([name, language]) => {
  hljs.registerLanguage(name, language)
})

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
    // @ 提及：后端保存时把 @昵称 规范化为 @[昵称](/author/12)（见 app/model/mention.go），
    // 这里补一个 class，供主题样式与 main.js 的 SPA 点击拦截识别
    if (href.startsWith('/author/')) {
      token.attrSet('class', 'mention')
    }
    // 话题：后端保存时把 #话题# 规范化为 #[话题名](/topic/12)（见 app/model/topics.go），
    // 同样补 class，供主题样式与 SPA 点击拦截识别
    if (href.startsWith('/topic/')) {
      token.attrSet('class', 'hashtag')
    }
  }
  return defaultLinkOpen(tokens, idx, options, env, self)
}

// 正文图片（![alt](src)）：统一补懒加载 + 异步解码。
// 文章 / 独立页面 / 文档正文都是长文，一次性把所有配图都拉下来既慢又费流量。
const defaultImage = md.renderer.rules.image || function (tokens, idx, options, env, self) {
  return self.renderToken(tokens, idx, options)
}
md.renderer.rules.image = function (tokens, idx, options, env, self) {
  const token = tokens[idx]
  token.attrSet('loading', 'lazy')
  token.attrSet('decoding', 'async')
  return defaultImage(tokens, idx, options, env, self)
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
