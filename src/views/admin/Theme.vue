<template>
  <div class="theme-admin">
    <!-- 概览 -->
    <section class="card card-pad">
      <header class="panel-head">
        <div>
          <h2 class="block-title">主题配色</h2>
          <p class="block-desc">
            配色由设计 token（CSS 变量）驱动：先选一套内置预设，再逐项微调；
            浅色 / 深色各一套，保存后立即生效（前台与管理后台同步换肤，无需重启）
          </p>
        </div>
        <div class="head-actions">
          <button class="btn btn-ghost btn-sm" :disabled="loading" @click="load">
            <i class="bi bi-arrow-clockwise" /> 重新加载
          </button>
          <button class="btn btn-sm" :disabled="loading || saving" @click="askReset">
            <i class="bi bi-arrow-counterclockwise" /> 恢复默认
          </button>
          <button class="btn btn-primary btn-sm" :disabled="loading || saving" @click="onSave">
            <span v-if="saving" class="spinner" />
            <i v-else class="bi bi-check2" />
            {{ saving ? '保存中…' : '保存并应用' }}
          </button>
        </div>
      </header>

      <p v-if="loadError" class="stat-error">
        <i class="bi bi-exclamation-circle" aria-hidden="true" />
        <span>{{ loadError }}</span>
      </p>

      <div class="theme-meta">
        <span class="theme-chip">当前预设：{{ activePresetName }}</span>
        <span class="theme-chip">样式表：<code>/theme-custom.css</code></span>
        <span class="theme-chip" :class="{ 'is-dirty': dirty }">
          {{ dirty ? '有未保存的修改' : '配置已保存' }}
        </span>
      </div>
    </section>

    <!-- 内置预设 -->
    <section class="card card-pad">
      <header class="section-head">
        <div>
          <h3 class="section-title">内置预设</h3>
          <p class="section-desc">点击套用到编辑区（不会自动保存），套用后仍可逐项微调</p>
        </div>
      </header>

      <div v-if="loading && !presets.length" class="loading"><span class="spinner" /> 加载中...</div>

      <div v-else class="preset-grid">
        <button
          v-for="preset in presets"
          :key="preset.key"
          type="button"
          class="preset-card"
          :class="{ active: form.preset === preset.key }"
          @click="applyPreset(preset)"
        >
          <span class="preset-swatches" aria-hidden="true">
            <i v-for="(color, index) in presetSwatches(preset)" :key="index" :style="{ background: color }" />
          </span>
          <span class="preset-body">
            <strong>{{ preset.name }}</strong>
            <small>{{ preset.desc }}</small>
          </span>
          <i v-if="form.preset === preset.key" class="bi bi-check-circle-fill preset-check" />
        </button>
      </div>
    </section>

    <!-- 编辑 + 预览 -->
    <div class="theme-layout">
      <section class="card card-pad">
        <div class="editor-head">
          <div class="mode-tabs" role="tablist" aria-label="配色模式">
            <button
              v-for="mode in modes"
              :key="mode.key"
              type="button"
              class="mode-tab"
              :class="{ active: currentMode === mode.key }"
              role="tab"
              :aria-selected="currentMode === mode.key"
              @click="currentMode = mode.key"
            >
              <i :class="mode.icon" /> {{ mode.label }}
            </button>
          </div>
          <button class="btn btn-ghost btn-sm" :disabled="!canResetMode" @click="resetMode">
            <i class="bi bi-arrow-counterclockwise" /> 本模式恢复预设
          </button>
        </div>

        <div v-if="loading" class="loading"><span class="spinner" /> 加载中...</div>

        <template v-else>
          <div v-for="group in groups" :key="group.key" class="token-group">
            <div class="token-group-head">
              <h4>{{ group.label }}</h4>
              <p v-if="group.desc">{{ group.desc }}</p>
            </div>

            <div class="token-grid">
              <div v-for="token in tokensOf(group.key)" :key="token.key" class="token-item">
                <label class="token-label" :for="`token-${currentMode}-${token.key}`">
                  {{ token.label }}
                  <code>--{{ token.key }}</code>
                </label>

                <div class="token-input">
                  <input
                    class="token-color"
                    type="color"
                    :value="hexOf(form[currentMode][token.key])"
                    :aria-label="`${token.label} 取色`"
                    @input="onColorPick(token.key, $event)"
                  />
                  <input
                    :id="`token-${currentMode}-${token.key}`"
                    v-model="form[currentMode][token.key]"
                    class="input token-text"
                    :class="{ 'is-invalid': !!form[currentMode][token.key] && !colorValid(form[currentMode][token.key]) }"
                    type="text"
                    spellcheck="false"
                    autocomplete="off"
                  />
                </div>

                <p v-if="token.desc" class="form-hint">{{ token.desc }}</p>
                <p
                  v-else-if="form[currentMode][token.key] && !colorValid(form[currentMode][token.key])"
                  class="form-hint is-error"
                >
                  颜色格式无法识别，保存时会回退到预设值
                </p>
              </div>
            </div>
          </div>
        </template>
      </section>

      <!-- 实时预览：两套模式并排，局部覆盖 CSS 变量，不影响后台自身 -->
      <aside class="card card-pad preview-wrap">
        <header class="section-head">
          <div>
            <h3 class="section-title">实时预览</h3>
            <p class="section-desc">编辑任意颜色，这里立即变化</p>
          </div>
        </header>

        <div class="preview-pair">
          <div
            v-for="mode in modes"
            :key="`preview-${mode.key}`"
            class="theme-preview"
            :style="previewVars(mode.key)"
          >
            <span class="preview-mode">{{ mode.label }}</span>
            <span class="preview-title">纸与墨</span>
            <p class="preview-text">正文示例：暖纸为底，墨色为文，朱砂为印。</p>
            <div class="preview-row">
              <span class="preview-btn primary">主按钮</span>
              <span class="preview-btn ghost">次要</span>
              <span class="preview-chip">标签</span>
            </div>
            <div class="preview-card">
              <span class="preview-label">卡片底</span>
              <span class="preview-success">成功</span>
              <span class="preview-warning">警告</span>
            </div>
            <div class="preview-input">输入框占位…</div>
            <span class="preview-link">链接文字</span>
          </div>
        </div>

        <p class="form-hint">预览只覆盖本区域；点「保存并应用」后整站（含前台）才会切换。</p>
      </aside>
    </div>

    <ConfirmDialog
      v-model:visible="confirm.visible"
      :title="confirm.title"
      :message="confirm.message"
      :confirm-text="confirm.confirmText"
      :danger="true"
      :loading="confirm.loading"
      @confirm="runConfirm"
    />
  </div>
