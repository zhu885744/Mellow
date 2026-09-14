<template>
  <div class="md-editor">
    <!-- 工具栏 -->
    <div class="md-toolbar">
      <button
        v-for="tool in tools"
        :key="tool.key"
        type="button"
        class="md-tool"
        :title="tool.title"
        @click="run(tool)"
      >
        <i v-if="tool.icon" :class="tool.icon" />
        <span v-else>{{ tool.text }}</span>
      </button>

      <span class="md-toolbar__split" />

      <button type="button" class="md-tool" title="上传图片" :disabled="uploading" @click="pickImage">
        <i :class="uploading ? 'bi bi-arrow-repeat md-spin' : 'bi bi-image'" />
      </button>

      <span class="md-toolbar__flex" />

      <button
        type="button"
        class="md-tool md-tool--text"
        :class="{ active: mode === 'preview' }"
        @click="toggleMode"
      >
        <i class="bi bi-eye" /> {{ mode === 'preview' ? '继续编辑' : '预览' }}
      </button>
    </div>

    <!-- 编辑区 -->
    <textarea
      v-show="mode === 'write'"
      ref="areaRef"
      class="md-textarea"
      :value="modelValue"
      :placeholder="placeholder"
      :style="{ minHeight }"
      @input="onInput"
      @keydown="onKeydown"
    />

    <!-- 预览区 -->
    <div
      v-show="mode === 'preview'"
      class="md-preview markdown-body"
      :style="{ minHeight }"
      v-html="html"
    />

    <input ref="fileRef" type="file" accept="image/*" hidden @change="onFileChange" />

    <div class="md-foot">
      <span>{{ count }} 字</span>
      <span class="md-tip">支持 Markdown，Ctrl / ⌘ + S 保存</span>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, nextTick } from 'vue'
import { renderMarkdown } from '@/utils/markdown'
import { uploadArticleImage } from '@/api/article'
import { toast } from '@/utils/toast'

const props = defineProps({
  modelValue: { type: String, default: '' },
  placeholder: { type: String, default: '开始书写…' },
  minHeight: { type: String, default: '420px' }
})

const emit = defineEmits(['update:modelValue', 'save'])

const areaRef = ref(null)
const fileRef = ref(null)
const mode = ref('write')
const uploading = ref(false)

const html = computed(() => renderMarkdown(props.modelValue))
const count = computed(() => (props.modelValue || '').replace(/\s/g, '').length)

const tools = [
  { key: 'bold', title: '加粗 (Ctrl+B)', icon: 'bi bi-type-bold', run: (e) => wrap(e, '**', '**') },
  { key: 'italic', title: '斜体 (Ctrl+I)', icon: 'bi bi-type-italic', run: (e) => wrap(e, '*', '*') },
  { key: 'h2', title: '标题', text: 'H2', run: (e) => prefix(e, '## ') },
  { key: 'quote', title: '引用', icon: 'bi bi-blockquote-left', run: (e) => prefix(e, '> ') },
  { key: 'ul', title: '无序列表', icon: 'bi bi-list-ul', run: (e) => prefix(e, '- ') },
  { key: 'ol', title: '有序列表', icon: 'bi bi-list-ol', run: (e) => prefix(e, '1. ') },
  { key: 'code', title: '行内代码', icon: 'bi bi-code', run: (e) => wrap(e, '`', '`') },
  { key: 'block', title: '代码块', icon: 'bi bi-code-square', run: insertCodeBlock },
  { key: 'link', title: '链接', icon: 'bi bi-link-45deg', run: insertLink },
  { key: 'table', title: '表格', icon: 'bi bi-table', run: insertTable },
  { key: 'hr', title: '分割线', icon: 'bi bi-hr', run: (e) => insertBlock(e, '\n\n---\n\n') }
]

function onInput(e) {
  emit('update:modelValue', e.target.value)
}

function run(tool) {
  if (mode.value === 'preview') mode.value = 'write'
  nextTick(() => tool.run(areaRef.value))
}

function toggleMode() {
  mode.value = mode.value === 'write' ? 'preview' : 'write'
  if (mode.value === 'write') {
    nextTick(() => areaRef.value?.focus())
  }
}

/**
 * 用 selection 范围替换内容，并把光标放到合适位置
 */
function replaceRange(el, start, end, text, selStart, selEnd) {
  const value = el.value
  el.value = value.slice(0, start) + text + value.slice(end)
  emit('update:modelValue', el.value)
  nextTick(() => {
    el.focus()
    const from = selStart === undefined ? start + text.length : selStart
    const to = selEnd === undefined ? from : selEnd
    el.setSelectionRange(from, to)
  })
}

/** 包裹选中内容：**xx** */
function wrap(el, before, after) {
  if (!el) return
  const { selectionStart: s, selectionEnd: e, value } = el
  const placeholder = before === '**' ? '加粗文字' : before === '`' ? 'code' : '斜体文字'
  const selected = value.slice(s, e) || placeholder
  const text = before + selected + after
  replaceRange(el, s, e, text, s + before.length, s + before.length + selected.length)
}

