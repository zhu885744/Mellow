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

      <!-- @ 提及：候选只含「我关注的人」，插入纯文本 @昵称；保存时后端解析成链接并发通知 -->
      <div class="md-mention-wrap" style="position: relative">
        <button type="button" class="md-tool" title="@ 提及" @mousedown.prevent @click="toggleMention">
          <i class="bi bi-at" />
        </button>
        <MentionPicker
          v-if="mentionOpen"
          ref="mentionRef"
          :keyword="mentionKeyword"
          :position="mentionPosition"
          @select="applyMention"
        />
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

      <!-- 从附件库插入图片 -->
      <button
        type="button"
        class="md-tool"
        title="从附件库插入图片"
        @mousedown.prevent
        @click="showLibrary = true"
      >
        <i class="bi bi-folder2-open" />
      </button>

      <!-- 视频 / 音频 / 附件：从附件库选择，插入 @[video] / @[audio] / @[file] 短代码 -->
      <button
        type="button"
        class="md-tool"
        title="插入视频"
        @mousedown.prevent
        @click="openMediaLibrary('video')"
      >
        <i class="bi bi-camera-video" />
      </button>

      <button
        type="button"
        class="md-tool"
        title="插入音频"
        @mousedown.prevent
        @click="openMediaLibrary('audio')"
      >
        <i class="bi bi-music-note-beamed" />
      </button>

      <button
        type="button"
        class="md-tool"
        title="插入附件"
        @mousedown.prevent
        @click="openMediaLibrary('file')"
      >
        <i class="bi bi-paperclip" />
      </button>

      <!-- 上传视频 / 音频 / 附件（按扩展名自动生成对应短代码） -->
      <button
        type="button"
        class="md-tool"
        title="上传视频 / 音频 / 附件"
        :disabled="mediaUploading"
        @mousedown.prevent
        @click="pickMedia"
      >
        <i :class="mediaUploading ? 'bi bi-arrow-repeat md-spin' : 'bi bi-cloud-arrow-up'" />
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

      <!-- 分屏预览：仅全屏下可用（左写右预览，边写边看） -->
      <button
        v-if="fullscreen"
        type="button"
        class="md-tool"
        :class="{ 'is-active': splitView }"
        :title="splitView ? '退出分屏，单栏编辑' : '分屏预览（左写右预览）'"
        @mousedown.prevent
        @click="toggleSplit"
      >
        <i class="bi bi-layout-split" />
      </button>

      <!-- 预览 / 继续编辑 -->
      <button
        type="button"
        class="md-tool"
        :class="{ 'is-active': mode === 'preview' && !splitView }"
        :title="mode === 'preview' && !splitView ? '继续编辑' : splitView ? '只看预览' : '预览'"
        @click="toggleMode"
      >
        <i :class="mode === 'preview' && !splitView ? 'bi bi-pencil-square' : 'bi bi-eye'" />
      </button>
    </div>

    <!-- 正文 -->
    <div class="md-body" :class="{ 'is-split': splitView }">
      <!-- 源码编辑：只有 [emoji:url] 渲染成表情图，图片 markdown 与 @[video] 等短代码保持文本 -->
      <div
        v-show="showEditor"
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
        v-show="showPreview"
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

    <!-- 视频 / 音频 / 附件：实际允许的类型由后端 storage 配置兜底校验 -->
    <input
      ref="mediaRef"
      type="file"
      accept="video/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.md,.csv,.zip,.rar,.7z,.tar,.gz"
      multiple
      hidden
      @change="onMediaChange"
    />

    <!-- 附件库（选择已上传图片，按 markdown 图片语法插入光标处） -->
    <AttachmentLibrary
      v-model:visible="showLibrary"
      title="选择正文图片"
      accept="image"
      multiple
      :max="9"
      @select="onLibrarySelect"
    />

    <!-- 附件库（视频 / 音频 / 任意附件）：三个按钮共用，按当前类型过滤，选中后生成对应短代码 -->
    <AttachmentLibrary
      v-model:visible="showMediaLibrary"
      :title="mediaTitle"
      :accept="mediaAccept"
      multiple
      :max="9"
      @select="onMediaLibrarySelect"
    />
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onUnmounted, nextTick } from 'vue'
import EmojiPicker from './EmojiPicker.vue'
import MentionPicker from './MentionPicker.vue'
import AttachmentLibrary from './AttachmentLibrary.vue'
import { renderMarkdown } from '@/utils/markdown'
import { getFullUrl } from '@/utils/runtimeConfig'
import { uploadArticleImage } from '@/api/article'
import { uploadAttachments } from '@/api/attachment'
import { attachmentMarker } from '@/utils/attachment'
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

