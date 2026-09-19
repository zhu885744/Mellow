<template>
  <div class="md-editor" :class="{ 'is-fullscreen': fullscreen }">
    <!-- 工具栏 -->
    <div class="md-toolbar">
      <!-- 表情 -->
      <div class="md-emoji-wrap">
        <button type="button" class="md-tool" title="插入表情" @mousedown.prevent @click="toggleEmoji">
          <i class="bi bi-emoji-smile" />
        </button>
        <EmojiPicker v-if="showEmoji" v-model="showEmoji" @select="insertEmoji" />
      </div>

      <!-- 上传图片 -->
      <button
        type="button"
        class="md-tool"
        title="上传图片"
        :disabled="uploading"
        @mousedown.prevent
        @click="pickImage"
      >
        <i :class="uploading ? 'bi bi-arrow-repeat md-spin' : 'bi bi-image'" />
      </button>

      <span class="md-toolbar__split" />

      <button
        v-for="tool in tools"
        :key="tool.key"
        type="button"
        class="md-tool"
        :title="tool.title"
        @mousedown.prevent
        @click="runTool(tool.apply)"
      >
        <i v-if="tool.icon" :class="tool.icon" />
        <span v-else class="md-tool__text">{{ tool.text }}</span>
      </button>

      <span class="md-toolbar__flex" />

      <!-- 全屏编辑 -->
      <button
        type="button"
        class="md-tool"
        :class="{ 'is-active': fullscreen }"
        :title="fullscreen ? '退出全屏 (Esc)' : '全屏编辑'"
        @mousedown.prevent
        @click="toggleFullscreen"
      >
        <i :class="fullscreen ? 'bi bi-fullscreen-exit' : 'bi bi-arrows-fullscreen'" />
      </button>

      <!-- 预览 / 继续编辑 -->
      <button
        type="button"
        class="md-tool"
        :class="{ 'is-active': mode === 'preview' }"
        :title="mode === 'preview' ? '继续编辑' : '预览'"
        @click="toggleMode"
      >
        <i :class="mode === 'preview' ? 'bi bi-pencil-square' : 'bi bi-eye'" />
      </button>
    </div>

    <!-- 正文 -->
    <div class="md-body">
      <!-- 源码编辑（[emoji:url] 与 ![alt](url) 直接渲染为图片） -->
      <div
        v-show="mode === 'write'"
        ref="editorRef"
        class="md-content"
        :class="{ 'is-empty': !modelValue }"
        contenteditable="true"
        spellcheck="false"
        :data-placeholder="placeholder"
        :style="{ minHeight: fullscreen ? '0px' : minHeight }"
        @input="onInput"
        @keydown="onKeydown"
        @paste="onPaste"
        @dragover.prevent
        @drop.prevent="onDrop"
      />

      <div
        v-show="mode === 'preview'"
        class="md-preview markdown-body"
        :style="{ minHeight: fullscreen ? '0px' : minHeight }"
        v-html="html"
      />

      <!-- 字数（右下角，与参考设计一致） -->
      <span class="md-count" :class="{ over: count > maxLength }">
        {{ count }}<em>/{{ maxLength }}</em>
      </span>
    </div>

    <!-- 全屏底部状态条（全屏时父级操作栏被遮住，这里留出退出口） -->
    <div v-if="fullscreen" class="md-fullscreen-foot">
      <span class="md-fullscreen-tip">
        <i class="bi bi-keyboard" aria-hidden="true" />
        Ctrl + S 保存 · Esc 退出全屏
      </span>
      <button type="button" class="btn btn-sm" @click="toggleFullscreen">退出全屏</button>
    </div>

    <input ref="fileRef" type="file" accept="image/*" hidden @change="onFileChange" />
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onUnmounted, nextTick } from 'vue'
import EmojiPicker from './EmojiPicker.vue'
import { renderMarkdown } from '@/utils/markdown'
import { getFullUrl } from '@/utils/runtimeConfig'
import { uploadArticleImage } from '@/api/article'
import { toast } from '@/utils/toast'
import {
  sourceToHtml,
  serializeEditor,
  rangeFromOffsets,
  offsetOfPoint,
  wrapText,
  prefixLines,
  insertTextAt,
  codeBlockText,
  linkText,
  tableText,
  blockMarkerText,
  TAIL_MARKER_RE,
  HAS_MARKER_RE
} from '@/utils/markdownEdit'