</template>

<script setup>
/**
 * 主题配色（/admin/theme）
 *
 * 数据来自 /api/theme/config（app/api/controller/theme.go）：
 * - tokens / groups：可编辑的设计 token 与分组
 * - presets：内置预设（浅色 / 深色完整取值）
 * - settings / defaults：当前配色与默认配色
 *
 * 保存后 /theme-custom.css 立即返回新样式表，本页通过给 <link data-theme-custom>
 * 换一个查询串强制浏览器重新拉取，避免还停留在旧配色上。
 */
import { computed, onMounted, reactive, ref } from 'vue'
import ConfirmDialog from '@/components/ConfirmDialog.vue'
import { getThemeConfig, resetThemeConfig, saveThemeConfig } from '@/api/theme'
import { toast } from '@/utils/toast'

const THEME_LINK_SELECTOR = 'link[data-theme-custom]'

const loading = ref(false)
const saving = ref(false)
const loadError = ref('')

const tokens = ref([])
const groups = ref([])
const presets = ref([])
const defaults = ref({ preset: 'cinnabar', light: {}, dark: {} })

const form = reactive({ preset: 'cinnabar', light: {}, dark: {} })
const currentMode = ref('light')
const savedSnapshot = ref('')
// ready：首次加载完成前不算「有未保存的修改」（否则空表单会被判成 dirty）
const ready = ref(false)

const modes = [
  { key: 'light', label: '浅色模式', icon: 'bi bi-sun' },
  { key: 'dark', label: '深色模式', icon: 'bi bi-moon-stars' }
]

const confirm = reactive({
  visible: false,
  loading: false,
  title: '',
  message: '',
  confirmText: '确定'
})

const activePresetName = computed(() => {
  const item = presets.value.find((preset) => preset.key === form.preset)
  return item?.name || form.preset || '—'
})

// 当前预设（"本模式恢复预设" 的数据源）
const currentPreset = computed(() => presets.value.find((preset) => preset.key === form.preset))

const canResetMode = computed(() => Boolean(currentPreset.value))

const dirty = computed(() => ready.value && snapshot() !== savedSnapshot.value)

function tokensOf(group) {
  return tokens.value.filter((token) => token.group === group)
}

// ---------- 快照：用于判断是否有未保存修改（键排序，避免对象顺序影响比较） ----------
function sorted(source) {
  const result = {}
  Object.keys(source || {})
    .sort()
    .forEach((key) => {
      result[key] = source[key]
    })
  return result
}

