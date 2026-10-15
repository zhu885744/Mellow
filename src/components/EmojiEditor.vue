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

    <!-- # 话题选择面板（候选来自 topics/candidates，需登录） -->
    <MentionPicker
      v-if="topicOpen"
      ref="topicRef"
      :items="topicItems"
      name-key="name"
      title="选择话题"
      empty-text="还没有话题，先写一个 #话题# 试试"
      keyword-empty-text="没有匹配的话题"
      :keyword="topicKeyword"
      :position="topicPosition"
      :loading="topicLoading"
      @select="applyTopic"
    />
  </div>
</template>

<script setup>
import { ref, watch, onMounted, nextTick } from 'vue'
import EmojiPicker from './EmojiPicker.vue'
import MentionPicker from './MentionPicker.vue'
import { getTopicCandidates } from '@/api/topics'
import { escapeHtml, safeEmojiUrl } from '@/utils/emoji'

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
//
// ⚠ 安全：结果会被赋给编辑器的 innerHTML，而正文是用户输入（动态正文后端没有 XSS 过滤）。
// 必须**先整体转义**再替换表情 —— 否则打开（或在后台编辑）一条含
// `<img src=x onerror=...>` 的动态就会执行脚本，管理员编辑别人的动态等于被提权。
function contentToHtml(content) {
  if (!content) return ''
  let html = escapeHtml(String(content))
  html = html.replace(/\[emoji:\s*([^\]]+)\]/g, (match, url) => {
    // 与 renderEmoji 共用同一个地址白名单（http(s) / 站内相对路径 + 已转义）
    const safe = safeEmojiUrl(url)
    if (!safe) return match
    return `<img src="${safe}" data-emoji="${safe}" class="editor-emoji" style="width:24px;height:24px;vertical-align:middle;display:inline-block;object-fit:contain;margin:0 2px;">`
  })
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
  syncPickerState()
}

/* ---------------- @ 提及 / # 话题 候选面板 ---------------- */

const mentionRef = ref(null)
const mentionOpen = ref(false)
const mentionKeyword = ref('')
const mentionPosition = ref({ left: 0, top: 0, flipTo: null })

const topicRef = ref(null)
const topicOpen = ref(false)
const topicKeyword = ref('')
const topicPosition = ref({ left: 0, top: 0, flipTo: null })
const topicItems = ref([])
const topicLoading = ref(false)

// @ 提及：@ 前必须是行首或空白，避免把邮箱 a@b.com 当提及
const MENTION_RE = /(?:^|\s)@([^\s@]{0,32})$/
// # 话题：不加左边界（中文里「文字#话题」很常见），关键词里不允许再出现 # 与空白
const TOPIC_RE = /#([^#\s@]{0,32})$/

/**
 * 光标位置 → 面板坐标（视口坐标）
 *
 * MentionPicker 是 position: fixed，直接取光标矩形即可，不做「相对容器」的换算 ——
 * 那种算法要扣除编辑器内边距与祖先偏移，容器层级一变就会整体错位。
 * 下方空间不足（面板最高 236 + 间距）时改为向上展开。
 */
function caretPanelPosition(range) {
  const rects = range.getClientRects()
  const caret = rects.length ? rects[rects.length - 1] : range.getBoundingClientRect()

  const gap = 6
  const below = caret.bottom + gap

  return {
    left: caret.left,
    top: below,
    flipTo: below + 246 > window.innerHeight ? caret.top - gap : null
  }
}

/** 取回话题候选（懒加载：第一次输入 # 时才请求；接口需要登录，失败就退化为空列表） */
async function ensureTopicItems() {
  if (topicItems.value.length || topicLoading.value) return
  topicLoading.value = true
  try {
    const res = await getTopicCandidates({ limit: 200 })
    topicItems.value = res?.data || []
  } catch {
    topicItems.value = []
  } finally {
    topicLoading.value = false
  }
}

