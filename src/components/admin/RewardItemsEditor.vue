<template>
  <div class="reward-editor">
    <div v-if="!list.length" class="reward-editor__empty">暂无奖励项，点下方「添加奖励」新增</div>

    <div v-for="(item, index) in list" :key="index" class="reward-row">
      <select v-model="item.asset" class="input reward-row__asset" title="奖励类型（可扩展：见 model/reward.go 的资产注册表）">
        <option v-for="asset in assets" :key="asset.key" :value="asset.key">{{ asset.name }}</option>
      </select>
      <input
        v-model.number="item.value"
        class="input reward-row__value"
        type="number"
        min="0"
        step="1"
        :placeholder="valuePlaceholder(item)"
        :title="assetOf(item)?.desc || ''"
      />
      <!-- 卡密：池子为空时的降级方式 -->
      <select
        v-if="isCard(item)"
        v-model="item.fallback"
        class="input reward-row__fallback"
        title="卡密池没有可用卡密时怎么办"
      >
        <option value="integral">无卡改发积分</option>
        <option value="exp">无卡改发经验</option>
        <option value="none">无卡不发</option>
      </select>
      <input
        v-if="chance"
        v-model.number="item.chance"
        class="input reward-row__chance"
        type="number"
        min="0"
        max="100"
        step="1"
        placeholder="概率%"
        title="触发概率（0 或 100 表示必得）"
      />
      <input
        v-model="item.label"
        class="input reward-row__label"
        type="text"
        maxlength="16"
        placeholder="备注（可选）"
      />
      <button class="btn btn-ghost btn-sm" type="button" title="删除该奖励" @click="remove(index)">
        <i class="bi bi-x-lg" />
      </button>
    </div>

    <div class="reward-editor__foot">
      <button class="btn btn-sm" type="button" @click="add">
        <i class="bi bi-plus-lg" /> 添加奖励
      </button>
      <span v-if="hint" class="reward-editor__hint">{{ hint }}</span>
    </div>

    <!-- 选中卡密时给出该资产的说明，避免把「面额」当成张数填 -->
    <p v-if="cardHint" class="reward-editor__hint reward-editor__hint--full">
      <i class="bi bi-ticket-perforated" /> {{ cardHint }}
    </p>
  </div>
</template>

<script setup>
/**
 * 奖励项编辑器（后台签到页复用）
 *
 * 一行 = 一个奖励项：资产类型 + 数值（+ 卡密的降级方式、随机奖励的概率），
 * 对应后端 model.RewardItem：
 *   { asset: 'exp' | 'integral' | 'card' | 自定义, value: 10, label: '幸运奖励' }
 *   { asset: 'card', value: 50, fallback: 'integral' }   // 卡密池为空时改发 50 积分
 *
 * 资产清单（名称 / 单位 / 图标 / 说明）来自 /api/checkin/rules 的 assets 字段，
 * 因此二次开发注册的新资产会自动出现在下拉框里。
 */
import { computed } from 'vue'

const props = defineProps({
  // 奖励项数组：由父组件持有，编辑时原位更新
  modelValue: { type: Array, default: () => [] },
  // 可选资产清单：[{ key, name, unit, icon, desc }]，来自 /api/checkin/rules
  assets: { type: Array, default: () => [] },
  // 是否显示「概率」列（随机奖励用）
  chance: { type: Boolean, default: false },
  // 底部提示文案
  hint: { type: String, default: '' }
})

const emit = defineEmits(['update:modelValue'])

const list = computed(() => props.modelValue || [])

function assetOf(item) {
  return props.assets.find((asset) => asset.key === item?.asset) || null
}

function isCard(item) {
  return item?.asset === 'card'
}

// 卡密填的是面额而不是数量，这里给个针对性提示
function valuePlaceholder(item) {
  const asset = assetOf(item)
  if (asset?.key === 'card') return '面额'
  return '数值'
}

// 列表里只要有卡密项，就在底部提示一次卡密的填写与降级规则
const cardHint = computed(() => {
  if (!list.value.some((item) => isCard(item))) return ''
  return '卡密：数值填「面额」（0 表示不限面额），卡密用「后台 → 积分 → 卡密」生成；池子里没有可用卡密时按左侧的降级方式发放，签到不会失败。'
})

function add() {
  const asset = props.assets[0]?.key || 'exp'
  emit('update:modelValue', [...list.value, { asset, value: 1, label: '' }])
}

function remove(index) {
  const next = [...list.value]
  next.splice(index, 1)
  emit('update:modelValue', next)
}
</script>

<style scoped>
.reward-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}
.reward-row__asset {
  width: 110px;
  flex-shrink: 0;
}
.reward-row__value {
  width: 96px;
  flex-shrink: 0;
}
.reward-row__fallback {
  width: 130px;
  flex-shrink: 0;
}
.reward-row__chance {
  width: 96px;
  flex-shrink: 0;
}
.reward-row__label {
  flex: 1;
  min-width: 0;
}
.reward-editor__empty {
  margin-bottom: 8px;
  font-size: 12px;
  color: var(--text-muted);
}
.reward-editor__foot {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}
.reward-editor__hint {
  font-size: 12px;
  color: var(--text-muted);
}
.reward-editor__hint--full {
  display: block;
  width: 100%;
  margin: 8px 0 0;
  line-height: 1.7;
}
.reward-editor__hint--full i {
  color: var(--primary);
}
</style>
