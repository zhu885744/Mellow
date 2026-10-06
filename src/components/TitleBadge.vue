<template>
  <span v-if="label" class="title-badge" :class="[`title-badge--${size}`, { 'is-animated': animated }]" :style="badgeStyle">
    <i v-if="payload?.icon" :class="payload.icon" class="title-badge-icon" />
    <span class="title-badge-text">{{ label }}</span>
  </span>
</template>

<script setup>
import { computed } from 'vue'

/**
 * TitleBadge - 统一的头衔/称号渲染组件
 *
 * 数据来源：用户 json.title_decoration = { id, name, payload }
 * 兼容旧数据：没有 payload 时退化为纯文本展示，颜色沿用旧的文本映射。
 *
 * payload 约定（由后台装扮管理器可视化编辑）：
 *   text     头衔文字（为空时使用用户自填文字）
 *   color    文字颜色
 *   bg       背景（支持纯色与 linear-gradient(...)）
 *   border   边框（CSS 值）
 *   glow     发光（CSS box-shadow 值）
 *   icon     Bootstrap Icons 类名
 *   animated 是否开启动效
 */
const props = defineProps({
  payload: { type: Object, default: () => ({}) },
  text: { type: String, default: '' },
  size: { type: String, default: 'md' } // sm | md | lg
})

const label = computed(() => props.text || props.payload?.text || '')
const animated = computed(() => props.payload?.animated === true || props.payload?.animated === 1)

const badgeStyle = computed(() => {
  const p = props.payload || {}
  const style = {}

  if (p.color) style.color = p.color
  if (p.bg) style.background = p.bg
  if (p.glow) style.boxShadow = String(p.glow).includes('px') ? p.glow : `0 0 10px ${p.glow}`

  // border 支持两种写法：完整 CSS 值，或仅颜色（自动补成 1px solid）
  if (p.border) {
    style.border = String(p.border).includes(' ') ? p.border : `1px solid ${p.border}`
  }

  return style
})
</script>

<style scoped>
.title-badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  border-radius: 6px;
  font-weight: 600;
  line-height: 1.4;
  white-space: nowrap;
  vertical-align: middle;
  /* 无 payload 时的兜底样式（等价于原来的纯文本头衔） */
  color: #b45309;
  background: #fef3c7;
  border: 1px solid #fcd34d;
}

.title-badge--sm {
  padding: 0 6px;
  font-size: 11px;
}

.title-badge--md {
  padding: 1px 8px;
  font-size: 12px;
}

.title-badge--lg {
  padding: 3px 12px;
  font-size: 14px;
}

.title-badge-icon {
  font-size: 0.9em;
  line-height: 1;
}

.title-badge.is-animated {
  animation: title-badge-shine 2.4s ease-in-out infinite;
}

@keyframes title-badge-shine {
  0%,
  100% {
    filter: brightness(1);
  }
  50% {
    filter: brightness(1.28);
  }
}
</style>