const props = defineProps({
  modelValue: { type: String, default: '' },
  placeholder: { type: String, default: '来说点什么吧...' },
  minHeight: { type: String, default: '420px' },
  // 字数展示上限（仅用于右下角计数展示，不做硬性截断）
  maxLength: { type: Number, default: 5000 }
})

const emit = defineEmits(['update:modelValue', 'save'])

const editorRef = ref(null)
const fileRef = ref(null)
const mode = ref('write')
const uploading = ref(false)
const showEmoji = ref(false)
const fullscreen = ref(false)

const html = computed(() => renderMarkdown(props.modelValue))
const count = computed(() => (props.modelValue || '').replace(/\s/g, '').length)

const tools = [
  { key: 'bold', title: '加粗 (Ctrl+B)', icon: 'bi bi-type-bold', apply: (v, s, e) => wrapText(v, s, e, '**', '**', '加粗文字') },
  { key: 'italic', title: '斜体 (Ctrl+I)', icon: 'bi bi-type-italic', apply: (v, s, e) => wrapText(v, s, e, '*', '*', '斜体文字') },
  { key: 'strike', title: '删除线', icon: 'bi bi-type-strikethrough', apply: (v, s, e) => wrapText(v, s, e, '~~', '~~', '删除线') },
  { key: 'h2', title: '二级标题', text: 'H2', apply: (v, s, e) => prefixLines(v, s, e, '## ') },
  { key: 'h3', title: '三级标题', text: 'H3', apply: (v, s, e) => prefixLines(v, s, e, '### ') },
  { key: 'quote', title: '引用', icon: 'bi bi-quote', apply: (v, s, e) => prefixLines(v, s, e, '> ') },
  { key: 'ul', title: '无序列表', icon: 'bi bi-list-ul', apply: (v, s, e) => prefixLines(v, s, e, '- ') },
  { key: 'ol', title: '有序列表', icon: 'bi bi-list-ol', apply: (v, s, e) => prefixLines(v, s, e, '1. ') },
  { key: 'code', title: '行内代码', icon: 'bi bi-code', apply: (v, s, e) => wrapText(v, s, e, '`', '`', 'code') },
  { key: 'block', title: '代码块', icon: 'bi bi-code-square', apply: codeBlockText },
  { key: 'hr', title: '分割线', icon: 'bi bi-dash-lg', apply: (v, s, e) => insertTextAt(v, s, e, '\n\n---\n\n') },
  { key: 'link', title: '链接', icon: 'bi bi-link-45deg', apply: linkText },
  { key: 'table', title: '表格', icon: 'bi bi-table', apply: tableText }
]

// ===== 源码 <-> DOM =====

/** 用源码重建编辑器内容（不动光标） */
function renderFrom(value) {
  if (!editorRef.value) return
  editorRef.value.innerHTML = sourceToHtml(value || '', getFullUrl)
}

/** 读取当前 DOM 的源码，并同步给父组件 */
function syncFromDom() {
  if (!editorRef.value) return ''
  const { text } = serializeEditor(editorRef.value)
  emitModel(text)
  return text
}

function emitModel(value) {
  lastValue = value
  emit('update:modelValue', value)
}

/** 应用一次源码变更，并还原光标 / 选区 */
function applySource(value, selStart, selEnd = selStart) {
  const root = editorRef.value
  if (!root) return
  renderFrom(value)
  emitModel(value)
  nextTick(() => {
    root.focus()
    const { points } = serializeEditor(root)
    const range = rangeFromOffsets(root, points, selStart, selEnd)
    const selection = window.getSelection()
    if (!selection) return
    selection.removeAllRanges()
    selection.addRange(range)
  })
}

/** 当前选区的源码偏移 */
function currentOffsets() {
  const root = editorRef.value
  const selection = window.getSelection()
  if (!root || !selection || !selection.rangeCount) return null
  const range = selection.getRangeAt(0)
  const start = offsetOfPoint(root, range.startContainer, range.startOffset)
  const end = offsetOfPoint(root, range.endContainer, range.endOffset)
  if (start === null || end === null) return null
  return { start, end }
}

// ===== 输入 =====
let lastValue = ''

function onInput(e) {
  const root = editorRef.value
  if (!root) return
  const { text } = serializeEditor(root)
  emitModel(text)

  // 手动敲出完整标记（] 或 ) 收尾）时，即时渲染成图片，边写边看
  const data = e?.data || ''
  if (!e?.isComposing && (data === ']' || data === ')' || data === '）')) {
    nextTick(renderCompletedMarker)
  }
}

