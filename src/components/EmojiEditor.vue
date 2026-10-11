<template>
  <div class="emoji-editor">
    <!-- 富文本输入框（contenteditable） -->
    <!-- 输入区 + 工具栏放同一个相对定位容器里：
         工具栏的 absolute 锚点必须是「输入区」，不能是整个 .emoji-editor ——
         内联展开表情面板后 .emoji-editor 会包含面板，工具栏就会浮到面板上把表情挡住 -->
    <div class="emoji-editor__field">
      <div
        ref="editorRef"
        class="editor-content"
        :class="{ 'is-empty': !modelValue, 'no-toolbar': hideToolbar }"
        contenteditable="true"
        :data-placeholder="placeholder"
        :style="{ maxHeight }"
        @input="onInput"
        @blur="onInput"
        @keydown="onKeydown"
      ></div>

      <!-- 工具栏（浮于输入区底部，输入区已用 padding-bottom 为它留位）
           hideToolbar：调用方要自己画工具栏时（如发布动态的图标工具栏）隐藏它,
           并同时去掉输入区下方那 40px 的留白 -->
      <div v-if="!hideToolbar" class="editor-toolbar">
        <button
          type="button"
          class="btn btn-secondary btn-sm"
          :class="{ 'is-active': showPicker }"
          @click="togglePicker"
          title="插入表情"
        >😊 表情</button>
        <slot name="extra" />
      </div>
    </div>

    <!-- 表情选择面板 -->
    <EmojiPicker
      v-if="showPicker"
      v-model="showPicker"
      :inline="inlinePicker"
      @select="insertEmoji"
    />

    <!-- @ 用户选择面板（候选只含「我关注的人」，见 api/mention.js） -->
    <MentionPicker
      v-if="mentionOpen"
      ref="mentionRef"
      :keyword="mentionKeyword"
      :position="mentionPosition"
      @select="applyMention"
    />
  </div>
</template>

<script setup>
import { ref, watch, onMounted, nextTick } from 'vue'
import EmojiPicker from './EmojiPicker.vue'
import MentionPicker from './MentionPicker.vue'

const props = defineProps({
  modelValue: { type: String, default: '' },
  placeholder: { type: String, default: '说点什么吧...' },
  // 内联表情面板（弹窗等需要自适应高度的场景设为 true）
  inlinePicker: { type: Boolean, default: false },
  // 输入区最大高度：默认与评论框一致（超过就在编辑器内滚动）。
  // 发布弹窗这类「容器随内容长高」的场景传 'none'，把滚动交给外层容器。
  maxHeight: { type: String, default: '300px' },
  // 隐藏内置工具栏（调用方自己画）：同时会把输入区底部为工具栏预留的 40px 去掉
  hideToolbar: { type: Boolean, default: false }
})

const emit = defineEmits(['update:modelValue'])

const editorRef = ref(null)
const showPicker = ref(false)

// 将存储格式内容转为 HTML（[emoji:url] -> img）
function contentToHtml(content) {
  if (!content) return ''
  let html = content
  html = html.replace(
    /\[emoji:(https?:\/\/[^\]]+|\/[^\]]+)\]/g,
    '<img src="$1" data-emoji="$1" class="editor-emoji" style="width:24px;height:24px;vertical-align:middle;display:inline-block;object-fit:contain;margin:0 2px;">'
  )
  html = html.replace(/\n/g, '<br>')
  return html
}

// 从 contenteditable 提取纯文本，emoji 图片转回 [emoji:url]
function getEditorContent(el) {
  if (!el) return ''
  const clone = el.cloneNode(true)
  const imgs = clone.querySelectorAll('img[data-emoji]')
  imgs.forEach((img) => {
    const url = img.getAttribute('data-emoji') || img.src || ''
    const textNode = document.createTextNode(`[emoji:${url}]`)
    img.parentNode.replaceChild(textNode, img)
  })
  return clone.innerText.replace(/\u00a0/g, ' ').trim()
}

function onInput() {
  const text = getEditorContent(editorRef.value)
  emit('update:modelValue', text)
  syncMentionState()
}

/* ---------------- @ 提及 ---------------- */

const mentionRef = ref(null)
const mentionOpen = ref(false)
const mentionKeyword = ref('')
const mentionPosition = ref({ left: 0, top: 0, flipTo: null })

// 光标前是「@关键词」时打开候选面板（@ 前必须是行首或空白，避免把邮箱 a@b.com 当提及）。
// 插入的是纯文本 @昵称，后端保存时会规范化为 @[昵称](/author/uid)（见 app/model/mention.go）。
function syncMentionState() {
  const editor = editorRef.value
  const selection = window.getSelection()

  if (!editor || !selection || selection.rangeCount === 0) {
    mentionOpen.value = false
    return
  }

  const range = selection.getRangeAt(0)
  const node = range.startContainer

  if (!range.collapsed || !editor.contains(node) || node.nodeType !== Node.TEXT_NODE) {
    mentionOpen.value = false
    return
  }

  const before = node.textContent.slice(0, range.startOffset)
  const matched = before.match(/(?:^|\s)@([^\s@]{0,32})$/)

  if (!matched) {
    mentionOpen.value = false
    return
  }

  mentionKeyword.value = matched[1]
  mentionOpen.value = true

  // 面板用**视口坐标**（MentionPicker 是 position: fixed）：直接取光标矩形，
  // 不再做「相对容器」的换算 —— 那种算法要扣除编辑器内边距与祖先偏移，
  // 容器层级一变（例如外面多包一层）就会整体错位。
  // 下方空间不足（面板最高 236 + 间距）时改为向上展开。
  const rects = range.getClientRects()
  const caret = rects.length ? rects[rects.length - 1] : range.getBoundingClientRect()

  const gap = 6
  const below = caret.bottom + gap

  mentionPosition.value = {
    left: caret.left,
    top: below,
    flipTo: below + 246 > window.innerHeight ? caret.top - gap : null
  }
}