function snapshot() {
  return JSON.stringify({
    preset: form.preset,
    light: sorted(form.light),
    dark: sorted(form.dark)
  })
}

// ---------- 读取 / 回填 ----------
function applySettings(settings, markSaved = true) {
  form.preset = settings?.preset || defaults.value.preset || 'cinnabar'
  form.light = { ...(settings?.light || {}) }
  form.dark = { ...(settings?.dark || {}) }

  // 防御旧数据：缺项的 token 用默认值补齐，避免渲染出空输入框
  tokens.value.forEach((token) => {
    if (!form.light[token.key]) form.light[token.key] = defaults.value.light?.[token.key] || '#000000'
    if (!form.dark[token.key]) form.dark[token.key] = defaults.value.dark?.[token.key] || '#000000'
  })

  ready.value = true
  if (markSaved) savedSnapshot.value = snapshot()
}

async function load() {
  if (loading.value) return
  loading.value = true
  loadError.value = ''

  try {
    const res = await getThemeConfig()
    const data = res?.data || {}

    tokens.value = Array.isArray(data.tokens) ? data.tokens : []
    groups.value = Array.isArray(data.groups) ? data.groups : []
    presets.value = Array.isArray(data.presets) ? data.presets : []
    defaults.value = data.defaults || { preset: 'cinnabar', light: {}, dark: {} }

    applySettings(data.settings || defaults.value)
  } catch (error) {
    loadError.value = error?.msg || '主题配色读取失败，请稍后重试'
  } finally {
    loading.value = false
  }
}

// ---------- 编辑 ----------
function applyPreset(preset) {
  form.preset = preset.key
  form.light = { ...preset.light }
  form.dark = { ...preset.dark }
}

function resetMode() {
  if (!currentPreset.value) return
  form[currentMode.value] = { ...currentPreset.value[currentMode.value] }
}

function onColorPick(key, event) {
  form[currentMode.value][key] = event.target.value
}

// ---------- 预览：把 token 与派生色写成局部 CSS 变量 ----------
function previewVars(mode) {
  const values = form[mode] || {}
  const vars = {}

  Object.keys(values).forEach((key) => {
    vars[`--${key}`] = values[key]
  })

  const accentAlpha = mode === 'dark' ? ['0.1', '0.18', '0.3', '0.45'] : ['0.06', '0.12', '0.2', '0.38']
  ;['accent-wash', 'accent-soft', 'accent-ring', 'accent-glow'].forEach((name, index) => {
    vars[`--${name}`] = hexToRgba(values.cinnabar, accentAlpha[index])
  })

  const goldAlpha = mode === 'dark' ? ['0.12', '0.18', '0.34'] : ['0.1', '0.16', '0.32']
  ;['gold-wash', 'gold-soft', 'gold-line'].forEach((name, index) => {
    vars[`--${name}`] = hexToRgba(values.warning, goldAlpha[index])
  })

  // 语义别名：styles.css 里用 var() 引用基础 token，预览区单独覆盖一次即可
  vars['--bg'] = values['paper-1']
  vars['--bg-soft'] = values['paper-1']
  vars['--bg-alt'] = values['paper-1']
  vars['--bg-card'] = values['paper-0']
  vars['--bg-muted'] = values['paper-2']
  vars['--bg-overlay'] = hexToRgba(mode === 'dark' ? values['paper-1'] : values['paper-0'], '0.86')

  vars['--text'] = values['ink-900']
  vars['--text-soft'] = values['ink-700']
  vars['--text-muted'] = values['ink-500']
  vars['--text-light'] = values['ink-300']

  vars['--border'] = values['line']
  vars['--border-soft'] = values['line-soft']

  vars['--primary'] = values.cinnabar
  vars['--primary-deep'] = values['cinnabar-deep']
  vars['--primary-soft'] = values['cinnabar-soft']
  vars['--accent'] = values.cinnabar
  vars['--link'] = values['cinnabar-deep']
  vars['--link-hover'] = values.cinnabar

  vars['--success'] = values.bamboo
  vars['--danger'] = values.cinnabar
  vars['--warning'] = values.warning

  return vars
}

function presetSwatches(preset) {
  const values = preset.light || {}
  return [values['paper-1'], values['paper-0'], values.cinnabar, values.bamboo].filter(Boolean)
}

