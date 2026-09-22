<template>
  <div
    ref="rootRef"
    class="select-menu"
    :class="[`is-${variant}`, { 'is-open': open, 'is-up': openUp, 'is-disabled': disabled }]"
  >
    <!-- 触发器 -->
    <button
      type="button"
      class="select-trigger"
      :disabled="disabled"
      aria-haspopup="listbox"
      :aria-expanded="open ? 'true' : 'false'"
      @click="toggle"
      @keydown="onKeydown"
    >
      <span class="select-trigger__main">
        <i v-if="icon" :class="icon" class="select-icon" aria-hidden="true" />
        <span class="select-value" :class="{ 'is-placeholder': !selected }">
          {{ selected ? selected.label : placeholder }}
        </span>
      </span>
      <i class="bi bi-chevron-down select-caret" aria-hidden="true" />
    </button>

    <!-- 选项浮层（主题内置样式，替代无法定制样式的原生 select 下拉） -->
    <Transition name="select-pop">
      <div v-if="open" class="select-panel" role="listbox">
        <button
          v-for="(opt, i) in options"
          :key="`${opt.value}-${i}`"
          type="button"
          class="select-option"
          role="option"
          :class="{
            'is-active': i === activeIndex,
            'is-selected': isSelected(opt),
            'is-disabled': opt.disabled
          }"
          :aria-selected="isSelected(opt) ? 'true' : 'false'"
          :disabled="!!opt.disabled"
          @mouseenter="activeIndex = i"
          @click="choose(opt)"
        >
          <span class="select-option__label">{{ opt.label }}</span>
          <i v-if="isSelected(opt)" class="bi bi-check2" aria-hidden="true" />
        </button>
        <div v-if="!options.length" class="select-empty">暂无可选项</div>
      </div>
    </Transition>
  </div>
</template>

<script setup>
import { ref, computed, nextTick, onMounted, onUnmounted } from 'vue'

const props = defineProps({
  modelValue: { type: [String, Number], default: '' },
  // 选项：{ value, label, disabled? }
  options: { type: Array, default: () => [] },
  placeholder: { type: String, default: '请选择' },
  icon: { type: String, default: '' },
  // 外观形态：pill 胶囊按钮（默认）/ field 表单输入框（对齐主题 .input）
  variant: { type: String, default: 'pill' },
  disabled: { type: Boolean, default: false },
  // 浮层方向：auto（默认，空间不足自动向上）/ bottom / top
  placement: { type: String, default: 'auto' }
})

const emit = defineEmits(['update:modelValue', 'change'])

const rootRef = ref(null)
const open = ref(false)
const openUp = ref(false)
const activeIndex = ref(-1)

const selectedIndex = computed(() =>
  props.options.findIndex((opt) => String(opt.value) === String(props.modelValue ?? ''))
)
const selected = computed(() => (selectedIndex.value > -1 ? props.options[selectedIndex.value] : null))

const isSelected = (opt) => String(opt.value) === String(props.modelValue ?? '')

function toggle() {
  if (props.disabled) return
  open.value ? close() : openPanel()
}

function openPanel() {
  if (props.disabled) return
  open.value = true
  activeIndex.value = selectedIndex.value > -1 ? selectedIndex.value : firstEnabledIndex()
  nextTick(() => {
    updatePlacement()
    scrollActiveIntoView()
  })
}

function close() {
  open.value = false
}

function firstEnabledIndex() {
  const i = props.options.findIndex((opt) => !opt.disabled)
  return i < 0 ? 0 : i
}

function choose(opt) {
  if (!opt || opt.disabled) return
  emit('update:modelValue', opt.value)
  emit('change', opt.value)
  close()
  nextTick(() => rootRef.value?.querySelector('.select-trigger')?.focus())
}

function move(step) {
  const total = props.options.length
  if (!total) return
  let i = activeIndex.value
  for (let n = 0; n < total; n++) {
    i = (i + step + total) % total
    if (!props.options[i].disabled) break
  }
  activeIndex.value = i
  scrollActiveIntoView()
}

function onKeydown(e) {
  const key = e.key
  if (key === 'Escape') {
    if (open.value) {
      e.preventDefault()
      close()
    }
    return
  }
  if (!open.value) {
    if (key === 'Enter' || key === ' ' || key === 'ArrowDown' || key === 'ArrowUp') {
      e.preventDefault()
      openPanel()
      if (key === 'ArrowUp') move(-1)
    }
    return
  }
  if (key === 'ArrowDown') {
    e.preventDefault()
    move(1)
  } else if (key === 'ArrowUp') {
    e.preventDefault()
    move(-1)
  } else if (key === 'Enter') {
    e.preventDefault()
    choose(props.options[activeIndex.value])
  } else if (key === 'Home') {
    e.preventDefault()
    activeIndex.value = 0
    scrollActiveIntoView()
  } else if (key === 'End') {
    e.preventDefault()
    activeIndex.value = props.options.length - 1
    scrollActiveIntoView()
  } else if (key === 'Tab') {
    close()
  }
}

/** 空间不足时向上展开（编辑器底部操作栏场景） */
function updatePlacement() {
  if (props.placement !== 'auto') {
    openUp.value = props.placement === 'top'
    return
  }
  if (!rootRef.value) return
  const rect = rootRef.value.getBoundingClientRect()
  const spaceBelow = window.innerHeight - rect.bottom
  const spaceAbove = rect.top
  openUp.value = spaceBelow < 300 && spaceAbove > spaceBelow
}

