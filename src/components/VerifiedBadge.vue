<template>
  <span v-if="cert && cert.title" class="verified-badge" :class="sizeClass" :style="{ color: toneColor }" :title="tip">
    <i class="bi bi-patch-check-fill" aria-hidden="true" />
    <span v-if="showText" class="verified-text">{{ cert.title }}</span>
  </span>
</template>

<script setup>
import { computed } from 'vue'
import { certColor } from '@/utils/cert'

/**
 * 认证标识（昵称旁的金色 / 蓝色 / 绿色小盾牌）
 *
 * 数据来自 GET user-certification/one（后端 model.CertSummary），只有「已通过且未过期」
 * 才会返回，所以这里不需要再判断状态。
 *
 * 用法：
 *   <VerifiedBadge :cert="cert" />                     // 昵称旁，仅图标 + hover 提示
 *   <VerifiedBadge :cert="cert" show-text size="sm" />  // 带认证名称
 *
 * 颜色由类型配置决定（utils/cert 的 certColor）：后台给「认证类型」配了就按配置，
 * 没配则内置兜底——职业=金 / 兴趣=蓝 / 机构=绿。
 * 简介下的认证行读同一个函数，保证同一认证在页面上只有一个颜色。
 */
const props = defineProps({
  // 后端 CertSummary：{ cert_type, type_text, title, description, handle_time }（不含认证领域）
  cert: { type: Object, default: null },
  // 是否在图标后显示认证名称
  showText: { type: Boolean, default: false },
  // sm / md（昵称行用 md，列表里用 sm）
  size: { type: String, default: 'md' }
})

const toneColor = computed(() => certColor(props.cert || {}))

const sizeClass = computed(() => (props.size === 'sm' ? 'is-sm' : 'is-md'))

const tip = computed(() => {
  const cert = props.cert || {}
  const type = cert.type_text || '认证'
  // 认证领域（category）不在公开摘要里返回，hover 只给类型 + 名称 + 后台写的说明
  const desc = cert.description ? `\n${cert.description}` : ''
  return `${type} · ${cert.title || ''}${desc}`
})
</script>

<style scoped>
.verified-badge {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  flex-shrink: 0;
  font-weight: 600;
  line-height: 1;
  cursor: help;
}
.verified-badge.is-md {
  font-size: 15px;
}
.verified-badge.is-sm {
  font-size: 12px;
}
.verified-text {
  font-size: 11px;
  font-weight: 600;
  padding: 1px 6px;
  border-radius: 999px;
  color: inherit;
  background: color-mix(in srgb, currentColor 12%, transparent);
  border: 1px solid color-mix(in srgb, currentColor 35%, transparent);
  white-space: nowrap;
}
</style>
