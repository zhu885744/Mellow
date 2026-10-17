<template>
  <div class="scope-radio" role="radiogroup" :aria-label="label">
    <label
      v-for="opt in options"
      :key="opt.value"
      class="scope-radio__item"
      :class="{ 'is-checked': Number(modelValue) === Number(opt.value), 'is-disabled': disabled }"
    >
      <input
        class="scope-radio__input"
        type="radio"
        :name="name || undefined"
        :value="opt.value"
        :checked="Number(modelValue) === Number(opt.value)"
        :disabled="disabled"
        @change="pick(opt.value)"
      />
      <span class="scope-radio__dot" aria-hidden="true" />
      <span class="scope-radio__text">{{ opt.label }}</span>
    </label>
  </div>
</template>

<script setup>
/**
 * 可见范围单选框组（公开 / 登录可见 / 付费可见）
 *
 * 供动态发布器、动态编辑弹窗、文章 / 独立页面写作页、评论与回复共用，
 * 统一用单选框而不是下拉：可见范围只有 2~3 个选项，平铺更直观、少一次点击。
 *
 * 说明：
 * - 不传 name 时浏览器不做原生互斥，状态完全由 v-model 驱动 —— 同一页面里可能同时有
 *   多组单选框（评论树里每个回复框各一组），共用一个 name 会互相取消选中；
 * - 选项由调用方传入，评论只传「公开 / 登录可见」两档。
 */
const props = defineProps({
  modelValue: { type: [String, Number], default: 1 },
  options: { type: Array, default: () => [] },
  // 可访问性用：读屏时播报的组名
  label: { type: String, default: '可见范围' },
  // 原生 name（同一表单内多组时传不同值；不传则不做原生互斥）
  name: { type: String, default: '' },
  disabled: { type: Boolean, default: false }
})

const emit = defineEmits(['update:modelValue'])

function pick(value) {
  if (props.disabled) return
  emit('update:modelValue', Number(value))
}
</script>

<style scoped>
.scope-radio {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 6px 16px;
}
.scope-radio__item {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  line-height: 1.4;
  color: var(--text-soft);
  cursor: pointer;
  user-select: none;
}
.scope-radio__item.is-disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
.scope-radio__input {
  position: absolute;
  width: 1px;
  height: 1px;
  margin: -1px;
  padding: 0;
  overflow: hidden;
  clip: rect(0 0 0 0);
  white-space: nowrap;
  border: 0;
}
/* 自定义圆点：未选中是空圆，选中是主色圆环 + 实心点 */
.scope-radio__dot {
  position: relative;
  flex: none;
  width: 14px;
  height: 14px;
  border: 1px solid var(--border);
  border-radius: 50%;
  background: var(--bg);
  transition: border-color 0.15s;
}
.scope-radio__dot::after {
  content: '';
  position: absolute;
  inset: 3px;
  border-radius: 50%;
  background: var(--primary);
  opacity: 0;
  transform: scale(0.6);
  transition: opacity 0.15s, transform 0.15s;
}
.scope-radio__item:hover .scope-radio__dot {
  border-color: var(--primary);
}
.scope-radio__item.is-checked .scope-radio__dot {
  border-color: var(--primary);
}
.scope-radio__item.is-checked .scope-radio__dot::after {
  opacity: 1;
  transform: scale(1);
}
.scope-radio__item.is-checked .scope-radio__text {
  color: var(--text);
  font-weight: 500;
}
.scope-radio__input:focus-visible + .scope-radio__dot {
  box-shadow: 0 0 0 3px var(--accent-ring);
}
</style>