function renderCompletedMarker() {
  const root = editorRef.value
  if (!root) return
  const offsets = currentOffsets()
  if (!offsets) return
  const { text } = serializeEditor(root)
  const before = text.slice(0, offsets.start)
  const matched = before.match(TAIL_MARKER_RE)
  if (!matched) return
  // 文本不变，但重建一次 DOM 即可把刚输入的标记变成图片
  applySource(text, offsets.end)
}

/** 外部（加载 / 重置）变更内容时重建编辑器 */
watch(
  () => props.modelValue,
  (val) => {
    const next = val || ''
    if (next === lastValue) return
    if (editorRef.value && next === serializeEditor(editorRef.value).text) return
    renderFrom(next)
    lastValue = next
  }
)

onMounted(() => {
  window.addEventListener('keydown', onWindowKeydown)
  nextTick(() => {
    renderFrom(props.modelValue)
    lastValue = props.modelValue || ''
  })
})

onUnmounted(() => {
  window.removeEventListener('keydown', onWindowKeydown)
  restoreBodyOverflow()
})

function onPaste(e) {
  e.preventDefault()
  const text = e.clipboardData?.getData('text/plain') || ''
  if (!text) return
  document.execCommand('insertText', false, text)
  nextTick(() => {
    const value = syncFromDom()
    if (!HAS_MARKER_RE.test(value)) return
    // 粘贴内容里含标记时统一重建一次，直接显示图片 / 表情
    const offsets = currentOffsets()
    if (offsets) applySource(value, offsets.end)
  })
}

function onKeydown(e) {
  const mod = e.ctrlKey || e.metaKey
  const key = e.key.toLowerCase()
  if (mod && key === 's') {
    e.preventDefault()
    emit('save')
    return
  }
  // 光标紧邻图片时，退格 / 删除整体移除该图片（原子节点）
  if ((e.key === 'Backspace' || e.key === 'Delete') && removeAdjacentImage(e.key)) {
    e.preventDefault()
    return
  }
  if (mod && key === 'b') {
    e.preventDefault()
    runTool((v, s, en) => wrapText(v, s, en, '**', '**', '加粗文字'))
    return
  }
  if (mod && key === 'i') {
    e.preventDefault()
    runTool((v, s, en) => wrapText(v, s, en, '*', '*', '斜体文字'))
    return
  }
  // Tab 缩进
  if (e.key === 'Tab') {
    e.preventDefault()
    document.execCommand('insertText', false, '  ')
    syncFromDom()
  }
}

// ===== 工具栏 =====
function runTool(apply) {
  if (mode.value === 'preview') mode.value = 'write'
  nextTick(() => {
    const root = editorRef.value
    if (!root) return
    root.focus()
    const { text } = serializeEditor(root)
    const offsets = currentOffsets() || { start: text.length, end: text.length }
    const result = apply(text, offsets.start, offsets.end)
    if (!result) return
    applySource(result.value, result.selStart, result.selEnd)
  })
}

function toggleMode() {
  mode.value = mode.value === 'write' ? 'preview' : 'write'
  if (mode.value === 'write') {
    nextTick(() => editorRef.value?.focus())
  }
}

// ===== 全屏编辑 =====
let bodyOverflow = ''

function toggleFullscreen() {
  fullscreen.value = !fullscreen.value
  if (fullscreen.value) {
    // 锁住页面滚动，避免全屏时背景跟着滚
    bodyOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    nextTick(() => editorRef.value?.focus())
  } else {
    restoreBodyOverflow()
  }
}

function restoreBodyOverflow() {
  document.body.style.overflow = bodyOverflow || ''
}

function onWindowKeydown(e) {
  if (e.key !== 'Escape' || !fullscreen.value) return
  // 表情面板打开时先关面板，再按一次才退出全屏
  if (showEmoji.value) return
  e.preventDefault()
  toggleFullscreen()
}

// ===== 表情 =====
function toggleEmoji() {
  showEmoji.value = !showEmoji.value
}

function insertEmoji(emoji) {
  const text = String(emoji || '')
  if (!text) return
  // 存储格式 [emoji:url]（或原生 emoji 字符）直接插入，插入后即时渲染
  if (mode.value === 'preview') mode.value = 'write'
  nextTick(() => insertMarker(text))
}