// ===== @ 提及 =====
// 候选只含「我关注的人」（见 api/mention.js），插入纯文本 @昵称；
// 保存时后端会规范化为 @[昵称](/author/uid) 并给被 @ 的人发站内通知（app/model/mention.go）。
//
// 两条触发路径：
//   ① 正文里直接输入 @ —— 弹面板并随输入过滤（与评论框 / 动态编辑器一致）；
//   ② 工具栏的 @ 按钮 —— 列出全部候选，插到光标处。
// 面板坐标一律用**视口坐标**（MentionPicker 是 position: fixed），
// 不要传「相对容器」的坐标 —— 那样容器层级一变就会整体错位。
const mentionRef = ref(null)
const mentionOpen = ref(false)
const mentionKeyword = ref('')
// 本次面板是「输入 @ 触发」还是「工具栏按钮触发」：
// 前者正文里已有一个 @关键词 需要被替换掉，后者不能回删字符
const mentionReplace = ref(false)
const mentionPosition = ref({ left: 0, top: 0, flipTo: null })

const MENTION_GAP = 6
// 面板最大高度 236 + 间距（与 MentionPicker 的样式保持一致）
const MENTION_PANEL_HEIGHT = 246

/** 由光标 / 按钮的矩形算出面板坐标（视口坐标），下方空间不足时向上翻 */
function mentionStyleByRect(rect) {
  const below = rect.bottom + MENTION_GAP
  return {
    left: rect.left,
    top: below,
    flipTo: below + MENTION_PANEL_HEIGHT > window.innerHeight ? rect.top - MENTION_GAP : null
  }
}

/** 光标前正处于「@关键词」时打开面板并按关键词过滤 */
function syncMentionState() {
  const root = editorRef.value
  const selection = window.getSelection()

  if (!root || !selection || !selection.rangeCount) {
    mentionOpen.value = false
    return
  }

  const range = selection.getRangeAt(0)
  const node = range.startContainer

  if (!range.collapsed || !root.contains(node) || node.nodeType !== Node.TEXT_NODE) {
    mentionOpen.value = false
    return
  }

  // @ 前必须是行首或空白，避免把邮箱 a@b.com 当成 @ 提及
  const before = node.textContent.slice(0, range.startOffset)
  const matched = before.match(/(?:^|\s)@([^\s@]{0,32})$/)
  if (!matched) {
    mentionOpen.value = false
    return
  }

  const rects = range.getClientRects()
  const caret = rects.length ? rects[rects.length - 1] : range.getBoundingClientRect()

  mentionKeyword.value = matched[1]
  mentionReplace.value = true
  mentionPosition.value = mentionStyleByRect(caret)
  mentionOpen.value = true
}

/** 工具栏 @ 按钮：不做关键词过滤，面板贴在按钮下方 */
function toggleMention(event) {
  const rect = event?.currentTarget?.getBoundingClientRect?.()
  mentionKeyword.value = ''
  mentionReplace.value = false
  if (rect) mentionPosition.value = mentionStyleByRect(rect)
  mentionOpen.value = !mentionOpen.value
}

/** 面板打开时接管方向键 / 回车 / Esc；返回 true 表示该按键已被面板处理 */
function onMentionKeydown(event) {
  if (!mentionOpen.value) return false

  if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
    mentionRef.value?.move(event.key === 'ArrowDown' ? 1 : -1)
    return true
  }

  if (event.key === 'Enter') {
    // 候选为空时返回 false，让回车继续走编辑器的换行
    return mentionRef.value?.selectActive() === true
  }

  if (event.key === 'Escape') {
    mentionOpen.value = false
    return true
  }

  return false
}