// ---------- 颜色工具 ----------
const COLOR_PATTERN = /^(#([0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})|(rgb|rgba|hsl|hsla)\([^;{}<>]*\)|[a-z-]+)$/i

function colorValid(value) {
  return typeof value === 'string' && COLOR_PATTERN.test(value.trim())
}

/** 取色器只接受 #rrggbb：非十六进制值（如 rgba）回退到黑色 */
function hexOf(value) {
  const text = String(value || '').trim()
  if (/^#[0-9a-f]{6}$/i.test(text)) return text
  if (/^#[0-9a-f]{3}$/i.test(text)) {
    return `#${text[1]}${text[1]}${text[2]}${text[2]}${text[3]}${text[3]}`
  }
  return '#000000'
}

function hexToRgba(value, alpha) {
  const text = String(value || '').trim().toLowerCase()
  let hex = text.startsWith('#') ? text.slice(1) : ''
  if (hex.length === 8) hex = hex.slice(0, 6)
  if (hex.length === 3) hex = `${hex[0]}${hex[0]}${hex[1]}${hex[1]}${hex[2]}${hex[2]}`
  if (!/^[0-9a-f]{6}$/.test(hex)) return `rgba(128, 128, 128, ${alpha})`

  const number = parseInt(hex, 16)
  const red = (number >> 16) & 0xff
  const green = (number >> 8) & 0xff
  const blue = number & 0xff
  return `rgba(${red}, ${green}, ${blue}, ${alpha})`
}

// ---------- 保存 / 重置 ----------
function refreshThemeLink() {
  const link = document.querySelector(THEME_LINK_SELECTOR)
  if (!link) return
  try {
    const url = new URL(link.href, window.location.origin)
    url.searchParams.set('v', String(Date.now()))
    link.href = url.pathname + url.search
  } catch {
    /* 非标准 URL 时忽略：下次整页加载也会拿到新样式表 */
  }
}

async function onSave() {
  if (saving.value) return
  saving.value = true

  try {
    const res = await saveThemeConfig({
      preset: form.preset,
      light: form.light,
      dark: form.dark
    })

    applySettings(res?.data?.settings || form)
    refreshThemeLink()
    toast.success('主题配色已保存并立即生效')
  } catch {
    /* 响应拦截器已提示错误 */
  } finally {
    saving.value = false
  }
}

function askReset() {
  confirm.title = '恢复默认配色'
  confirm.message = '将丢弃所有自定义颜色，恢复为「朱砂暖纸」默认预设。此操作会立即影响整站。'
  confirm.confirmText = '恢复默认'
  confirm.visible = true
}

async function runConfirm() {
  if (confirm.loading) return
  confirm.loading = true

  try {
    const res = await resetThemeConfig()
    applySettings(res?.data?.settings || defaults.value)
    refreshThemeLink()
    confirm.visible = false
    toast.success('已恢复默认配色')
  } catch {
    /* 响应拦截器已提示错误 */
  } finally {
    confirm.loading = false
  }
}

onMounted(load)
</script>

<style scoped>
.theme-admin {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

/* ---------- 概览 ---------- */
.panel-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
}
.block-title {
  margin: 0;
  font-size: 18px;
}
.block-desc {
  margin: 6px 0 0;
  max-width: 74ch;
  color: var(--text-muted);
  font-size: 13px;
  line-height: 1.7;
}
.head-actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}
.theme-meta {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  margin-top: 14px;
}
.theme-chip {
  padding: 4px 10px;
  border: 1px solid var(--border-soft);
  border-radius: 999px;
  background: var(--bg-muted);
  color: var(--text-soft);
  font-size: 12px;
}
.theme-chip code {
  font-family: var(--font-mono);
  font-size: 11px;
  color: var(--text-muted);
}
.theme-chip.is-dirty {
  border-color: var(--primary-soft);
  color: var(--primary);
}
.stat-error {
  display: flex;
  align-items: center;
  gap: 6px;
  margin: 12px 0 0;
  color: var(--danger);
  font-size: 12px;
}

/* ---------- 小节标题 ---------- */
.section-head {
  margin-bottom: 14px;
}
.section-title {
  margin: 0;
  font-size: 14px;
  font-weight: 600;
}
.section-desc {
  margin: 4px 0 0;
  color: var(--text-muted);
  font-size: 12px;
}

.loading {
  padding: 40px;
  text-align: center;
  color: var(--text-muted);
  font-size: 13px;
}

/* ---------- 预设 ---------- */
.preset-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(210px, 1fr));
  gap: 12px;
}
.preset-card {
  position: relative;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  background: var(--bg-card);
  color: var(--text);
  text-align: left;
  cursor: pointer;
  transition: border-color var(--dur-fast) var(--ease), box-shadow var(--dur-fast) var(--ease);
}
.preset-card:hover {
  border-color: var(--primary-soft);
}
.preset-card.active {
  border-color: var(--primary);
  box-shadow: 0 0 0 3px var(--accent-ring);
}
.preset-swatches {
  display: grid;
  grid-template-columns: repeat(2, 14px);
  grid-template-rows: repeat(2, 14px);
  flex-shrink: 0;
  overflow: hidden;
  border: 1px solid var(--border);
  border-radius: 6px;
}
.preset-swatches i {
  display: block;
  width: 14px;
  height: 14px;
}
.preset-body {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}
.preset-body strong {
  font-size: 13px;
}
.preset-body small {
  color: var(--text-muted);
  font-size: 11px;
  line-height: 1.5;
}
.preset-check {
  position: absolute;
  top: 10px;
  right: 10px;
  color: var(--primary);
  font-size: 13px;
}

