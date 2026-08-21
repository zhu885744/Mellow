<template>
  <div class="emoji-editor">
    <!-- 富文本输入框（contenteditable） -->
    <div
      ref="editorRef"
      class="editor-content"
      :class="{ 'is-empty': !modelValue }"
      contenteditable="true"
      :data-placeholder="placeholder"
      @input="onInput"
      @blur="onInput"
    ></div>

    <!-- 工具栏 -->
    <div class="editor-toolbar">
      <button
        type="button"
        class="emoji-btn"
        :class="{ active: showPicker }"
        @click="togglePicker"
        title="插入表情"
      >😊 表情</button>
      <slot name="extra" />
    </div>

    <!-- 表情选择面板 -->
    <EmojiPicker
      v-if="showPicker"
      v-model="showPicker"
      @select="insertEmoji"
    />
  </div>
</template>

<script setup>
import { ref, watch, onMounted, nextTick } from 'vue'
import EmojiPicker from './EmojiPicker.vue'

const props = defineProps({
  modelValue: { type: String, default: '' },
  placeholder: { type: String, default: '说点什么吧...' }
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

defineExpose({ clear, focus: () => editorRef.value?.focus() })
</script>

<style scoped>
.emoji-editor {
  width: 100%;
  position: relative;
}
.editor-content {
  min-height: 100px;
  max-height: 300px;
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
.editor-content:focus {
  border-color: var(--primary);
  box-shadow: 0 0 0 3px rgba(184, 153, 104, 0.12);
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
.emoji-btn {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 5px 12px;
  font-size: 13px;
  border-radius: var(--radius-sm);
  background: var(--bg-muted);
  border: 1px solid var(--border);
  color: var(--text-soft);
  cursor: pointer;
  transition: all 0.2s;
}
.emoji-btn:hover,
.emoji-btn.active {
  color: var(--primary);
  border-color: var(--primary);
  background: rgba(184, 153, 104, 0.08);
}
</style>