function applyMention(user) {
  const keyword = mentionKeyword.value
  // 输入触发时正文里已经有一个「@关键词」，长度是 keyword.length + 1（那个 @）；
  // 工具栏触发时正文里没有 @，这里必须是 0 —— 否则会把它前面一个字符误删
  const consume = mentionReplace.value ? keyword.length + 1 : 0

  mentionReplace.value = false
  mentionOpen.value = false
  if (!user?.nickname) return

  const root = editorRef.value
  if (!root) return

  // 工具栏按钮都带 @mousedown.prevent，点按钮不会丢选区，光标仍在正文里
  root.focus()
  const selection = window.getSelection()
  if (!selection || !selection.rangeCount) return

  const range = selection.getRangeAt(0)
  const node = range.startContainer

  // 先把已输入的「@关键词」整段选中，下面的 execCommand 会用 @昵称 覆盖它
  if (consume > 0 && node.nodeType === Node.TEXT_NODE) {
    const start = Math.max(0, range.startOffset - consume)
    const replaceRange = document.createRange()
    replaceRange.setStart(node, start)
    replaceRange.setEnd(node, range.startOffset)
    selection.removeAllRanges()
    selection.addRange(replaceRange)
  }

  // 用 execCommand 插入纯文本：会触发 input 事件，交给 onInput → serializeEditor 同步源码
  document.execCommand('insertText', false, `@${user.nickname} `)
}

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
  // 输入 @ / 继续输入关键词时，同步 @ 候选面板
  syncMentionState()

  // 手动敲完一个表情标记（[emoji:url]）时即时渲染成表情图；图片 / 短代码保持文本
  const data = e?.data || ''
  if (!e?.isComposing && (data === ']' || data === '］')) {
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
  // 文本不变，但重建一次 DOM 即可把刚输入的标记变成表情图
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
  // @ 候选面板打开时优先接管方向键 / 回车 / Esc，避免回车被当成换行写进正文
  if (onMentionKeydown(e)) {
    e.preventDefault()
    return
  }

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
  // 分屏下点「预览」= 退出分屏、只看预览
  if (splitView.value) {
    splitView.value = false
    mode.value = 'preview'
    return
  }
  mode.value = mode.value === 'write' ? 'preview' : 'write'
  if (mode.value === 'write') {
    nextTick(() => editorRef.value?.focus())
  }
}

// ===== 全屏分屏（左写右预览） =====
// 只在全屏下启用：正文区左侧是 markdown 源码，右侧是实时预览，两边各自滚动。
const splitView = ref(false)

const showEditor = computed(() => splitView.value || mode.value === 'write')
const showPreview = computed(() => splitView.value || mode.value === 'preview')

function toggleSplit() {
  splitView.value = !splitView.value
  // 分屏必须有一栏可写，否则和「只看预览」没区别
  if (splitView.value) mode.value = 'write'
  nextTick(() => editorRef.value?.focus())
}

// ===== 全屏编辑 =====
let bodyOverflow = ''

function toggleFullscreen() {
  fullscreen.value = !fullscreen.value
  if (fullscreen.value) {
    // 全屏默认就是「边写边预览」的分屏形态
    splitView.value = true
    mode.value = 'write'
    // 锁住页面滚动，避免全屏时背景跟着滚
    bodyOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    nextTick(() => editorRef.value?.focus())
  } else {
    splitView.value = false
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
    // 图片现在以 markdown 文本插入，文件名里的 [ ] 会破坏语法，先抹掉
    const alt = String(file.name || '').replace(/[[\]]/g, '').trim()
    insertMarker(`![${alt}](${url})`, true)
    toast.success('图片已插入')
  } catch {
    toast.error('图片上传失败，请稍后重试')
  } finally {
    uploading.value = false
  }
}

const isImageNode = (el) =>
  !!el && el.nodeType === 1 && (el.tagName === 'IMG' || (el.tagName === 'SPAN' && el.hasAttribute('data-md-src')))

/** 删除光标紧邻的表情原子（图片已是纯文本，不再需要整体删除），返回是否已处理 */
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

// 附件库：把选中的已上传图片按 markdown 图片语法插入光标处（各自独占一行）
const showLibrary = ref(false)
function onLibrarySelect(urls = []) {
  const list = urls.filter(Boolean)
  if (!list.length) return
  insertMarker(list.map((url) => `![](${url})`).join('\n\n'), true)
  toast.success(`已插入 ${list.length} 张图片`)
}

/* ===== 视频 / 音频 / 附件（正文短代码） =====
 * 工具栏三个按钮（视频 / 音频 / 附件）共用同一个附件库弹窗，只是按当前类型过滤；
 * 插入的是 @[video](url "标题") / @[audio](url "标题") / @[file](url "文件名" "大小")，
 * 在编辑器里只是普通文本（不渲染播放器），解析在 @/utils/markdown（markdown-it 规则 media_shortcode）。
 */
