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
  border-radius: 4px;
  font-weight: 600;
  white-space: nowrap;
  vertical-align: middle;
  /*
   * 注意：这里**不要**写 line-height。
   * 旧的 .c-title / .author-title 都不设行高（继承所在行的行高），
   * 写死成 1.4 会让标签比默认头衔矮一截，看起来就是「内边距特别小」。
   * 同理不加默认边框：旧标签只有背景色，多 1px 边框也会让视觉高度不同。
   */
  /* 无 payload 时的兜底配色 */
  color: #b45309;
  background: #fef3c7;
}

/* 尺寸与旧标签逐项对齐，避免同一位置「装扮头衔」和「默认头衔」看起来不一样大：
   sm → 列表（.c-title：11px / 1px 6px）
   md → 作者主页（.author-title：12px / 2px 8px）
   lg → 装扮商城 / 我的装扮 的大号预览 */
.title-badge--sm {
  padding: 1px 6px;
  font-size: 11px;
}

.title-badge--md {
  padding: 2px 8px;
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