// ===== 插入 =====
/** 在光标处插入一段源码并即时渲染（图片会独占一行） */
function insertMarker(marker, block = false) {
  if (mode.value === 'preview') mode.value = 'write'
  nextTick(() => {
    const root = editorRef.value
    if (!root) return
    root.focus()
    const { text } = serializeEditor(root)
    const offsets = currentOffsets() || { start: text.length, end: text.length }
    const result = block
      ? blockMarkerText(text, offsets.start, offsets.end, marker)
      : insertTextAt(text, offsets.start, offsets.end, marker)
    applySource(result.value, result.selStart, result.selEnd)
  })
}

// ===== 图片上传 =====
function pickImage() {
  fileRef.value?.click()
}

function onFileChange(e) {
  const file = e.target.files?.[0]
  e.target.value = ''
  if (file) uploadAndInsert(file)
}

async function uploadAndInsert(file) {
  if (!file.type.startsWith('image/')) {
    toast.warning('请选择图片文件')
    return
  }
  if (file.size > 10 * 1024 * 1024) {
    toast.warning('图片不能超过 10MB')
    return
  }
  uploading.value = true
  try {
    const fd = new FormData()
    fd.append('files', file)
    const res = await uploadArticleImage(fd)
    const url = res.data?.results?.[0]?.full_url || res.data?.results?.[0]?.url || ''
    if (!url) throw new Error('empty')
    insertMarker(`![${file.name}](${url})`, true)
    toast.success('图片已插入')
  } catch {
    toast.error('图片上传失败，请稍后重试')
  } finally {
    uploading.value = false
  }
}

const isImageNode = (el) =>
  !!el && el.nodeType === 1 && (el.tagName === 'IMG' || (el.tagName === 'SPAN' && el.hasAttribute('data-md-src')))

/** 删除光标紧邻的图片原子，返回是否已处理 */
function removeAdjacentImage(key) {
  const root = editorRef.value
  const selection = window.getSelection()
  if (!root || !selection || !selection.rangeCount) return false
  const range = selection.getRangeAt(0)
  if (!range.collapsed) return false

  const node = range.startContainer
  const offset = range.startOffset
  let target = null
  if (node.nodeType === 1) {
    const children = Array.from(node.childNodes)
    target = key === 'Backspace' ? children[offset - 1] : children[offset]
  } else if (node.nodeType === 3) {
    if (key === 'Backspace' && offset === 0) target = node.previousSibling
    if (key === 'Delete' && offset === node.data.length) target = node.nextSibling
  }
  if (!isImageNode(target)) return false

  const parent = target.parentNode
  const at = offsetOfPoint(root, parent, Array.prototype.indexOf.call(parent.childNodes, target))
  target.remove()
  const { text } = serializeEditor(root)
  applySource(text, at === null ? text.length : at)
  return true
}

/** 拖拽图片到编辑器直接上传 */
function onDrop(e) {
  const file = Array.from(e.dataTransfer?.files || []).find((f) => f.type.startsWith('image/'))
  if (file) uploadAndInsert(file)
}

defineExpose({ focus: () => editorRef.value?.focus() })
</script>

<style scoped>
.md-editor {
  background: transparent;
  overflow: hidden;
}

/* ---------- 工具栏 ---------- */
.md-toolbar {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 2px;
  padding: 8px 10px;
  border-top: 1px solid var(--border-soft);
  border-bottom: 1px solid var(--border-soft);
}
.md-emoji-wrap {
  position: relative;
  display: inline-flex;
}
.md-tool {
  min-width: 30px;
  height: 30px;
  padding: 0 6px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 15px;
  border: none;
  border-radius: var(--radius-sm);
  background: transparent;
  color: var(--text-soft);
  cursor: pointer;
  transition: background 0.15s, color 0.15s;
}
.md-tool:hover:not(:disabled) {
  background: var(--bg-muted);
  color: var(--primary);
}
.md-tool:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.md-tool.is-active {
  background: var(--accent-soft);
  color: var(--primary-deep);
}
.md-tool__text {
  font-size: 12px;
  font-weight: 600;
  letter-spacing: -0.2px;
}
.md-toolbar__split {
  width: 1px;
  height: 16px;
  margin: 0 4px;
  background: var(--border);
}
.md-toolbar__flex {
  flex: 1;
  min-width: 8px;
}

