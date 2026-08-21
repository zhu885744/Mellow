<template>
  <div v-if="show" class="emoji-picker-panel">
    <!-- 分类导航 -->
    <div class="emoji-cats">
      <button
        v-for="cat in allCategories"
        :key="cat.key"
        type="button"
        :class="['emoji-cat', { active: activeCategory === cat.key }]"
        @click="activeCategory = cat.key"
      >{{ cat.label }}</button>
    </div>

    <!-- 表情网格 -->
    <div class="emoji-grid">
      <!-- 本地颜文字 -->
      <template v-if="currentCategoryType === 'local'">
        <button
          v-for="(emoji, idx) in currentEmojis"
          :key="idx"
          type="button"
          class="emoji-item text-emoji"
          :title="emoji.text || emoji"
          @click="selectEmoji(emoji.icon || emoji)"
        >{{ emoji.icon || emoji }}</button>
      </template>
      <!-- API 表情图片 -->
      <template v-else>
        <button
          v-for="(emoji, idx) in currentEmojis"
          :key="idx"
          type="button"
          class="emoji-item img-emoji"
          :title="emoji.name"
          @click="selectApiEmoji(emoji)"
        >
          <img :src="getFullUrl(emoji.url)" :alt="emoji.name" loading="lazy" />
        </button>
      </template>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { fetchEmojiCategories, getFullUrl } from '@/utils/emoji'

const props = defineProps({
  modelValue: { type: Boolean, default: false }
})

const emit = defineEmits(['update:modelValue', 'select'])

const show = ref(props.modelValue)
const apiCategories = ref([])

// 本地颜文字（精简内置，作为 API 表情的补充）
const LOCAL_EMOJIS = {
  '颜文字': {
    type: 'local',
    items: ['(＾▽＾)', '(≧∇≦)', '(◕‿◕)', '(￣▽￣)', '(°▽°)', 'ヾ(≧▽≦*)o', '(｡♥‿♥｡)', '(╯°□°）╯', '(╥_╥)', '(＾＾)b', '(￣ε￣)', '(¬‿¬)', '(・∀・)', '(´・ω・`)', '(✿◡‿◡)', '(⊙_⊙)', '(；一_一)', '(┬┬﹏┬┬)', '(￢_￢)', '(・_・;)']
  }
}

const allCategories = computed(() => {
  const local = Object.keys(LOCAL_EMOJIS).map((key) => ({
    key: `local_${key}`,
    label: key,
    type: 'local'
  }))
  const api = apiCategories.value.map((cat) => ({
    key: `api_${cat.name}`,
    label: cat.name,
    type: 'api'
  }))
  return [...local, ...api]
})

const activeCategory = ref('')

const currentCategoryType = computed(() => {
  const cat = allCategories.value.find((c) => c.key === activeCategory.value)
  return cat?.type || 'local'
})

const currentEmojis = computed(() => {
  if (!activeCategory.value) return []
  if (currentCategoryType.value === 'local') {
    const localKey = activeCategory.value.replace('local_', '')
    return LOCAL_EMOJIS[localKey]?.items || []
  } else {
    const apiName = activeCategory.value.replace('api_', '')
    const cat = apiCategories.value.find((c) => c.name === apiName)
    return cat?.items || []
  }
})

function selectEmoji(emoji) {
  emit('select', emoji)
  close()
}

function selectApiEmoji(emoji) {
  const fullUrl = getFullUrl(emoji.url)
  // 存储格式: [emoji:URL]
  emit('select', `[emoji:${fullUrl}]`)
  close()
}

function close() {
  show.value = false
  emit('update:modelValue', false)
}

async function loadApiEmojis() {
  try {
    apiCategories.value = await fetchEmojiCategories()
  } catch {
    apiCategories.value = []
  }
}

function handleClickOutside(event) {
  const picker = event.target.closest('.emoji-picker-panel')
  const emojiButton = event.target.closest('[title="插入表情"], .emoji-btn')
  if (!picker && !emojiButton) {
    close()
  }
}

watch(
  () => props.modelValue,
  (val) => {
    show.value = val
  }
)

onMounted(() => {
  // 默认选中第一个本地分类
  const firstKey = Object.keys(LOCAL_EMOJIS)[0]
  if (firstKey) activeCategory.value = `local_${firstKey}`
  loadApiEmojis()
  document.addEventListener('click', handleClickOutside)
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
})
</script>

<style scoped>
.emoji-picker-panel {
  position: absolute;
  top: 100%;
  left: 0;
  z-index: 100;
  min-width: 320px;
  max-width: calc(100vw - 24px);
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  box-shadow: var(--shadow-md);
  max-height: 280px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  animation: emojiFadeIn 0.2s ease-out;
  margin-top: 4px;
}
@keyframes emojiFadeIn {
  from { opacity: 0; transform: translateY(-5px); }
  to { opacity: 1; transform: translateY(0); }
}
.emoji-cats {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 4px;
  padding: 8px;
  border-bottom: 1px solid var(--border-soft);
  flex-shrink: 0;
}
.emoji-cat {
  padding: 5px 12px;
  border-radius: var(--radius-sm);
  background: var(--bg-muted);
  border: 1px solid transparent;
  color: var(--text-soft);
  font-size: 12px;
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.2s;
}
.emoji-cat.active {
  background: var(--primary);
  color: #fff;
}
.emoji-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  padding: 10px;
  overflow-y: auto;
  max-height: 210px;
}
.emoji-item {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 32px;
  min-height: 32px;
  padding: 4px 8px;
  border: none;
  background: var(--bg-muted);
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition: all 0.15s;
  flex-shrink: 0;
  line-height: 1.2;
}
.emoji-item:hover {
  background: rgba(184, 153, 104, 0.15);
  transform: scale(1.08);
}
.emoji-item:active {
  transform: scale(0.95);
}
.text-emoji {
  font-size: 14px;
  color: var(--text);
}
.img-emoji {
  padding: 2px;
}
.img-emoji img {
  width: 28px;
  height: 28px;
  object-fit: contain;
  pointer-events: none;
}

@media (max-width: 768px) {
  .emoji-grid { gap: 4px; padding: 6px; }
  .emoji-item { min-width: 28px; min-height: 28px; font-size: 12px; }
  .img-emoji img { width: 24px; height: 24px; }
}
</style>