/** 给选中行的每一行加前缀 */
function prefix(el, mark) {
  if (!el) return
  const { selectionStart: s, selectionEnd: e, value } = el
  const lineStart = value.lastIndexOf('\n', s - 1) + 1
  const lineEnd = value.indexOf('\n', e) === -1 ? value.length : value.indexOf('\n', e)
  const block = value.slice(lineStart, lineEnd)
  const lines = block.split('\n').map((line) => {
    if (line.startsWith(mark)) return line.slice(mark.length)
    return mark + line
  })
  replaceRange(el, lineStart, lineEnd, lines.join('\n'), lineStart, lineStart + lines.join('\n').length)
}

/** 在光标处插入块级内容 */
function insertBlock(el, text, caretOffset) {
  if (!el) return
  const { selectionStart: s, selectionEnd: e } = el
  const offset = caretOffset === undefined ? text.length : caretOffset
  replaceRange(el, s, e, text, s + offset, s + offset)
}

function insertCodeBlock(el) {
  if (!el) return
  const { selectionStart: s, selectionEnd: e, value } = el
  const selected = value.slice(s, e) || '在这里写代码'
  insertBlock(el, `\n\n\`\`\`js\n${selected}\n\`\`\`\n\n`, 7)
}

function insertLink(el) {
  if (!el) return
  const { selectionStart: s, selectionEnd: e, value } = el
  const text = value.slice(s, e) || '链接文字'
  const insert = `[${text}](https://)`
  // 光标落在 url 处
  const urlStart = s + insert.length - 1
  replaceRange(el, s, e, insert, urlStart, urlStart)
}

function insertTable(el) {
  insertBlock(
    el,
    '\n\n| 列1 | 列2 |\n| --- | --- |\n| 内容 | 内容 |\n\n',
    2
  )
}

function onKeydown(e) {
  const mod = e.ctrlKey || e.metaKey
  if (mod && e.key.toLowerCase() === 's') {
    e.preventDefault()
    emit('save')
    return
  }
  if (mod && e.key.toLowerCase() === 'b') {
    e.preventDefault()
    wrap(e.target, '**', '**')
    return
  }
  if (mod && e.key.toLowerCase() === 'i') {
    e.preventDefault()
    wrap(e.target, '*', '*')
    return
  }
  // Tab 缩进
  if (e.key === 'Tab') {
    e.preventDefault()
    insertBlock(e.target, '  ')
  }
}

// ===== 图片上传 =====
function pickImage() {
  fileRef.value?.click()
}

async function onFileChange(e) {
  const file = e.target.files?.[0]
  e.target.value = ''
  if (!file) return
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
    if (mode.value === 'preview') mode.value = 'write'
    await nextTick()
    insertBlock(areaRef.value, `\n\n![${file.name}](${url})\n\n`)
    toast.success('图片已插入')
  } catch {
    toast.error('图片上传失败，请稍后重试')
  } finally {
    uploading.value = false
  }
}

defineExpose({ focus: () => areaRef.value?.focus() })
</script>

<style scoped>
.md-editor {
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background: var(--bg-card);
  overflow: hidden;
  transition: border-color 0.2s, box-shadow 0.2s;
}
.md-editor:focus-within {
  border-color: var(--primary);
  box-shadow: 0 0 0 3px var(--accent-ring);
}
.md-toolbar {
  display: flex;
  align-items: center;
  gap: 2px;
  padding: 6px 8px;
  background: var(--bg-muted);
  border-bottom: 1px solid var(--border-soft);
  flex-wrap: wrap;
}
.md-tool {
  min-width: 30px;
  height: 28px;
  padding: 0 7px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 13px;
  border: none;
  border-radius: var(--radius-sm);
  background: transparent;
  color: var(--text-soft);
  cursor: pointer;
  transition: all 0.15s;
}
.md-tool:hover:not(:disabled) {
  background: var(--bg-card);
  color: var(--primary);
}
.md-tool:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.md-tool--text {
  gap: 4px;
  font-size: 12px;
  padding: 0 10px;
}
.md-tool--text.active {
  background: var(--primary);
  color: #fff;
}
.md-toolbar__split {
  width: 1px;
  height: 16px;
  margin: 0 4px;
  background: var(--border);
}
.md-toolbar__flex {
  flex: 1;
}
.md-textarea {
  display: block;
  width: 100%;
  padding: 14px 16px;
  border: none;
  outline: none;
  resize: vertical;
  background: transparent;
  color: var(--text);
  font-size: 14px;
  line-height: 1.8;
  font-family: var(--font-mono);
}
.md-preview {
  padding: 14px 16px;
  overflow-y: auto;
  max-height: 620px;
}
.md-foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 6px 12px;
  border-top: 1px solid var(--border-soft);
  font-size: 12px;
  color: var(--text-muted);
  background: var(--bg-muted);
}
.md-tip {
  color: var(--text-light);
}
.md-spin {
  display: inline-block;
  animation: mdSpin 0.8s linear infinite;
}
@keyframes mdSpin {
  to { transform: rotate(360deg); }
}

@media (max-width: 768px) {
  .md-toolbar {
    flex-wrap: nowrap;
    overflow-x: auto;
  }
  .md-tool {
    flex-shrink: 0;
  }
  .md-toolbar__split {
    flex-shrink: 0;
  }
  .md-tip {
    display: none;
  }
}
</style>