/* ---------- 正文 ---------- */
.md-body {
  position: relative;
}
.md-content {
  display: block;
  width: 100%;
  padding: 16px 18px 40px;
  outline: none;
  min-height: 420px;
  color: var(--text);
  font-size: 15px;
  line-height: 1.9;
  font-family: var(--font-sans);
  /* 保留多个空格 / 空格缩进 */
  white-space: pre-wrap;
  word-break: break-word;
  overflow-wrap: anywhere;
  cursor: text;
}
.md-content.is-empty::before {
  content: attr(data-placeholder);
  color: var(--text-light);
  pointer-events: none;
}
.md-preview {
  padding: 16px 18px 40px;
  overflow-y: auto;
  max-height: 620px;
}

/* ---------- 行内表情 / 图片（innerHTML 注入，需 deep） ---------- */
.md-content :deep(.editor-emoji) {
  width: 24px;
  height: 24px;
  vertical-align: middle;
  display: inline-block;
  object-fit: contain;
  margin: 0 2px;
  border-radius: 4px;
}
.md-content :deep(.md-image) {
  display: inline-block;
  max-width: 100%;
  margin: 8px 0;
  padding: 0;
  border: 1px solid var(--border-soft);
  border-radius: var(--radius);
  background: var(--bg-muted);
  overflow: hidden;
  vertical-align: bottom;
  cursor: default;
}
.md-content :deep(.md-image img) {
  display: block;
  max-width: 100%;
  max-height: 460px;
  object-fit: contain;
  margin: 0 auto;
}
.md-content :deep(.md-image__alt) {
  display: block;
  padding: 4px 10px 6px;
  font-size: 12px;
  line-height: 1.6;
  color: var(--text-muted);
  text-align: center;
  background: var(--bg-card);
}

/* 右下角字数统计 */
.md-count {
  position: absolute;
  right: 14px;
  bottom: 10px;
  font-size: 12px;
  color: var(--text-muted);
  font-variant-numeric: tabular-nums;
  pointer-events: none;
  user-select: none;
}
.md-count em {
  font-style: normal;
  color: var(--text-light);
}
.md-count.over {
  color: var(--danger);
}
.md-count.over em {
  color: var(--danger);
}

/* ---------- 全屏编辑 ---------- */
.md-editor.is-fullscreen {
  position: fixed;
  inset: 0;
  /* 盖住页面布局（200）与悬浮按钮（999）、搜索（1060），低于各类弹窗（3000+） */
  z-index: 2000;
  display: flex;
  flex-direction: column;
  background: var(--bg);
  animation: mdFullscreenIn var(--dur) var(--ease);
}
.md-editor.is-fullscreen .md-toolbar {
  flex: 0 0 auto;
  padding: 8px 18px;
  background: var(--bg-card);
  border-top: none;
}
.md-editor.is-fullscreen .md-body {
  flex: 1 1 auto;
  min-height: 0;
  display: flex;
  flex-direction: column;
}
.md-editor.is-fullscreen .md-content,
.md-editor.is-fullscreen .md-preview {
  flex: 1 1 auto;
  min-height: 0;
  max-height: none;
  width: 100%;
  max-width: 880px;
  margin: 0 auto;
  overflow-y: auto;
  padding: 24px 24px 72px;
}
.md-editor.is-fullscreen .md-count {
  right: 20px;
  bottom: 14px;
}
.md-fullscreen-foot {
  flex: 0 0 auto;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 8px 18px;
  background: var(--bg-card);
  border-top: 1px solid var(--border-soft);
}
.md-fullscreen-tip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: var(--text-muted);
}

@keyframes mdFullscreenIn {
  from {
    opacity: 0;
    transform: translateY(6px);
  }
  to {
    opacity: 1;
    transform: none;
  }
}

.md-spin {
  display: inline-block;
  animation: mdSpin 0.8s linear infinite;
}
@keyframes mdSpin {
  to {
    transform: rotate(360deg);
  }
}

@media (max-width: 768px) {
  .md-toolbar {
    flex-wrap: nowrap;
    overflow-x: auto;
    scrollbar-width: none;
  }
  .md-toolbar::-webkit-scrollbar {
    display: none;
  }
  .md-tool,
  .md-toolbar__split {
    flex-shrink: 0;
  }
  .md-toolbar__flex {
    display: none;
  }
  .md-content,
  .md-preview {
    font-size: 14px;
    padding-left: 14px;
    padding-right: 14px;
  }
}
</style>
