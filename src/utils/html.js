// 富文本编辑器标识（值为这些时 content 按富文本 HTML 渲染）
const RICH_EDITORS = ['wangeditor', 'quill', 'tinymce', 'rich', 'richtext', 'rich-text', 'html']

// 判断某文章是否使用富文本编辑器（editor 字段来自 app/model/article.go）
export const isRichTextEditor = (editor) => {
  if (!editor) return false
  const e = String(editor).trim().toLowerCase()
  if (!e || e === 'vditor' || e === 'markdown' || e === 'md') return false
  return RICH_EDITORS.includes(e)
}

// 轻量 HTML 清洗：剥离脚本/iframe 等危险标签与事件属性，防 XSS。
// 纯浏览器 API 实现，无第三方依赖；保留常用富文本标签与内联样式。
export const sanitizeHtml = (html) => {
  if (!html) return ''
  const doc = new DOMParser().parseFromString(String(html), 'text/html')

  // 1. 移除危险标签
  const dangerous = doc.querySelectorAll(
    'script, style, frame, object, embed, link, meta, base, form, input, button, textarea, select'
  )
  dangerous.forEach((el) => el.remove())

  // 2. iframe 仅允许 https/http 的 src（视频嵌入），其余移除
  doc.querySelectorAll('iframe').forEach((el) => {
    const src = (el.getAttribute('src') || '').trim().toLowerCase()
    if (!/^https?:/.test(src)) el.remove()
  })

  // 3. 剥离事件属性、危险协议与 srcdoc
  doc.querySelectorAll('*').forEach((el) => {
    for (const attr of Array.from(el.attributes)) {
      const name = attr.name.toLowerCase()
      const value = (attr.value || '').trim().toLowerCase()
      if (
        name.startsWith('on') ||
        name === 'srcdoc' ||
        value.startsWith('javascript:') ||
        value.startsWith('data:text/html')
      ) {
        el.removeAttribute(attr.name)
      }
    }
  })

  return doc.body.innerHTML
}