const showMediaLibrary = ref(false)
const mediaRef = ref(null)
const mediaUploading = ref(false)
// 当前弹窗对应的短代码类型：video / audio / file
const mediaKind = ref('file')

const MEDIA_LIBRARY = {
  video: { title: '插入视频', accept: 'video' },
  audio: { title: '插入音频', accept: 'audio' },
  file: { title: '插入附件', accept: 'all' }
}

const mediaTitle = computed(() => MEDIA_LIBRARY[mediaKind.value]?.title || '插入附件')
const mediaAccept = computed(() => MEDIA_LIBRARY[mediaKind.value]?.accept || 'all')

function openMediaLibrary(kind) {
  mediaKind.value = MEDIA_LIBRARY[kind] ? kind : 'file'
  showMediaLibrary.value = true
}

function pickMedia() {
  mediaRef.value?.click()
}

/** 一批附件 → 若干短代码（每个独占一行）；kind 显式指定时不按扩展名猜 */
function attachmentMarkers(items = [], kind) {
  return items.map((item) => attachmentMarker(item, kind)).filter(Boolean).join('\n\n')
}

async function onMediaChange(e) {
  const files = Array.from(e.target.files || [])
  e.target.value = ''
  if (!files.length) return

  mediaUploading.value = true
  try {
    const fd = new FormData()
    files.forEach((file) => fd.append('files', file))
    const res = await uploadAttachments(fd)

    // 后端返回的结果里带 original_name / file_size，取不到时回退本地文件信息
    const results = res.data?.results || []
    const items = results.map((row, index) => ({
      url: row.full_url || row.url || '',
      name: row.original_name || files[index]?.name || '',
      size: row.file_size || files[index]?.size || 0
    }))

    const markers = attachmentMarkers(items)
    if (!markers) throw new Error('empty')
    insertMarker(markers, true)
    toast.success(`已插入 ${items.length} 个文件`)
  } catch {
    toast.error('上传失败，请检查文件类型与大小限制')
  } finally {
    mediaUploading.value = false
  }
}

function onMediaLibrarySelect(urls = [], items = []) {
  const list = items?.length
    ? items.map((item) => ({
        url: item.full_url || item.url || '',
        name: item.original_name || '',
        size: item.file_size || 0
      }))
    : (urls || []).filter(Boolean).map((url) => ({ url }))

  // 显式带上当前按钮的类型，避免「附件」里选到视频时被猜成播放器短代码
  const markers = attachmentMarkers(list, mediaKind.value)
  if (!markers) return
  insertMarker(markers, true)
  toast.success(`已插入 ${list.length} 个短代码`)
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
  /* 预览区（尤其分屏时只有半屏宽）比正文窄，视频按 70vh 撑开会占满整列，
     这里用播放器暴露的 CSS 变量收一收高度（自定义属性会穿透 shadow DOM） */
  --md-video-max-height: 360px;
}

/* ---------- 行内表情（innerHTML 注入，需 deep） ---------- */
.md-content :deep(.editor-emoji) {
  width: 24px;
  height: 24px;
  vertical-align: middle;
  display: inline-block;
  object-fit: contain;
  margin: 0 2px;
  border-radius: 4px;
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
/* 全屏分屏：左写右预览，两栏各自滚动 */
.md-editor.is-fullscreen .md-body.is-split {
  flex-direction: row;
  align-items: stretch;
}
.md-editor.is-fullscreen .md-body.is-split .md-content,
.md-editor.is-fullscreen .md-body.is-split .md-preview {
  flex: 1 1 50%;
  min-width: 0;
  max-width: none;
  margin: 0;
  padding: 22px 20px 64px;
}
.md-editor.is-fullscreen .md-body.is-split .md-preview {
  border-left: 1px solid var(--border-soft);
  background: var(--bg-card);
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
  /* 窄屏放不下左右两栏：分屏改成上下两半（上写下看） */
  .md-editor.is-fullscreen .md-body.is-split {
    flex-direction: column;
  }
  .md-editor.is-fullscreen .md-body.is-split .md-content,
  .md-editor.is-fullscreen .md-body.is-split .md-preview {
    flex: 1 1 50%;
    padding: 16px 14px 40px;
  }
  .md-editor.is-fullscreen .md-body.is-split .md-preview {
    border-left: none;
    border-top: 1px solid var(--border-soft);
  }
}
</style>