// 上/下键移动、回车选中、Esc 关闭（焦点在 contenteditable 里，事件不会落到面板上，所以在这里转发）
function onKeydown(event) {
  if (!mentionOpen.value) return

  if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
    event.preventDefault()
    mentionRef.value?.move(event.key === 'ArrowDown' ? 1 : -1)
    return
  }

  if (event.key === 'Enter') {
    if (mentionRef.value?.selectActive()) event.preventDefault()
    return
  }

  if (event.key === 'Escape') {
    event.preventDefault()
    mentionOpen.value = false
  }
}

// 选中候选：把已输入的 @关键词 替换成 @昵称 + 空格
function applyMention(user) {
  const keyword = mentionKeyword.value
  mentionOpen.value = false

  const editor = editorRef.value
  if (!editor || !user?.nickname) return

  editor.focus()
  const selection = window.getSelection()
  if (!selection || selection.rangeCount === 0) return

  const range = selection.getRangeAt(0)
  const node = range.startContainer

  // 先把「@关键词」整段选中，下面的 execCommand 会用 @昵称 覆盖它
  if (node.nodeType === Node.TEXT_NODE) {
    const start = Math.max(0, range.startOffset - keyword.length - 1)
    const replaceRange = document.createRange()
    replaceRange.setStart(node, start)
    replaceRange.setEnd(node, range.startOffset)
    selection.removeAllRanges()
    selection.addRange(replaceRange)
  }

  // execCommand 插入纯文本：会正常触发 input 事件与撤销栈，比手动拼 DOM 可靠
  document.execCommand('insertText', false, `@${user.nickname} `)
  syncMentionState()
  onInput()
}

// 在光标位置插入 HTML
function insertHTMLAtCursor(html) {
  const editor = editorRef.value
  if (!editor) return
  editor.focus()
  const selection = window.getSelection()
  if (!selection || selection.rangeCount === 0) {
    editor.innerHTML += html
    return
  }
  const range = selection.getRangeAt(0)
  range.deleteContents()
  const temp = document.createElement('div')
  temp.innerHTML = html
  const frag = document.createDocumentFragment()
  let lastNode = null
  while (temp.firstChild) {
    lastNode = temp.firstChild
    frag.appendChild(temp.firstChild)
  }
  range.insertNode(frag)
  if (lastNode) {
    range.setStartAfter(lastNode)
    range.collapse(true)
  }
  selection.removeAllRanges()
  selection.addRange(range)
}

// 插入表情
function insertEmoji(emoji) {
  if (emoji && emoji.startsWith('[emoji:')) {
    const url = emoji.slice(7, -1)
    const imgHtml = `<img src="${url}" data-emoji="${url}" class="editor-emoji" style="width:24px;height:24px;vertical-align:middle;display:inline-block;object-fit:contain;margin:0 2px;">&nbsp;`
    insertHTMLAtCursor(imgHtml)
  } else {
    insertHTMLAtCursor(emoji + ' ')
  }
  onInput()
}

function togglePicker() {
  showPicker.value = !showPicker.value
}

// 监听外部 modelValue 变化（如重置），同步编辑器内容
watch(
  () => props.modelValue,
  (val) => {
    if (editorRef.value) {
      const currentText = getEditorContent(editorRef.value)
      // 仅当内容不一致时更新，避免光标跳动
      if (val !== currentText) {
        editorRef.value.innerHTML = contentToHtml(val || '')
      }
    }
  }
)

onMounted(() => {
  nextTick(() => {
    if (editorRef.value) {
      editorRef.value.innerHTML = contentToHtml(props.modelValue || '')
    }
  })
})

// 暴露清空方法
function clear() {
  if (editorRef.value) editorRef.value.innerHTML = ''
  emit('update:modelValue', '')
}

// openEmoji：供外部工具栏（如发布动态的图标工具栏）调用 —— 开关表情面板
defineExpose({ clear, focus: () => editorRef.value?.focus(), openEmoji: togglePicker })
</script>

<style scoped>
.emoji-editor {
  width: 100%;
  position: relative;
}
/* 工具栏的定位基准：只包住输入区（不含下方的表情/@ 面板） */
.emoji-editor__field {
  position: relative;
}
.editor-content {
  min-height: 100px;
  /* 最大高度由 maxHeight 属性控制（内联样式）；默认 300px 与评论框一致，
     发布弹窗传 'none' 让输入区随内容长高 */
  overflow-y: auto;
  padding: 10px 12px 40px;
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  font-size: 14px;
  line-height: 1.7;
  color: var(--text);
  word-break: break-word;
  cursor: text;
  transition: border-color 0.2s, box-shadow 0.2s;
}
/* 外部自画工具栏时：去掉为浮动工具栏预留的底部留白 */
.editor-content.no-toolbar {
  padding-bottom: 10px;
}
.editor-content:focus {
  border-color: var(--primary);
  box-shadow: 0 0 0 3px var(--accent-ring);
  outline: none;
}
.editor-content.is-empty::before {
  content: attr(data-placeholder);
  color: var(--text-light);
  pointer-events: none;
}
.editor-toolbar {
  position: absolute;
  left: 12px;
  bottom: 8px;
  z-index: 1;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px 6px;
  background: var(--bg-card);
  border-radius: var(--radius-sm);
}

</style>