/* ---------- 编辑区 ---------- */
.theme-layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 360px;
  gap: 16px;
  align-items: start;
}
@media (max-width: 1180px) {
  .theme-layout {
    grid-template-columns: minmax(0, 1fr);
  }
}
.editor-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
  margin-bottom: 16px;
}
.mode-tabs {
  display: inline-flex;
  gap: 4px;
  padding: 4px;
  border-radius: var(--radius);
  background: var(--bg-muted);
}
.mode-tab {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: var(--control-h-sm);
  padding: 0 12px;
  border-radius: var(--radius-sm);
  color: var(--text-soft);
  font-size: 12px;
  cursor: pointer;
  transition: all var(--dur-fast) var(--ease);
}
.mode-tab:hover {
  color: var(--text);
}
.mode-tab.active {
  background: var(--bg-card);
  color: var(--primary);
  font-weight: 600;
  box-shadow: var(--shadow-sm);
}
.token-group + .token-group {
  margin-top: 20px;
  padding-top: 18px;
  border-top: 1px dashed var(--border-soft);
}
.token-group-head h4 {
  margin: 0;
  font-size: 13px;
}
.token-group-head p {
  margin: 2px 0 12px;
  color: var(--text-muted);
  font-size: 12px;
}
.token-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: 12px;
}
.token-label {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 6px;
  color: var(--text-soft);
  font-size: 12px;
}
.token-label code {
  color: var(--text-muted);
  font-family: var(--font-mono);
  font-size: 11px;
}
.token-input {
  display: flex;
  align-items: center;
  gap: 8px;
}
.token-color {
  flex-shrink: 0;
  width: 38px;
  height: 38px;
  padding: 0;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  background: var(--bg-muted);
  cursor: pointer;
}
.token-text {
  height: 38px;
  font-family: var(--font-mono);
  font-size: 12px;
}
.token-text.is-invalid {
  border-color: var(--danger);
}
.token-item .form-hint {
  margin: 6px 0 0;
  font-size: 11px;
}
.form-hint.is-error {
  color: var(--danger);
}

/* ---------- 预览 ---------- */
.preview-wrap {
  position: sticky;
  top: 16px;
}
.preview-pair {
  display: grid;
  grid-template-columns: 1fr;
  gap: 12px;
}
.theme-preview {
  display: flex;
  flex-direction: column;
  gap: 9px;
  padding: 14px;
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  background: var(--bg);
  color: var(--text);
}
.preview-mode {
  color: var(--text-muted);
  font-size: 10px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}
.preview-title {
  color: var(--text);
  font-family: var(--font-serif);
  font-size: 15px;
  font-weight: 900;
}
.preview-text {
  margin: 0;
  color: var(--text-soft);
  font-size: 12px;
  line-height: 1.6;
}
.preview-row {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
}
.preview-btn {
  padding: 5px 10px;
  border: 1px solid transparent;
  border-radius: var(--radius-sm);
  font-size: 11px;
}
.preview-btn.primary {
  background: var(--primary);
  color: #fff;
}
.preview-btn.ghost {
  border-color: var(--border);
  color: var(--text-soft);
}
.preview-chip {
  padding: 3px 8px;
  border-radius: 999px;
  background: var(--accent-soft);
  color: var(--primary-deep);
  font-size: 10px;
}
.preview-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 10px;
  border: 1px solid var(--border-soft);
  border-radius: var(--radius);
  background: var(--bg-card);
}
.preview-label {
  color: var(--text-muted);
  font-size: 11px;
}
.preview-success {
  color: var(--success);
  font-size: 11px;
}
.preview-warning {
  color: var(--warning);
  font-size: 11px;
}
.preview-input {
  display: flex;
  align-items: center;
  height: 32px;
  padding: 0 10px;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  background: var(--bg-muted);
  color: var(--text-light);
  font-size: 11px;
}
.preview-link {
  color: var(--link);
  font-size: 11px;
}
</style>
