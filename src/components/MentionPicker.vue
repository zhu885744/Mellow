<template>
  <div class="mention-picker" :style="panelStyle" role="listbox" aria-label="选择要 @ 的用户">
    <p v-if="loading" class="mention-picker__tip">加载中…</p>
    <p v-else-if="!list.length" class="mention-picker__tip">
      {{ keyword ? '没有匹配的已关注用户' : '你还没有关注任何人' }}
    </p>
    <template v-else>
      <button
        v-for="(item, index) in list"
        :key="item.id"
        type="button"
        class="mention-item"
        :class="{ 'is-active': index === active }"
        role="option"
        :aria-selected="index === active"
        @mousedown.prevent="select(item)"
        @mouseenter="active = index"
      >
        <img v-if="item.avatar" class="mention-item__avatar" :src="fullUrl(item.avatar)" :alt="item.nickname" loading="lazy" />
        <span v-else class="mention-item__avatar mention-item__avatar--text">{{ item.nickname.slice(0, 1) }}</span>
        <span class="mention-item__name">{{ item.nickname }}</span>
      </button>
    </template>
  </div>
</template>

<script setup>
/**
 * @ 用户选择器（浮层）
 *
 * 只列出**当前用户已关注的人** —— 与后端 app/model/mention.go 的口径完全一致：
 * 未关注的人后端也不会解析成提及，所以这里不给候选。
 *
 * 用法：父级（编辑器）自己监听光标前的「@关键词」，把关键词与浮层坐标传进来；
 * 键盘上下键 / 回车由父级转发给自己的 move() / selectActive()（见 EmojiEditor.vue），
 * 因为焦点始终在 contenteditable 里，事件不会落到本组件上。
 */
import { computed, onMounted, ref, watch } from 'vue'
import { getMentionCandidates } from '@/api/mention'
import { getFullUrl } from '@/utils/runtimeConfig'

const props = defineProps({
  // 光标前已输入的关键词（@ 之后的部分）
  keyword: { type: String, default: '' },
  // 浮层坐标（**视口坐标**，配合 position: fixed）：
  //   left   面板左边缘
  //   top    向下展开时的上边缘
  //   flipTo 向上展开时的下边缘（下方空间不足时由调用方给出，null 表示向下展开）
  //
  // 用视口坐标而不是"相对某个容器"的坐标：后者要扣除内边距与祖先偏移，
  // 一旦容器层级变化（比如编辑器外面多包一层）就会整体错位。
  position: { type: Object, default: () => ({ left: 0, top: 0, flipTo: null }) }
})

// 面板宽度 200 + 右侧留白；最大高度 236 + 间距（与样式保持一致）
const PANEL_WIDTH = 208
const PANEL_HEIGHT = 246

// 视口坐标 → fixed 定位样式：左右贴边收拢、下方空间不足时向上翻开
const panelStyle = computed(() => {
  const left = Math.max(8, Math.min(props.position.left || 0, Math.max(8, window.innerWidth - PANEL_WIDTH)))

  if (props.position.flipTo != null) {
    const bottom = Math.max(8, window.innerHeight - props.position.flipTo)
    return { left: `${left}px`, top: 'auto', bottom: `${bottom}px` }
  }

  const top = Math.max(8, Math.min(props.position.top || 0, Math.max(8, window.innerHeight - PANEL_HEIGHT)))
  return { left: `${left}px`, top: `${top}px`, bottom: 'auto' }
})

const emit = defineEmits(['select'])

const MAX_SHOW = 8

const all = ref([])
const loading = ref(true)
const active = ref(0)

const fullUrl = getFullUrl

const list = computed(() => {
  const keyword = props.keyword.trim().toLowerCase()
  const matched = keyword ? all.value.filter((item) => item.nickname.toLowerCase().includes(keyword)) : all.value
  return matched.slice(0, MAX_SHOW)
})

// 关键词变化后回到第一项，避免上下键从上次的位置继续
watch(
  () => props.keyword,
  () => {
    active.value = 0
  }
)

watch(list, () => {
  if (active.value >= list.value.length) active.value = 0
})

onMounted(async () => {
  all.value = await getMentionCandidates()
  loading.value = false
})

/** 上下键移动高亮项（父级转发） */
function move(delta) {
  if (!list.value.length) return
  const total = list.value.length
  active.value = (active.value + delta + total) % total
}

/** 回车选中当前高亮项；返回是否消费了这次回车 */
function selectActive() {
  const item = list.value[active.value]
  if (!item) return false
  select(item)
  return true
}

function select(item) {
  emit('select', item)
}

defineExpose({ move, selectActive })
</script>

<style scoped>
.mention-picker {
  /* fixed + 视口坐标：直接贴在光标处，不受编辑器容器内边距 / 祖先偏移影响，
     也不会被弹窗的 overflow: hidden 裁掉（高于弹窗层级 2900，低于确认弹窗 3000） */
  position: fixed;
  z-index: 2950;
  width: 200px;
  max-height: 236px;
  overflow-y: auto;
  padding: 4px;
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  box-shadow: var(--shadow-md);
}
.mention-picker__tip {
  margin: 0;
  padding: 8px 10px;
  font-size: 12px;
  color: var(--text-muted);
}
.mention-item {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  padding: 6px 8px;
  border: none;
  border-radius: var(--radius-sm, 4px);
  background: transparent;
  color: var(--text);
  font-size: 13px;
  font-family: inherit;
  text-align: left;
  cursor: pointer;
}
.mention-item.is-active {
  background: var(--bg-muted);
}
.mention-item__avatar {
  flex-shrink: 0;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  object-fit: cover;
  background: var(--bg-muted);
}
.mention-item__avatar--text {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  color: var(--text-muted);
}
.mention-item__name {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