/**
 * 按光标前的文本决定开哪个候选面板
 *
 * - 「@关键词」→ @提及（只匹配已关注的人，见 app/model/mention.go）
 * - 「#关键词」→ 话题（保存时规范化成 #[话题名](/topic/12)，不存在的话题自动创建）
 *
 * 两者同时命中时（如 "@a#b"）取离光标更近的触发符，避免两个面板打架。
 */
function syncPickerState() {
  const editor = editorRef.value
  const selection = window.getSelection()

  const close = () => {
    mentionOpen.value = false
    topicOpen.value = false
  }

  if (!editor || !selection || selection.rangeCount === 0) {
    close()
    return
  }

  const range = selection.getRangeAt(0)
  const node = range.startContainer

  if (!range.collapsed || !editor.contains(node) || node.nodeType !== Node.TEXT_NODE) {
    close()
    return
  }

  const before = node.textContent.slice(0, range.startOffset)
  const mention = before.match(MENTION_RE)
  const topic = before.match(TOPIC_RE)

  if (topic && (!mention || before.lastIndexOf('#') > before.lastIndexOf('@'))) {
    mentionOpen.value = false
    topicKeyword.value = topic[1]
    topicOpen.value = true
    topicPosition.value = caretPanelPosition(range)
    ensureTopicItems()
    return
  }

  topicOpen.value = false

  if (!mention) {
    mentionOpen.value = false
    return
  }

  mentionKeyword.value = mention[1]
  mentionOpen.value = true
  mentionPosition.value = caretPanelPosition(range)
}

// 上/下键移动、回车选中、Esc 关闭（焦点在 contenteditable 里，事件不会落到面板上，所以在这里转发）
// 同一时刻只会有一个候选面板（见 syncPickerState）
function onKeydown(event) {
  if (!mentionOpen.value && !topicOpen.value) return

  const picker = topicOpen.value ? topicRef.value : mentionRef.value
  if (!picker) return

  if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
    event.preventDefault()
    picker.move(event.key === 'ArrowDown' ? 1 : -1)
    return
  }

  if (event.key === 'Enter') {
    if (picker.selectActive()) event.preventDefault()
    return
  }

  if (event.key === 'Escape') {
    event.preventDefault()
    mentionOpen.value = false
    topicOpen.value = false
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
  syncPickerState()
  onInput()
}

// 选中话题候选：把已输入的「#关键词」替换成 #话题名#（后端保存时会规范化成链接）
function applyTopic(topic) {
  const keyword = topicKeyword.value
  topicOpen.value = false

  const editor = editorRef.value
  if (!editor || !topic?.name) return

  editor.focus()
  const selection = window.getSelection()
  if (!selection || selection.rangeCount === 0) return

  const range = selection.getRangeAt(0)
  const node = range.startContainer

  // 先把「#关键词」整段选中，下面的 execCommand 会用 #话题名# 覆盖它
  if (node.nodeType === Node.TEXT_NODE) {
    const start = Math.max(0, range.startOffset - keyword.length - 1)
    const replaceRange = document.createRange()
    replaceRange.setStart(node, start)
    replaceRange.setEnd(node, range.startOffset)
    selection.removeAllRanges()
    selection.addRange(replaceRange)
  }

  document.execCommand('insertText', false, `#${topic.name}# `)
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
/**
 * 在光标处插入一个「#」并弹出话题候选面板
 *
 * 选中候选后会补全成 #话题名#，后端保存时规范化成 #[话题名](/topic/12)（见 app/model/topics.go）；
 * 也可以不用面板，直接手写 #话题#。
 */
function insertTopic() {
  const editor = editorRef.value
  if (!editor) return

  editor.focus()
  // execCommand 插入纯文本：会正常触发 input 事件与撤销栈，和 @提及 的做法一致
  document.execCommand('insertText', false, '#')
  // onInput 里会走 syncPickerState，光标前是「#」时自动弹出候选面板
  onInput()
}

defineExpose({ clear, focus: () => editorRef.value?.focus(), openEmoji: togglePicker, insertTopic })
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