function scrollActiveIntoView() {
  nextTick(() => {
    const el = rootRef.value?.querySelectorAll('.select-option')[activeIndex.value]
    el?.scrollIntoView({ block: 'nearest' })
  })
}

function onDocPointerDown(e) {
  if (!open.value) return
  if (!rootRef.value?.contains(e.target)) close()
}

function onWindowScroll(e) {
  if (!open.value || !rootRef.value) return
  // 浮层自身滚动不关闭
  if (e.target instanceof Node && rootRef.value.contains(e.target)) return
  close()
}

onMounted(() => {
  document.addEventListener('mousedown', onDocPointerDown)
  document.addEventListener('touchstart', onDocPointerDown, { passive: true })
  window.addEventListener('resize', updatePlacement)
  window.addEventListener('scroll', onWindowScroll, true)
})

onUnmounted(() => {
  document.removeEventListener('mousedown', onDocPointerDown)
  document.removeEventListener('touchstart', onDocPointerDown)
  window.removeEventListener('resize', updatePlacement)
  window.removeEventListener('scroll', onWindowScroll, true)
})
</script>

<style scoped>
.select-menu {
  position: relative;
  display: inline-flex;
}

/* ---------- 触发器（与主题的胶囊按钮一致） ---------- */
.select-trigger {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  max-width: 220px;
  /* 与 .btn-sm / 筛选栏其它控件等高（见 styles.css 的 --control-h-* 令牌） */
  height: var(--control-h-sm);
  padding: 0 12px;
  font-family: inherit;
  font-size: 13px;
  line-height: 1;
  border: 1px solid var(--border);
  border-radius: 999px;
  background: var(--bg-card);
  color: var(--text-soft);
  cursor: pointer;
  transition: border-color var(--dur-fast) var(--ease), color var(--dur-fast) var(--ease),
    box-shadow var(--dur-fast) var(--ease);
}
.select-trigger:hover:not(:disabled) {
  border-color: var(--primary-soft);
  color: var(--primary);
}
.select-menu.is-open .select-trigger {
  border-color: var(--primary);
  color: var(--primary-deep);
  box-shadow: 0 0 0 3px var(--accent-ring);
}
.select-trigger:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}
.select-trigger__main {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
}
.select-icon {
  font-size: 13px;
}
.select-value {
  min-width: 0;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}
.select-value.is-placeholder {
  color: var(--text-light);
}
.select-caret {
  font-size: 11px;
  opacity: 0.7;
  transition: transform var(--dur-fast) var(--ease);
}
.select-menu.is-open .select-caret {
  transform: rotate(180deg);
}

/* ---------- 变体：表单输入框（对齐主题 .input） ---------- */
.select-menu.is-field {
  display: flex;
  width: 100%;
}
.select-menu.is-field .select-trigger {
  width: 100%;
  max-width: none;
  /* 与 .input 等高：表单里输入框与下拉不能一高一矮 */
  height: var(--control-h);
  justify-content: space-between;
  gap: 8px;
  padding: 0 12px;
  font-size: 14px;
  line-height: 1.5;
  border-radius: var(--radius);
  border-color: var(--border);
  background: var(--bg-muted);
  color: var(--text);
}
.select-menu.is-field .select-trigger:hover:not(:disabled) {
  border-color: var(--primary-soft);
  color: var(--text);
}
.select-menu.is-field.is-open .select-trigger {
  border-color: var(--primary);
  color: var(--text);
  box-shadow: 0 0 0 3px var(--accent-ring);
}
.select-menu.is-field .select-icon {
  font-size: 14px;
  color: var(--text-muted);
}
.select-menu.is-field .select-caret {
  font-size: 12px;
}
.select-menu.is-field .select-panel {
  max-width: none;
}
.select-menu.is-field .select-option {
  font-size: 14px;
}

/* ---------- 浮层 ---------- */
.select-panel {
  position: absolute;
  left: 0;
  z-index: 60;
  min-width: 100%;
  max-width: 320px;
  max-height: 280px;
  overflow-y: auto;
  padding: 4px;
  display: flex;
  flex-direction: column;
  gap: 2px;
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-md);
}
.select-menu:not(.is-up) .select-panel {
  top: calc(100% + 6px);
}
.select-menu.is-up .select-panel {
  bottom: calc(100% + 6px);
}

.select-option {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  width: 100%;
  padding: 7px 10px;
  font-family: inherit;
  font-size: 13px;
  line-height: 1.7;
  text-align: left;
  border: none;
  border-radius: var(--radius-sm);
  background: transparent;
  color: var(--text-soft);
  cursor: pointer;
  transition: background var(--dur-fast) var(--ease), color var(--dur-fast) var(--ease);
}
.select-option__label {
  min-width: 0;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}
.select-option.is-active {
  background: var(--bg-muted);
}
.select-option.is-selected {
  color: var(--primary-deep);
  font-weight: 600;
}
.select-option.is-selected .bi {
  color: var(--primary);
}
.select-option:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.select-empty {
  padding: 10px;
  font-size: 12px;
  color: var(--text-light);
  text-align: center;
}

/* ---------- 动效 ---------- */
.select-pop-enter-active,
.select-pop-leave-active {
  transition: opacity var(--dur-fast) var(--ease), transform var(--dur-fast) var(--ease);
}
.select-pop-enter-from,
.select-pop-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}
.select-menu.is-up .select-pop-enter-from,
.select-menu.is-up .select-pop-leave-to {
  transform: translateY(4px);
}
</style>
