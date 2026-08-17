<template>
  <!-- 右侧悬浮按钮组 -->
  <div
    v-if="showFloats"
    class="float-buttons"
    :class="[`float-pos-${config.position}`, `float-style-${config.style}`]"
  >
    <!-- 自定义按钮 -->
    <div
      v-for="(btn, i) in visibleButtons"
      :key="btn.id || 'fb-' + i"
      class="float-btn-item"
      :title="btn.tooltip || btn.name"
      @click="onButtonClick(btn)"
    >
      <i v-if="isIconClass(btn.icon)" :class="btn.icon" />
      <span v-else class="float-btn-text">{{ btn.icon }}</span>
      <img v-if="btn.image_url" class="float-btn-preview" :src="btn.image_url" alt="" />
    </div>

    <!-- 返回顶部 -->
    <div
      v-if="config.show_back_to_top !== false && scrolled"
      class="float-btn-item"
      title="返回顶部"
      @click="scrollToTop"
    >
      <i class="bi bi-arrow-up" />
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { getConfig } from '@/api/config'
import { openLightbox } from '@/utils/lightbox'

const config = ref({
  enabled: true,
  style: 'rounded',
  position: 'center',
  show_back_to_top: true,
  buttons: []
})
const scrolled = ref(false)

const showFloats = computed(() => config.value.enabled !== false)
const visibleButtons = computed(() =>
  (config.value.buttons || []).filter((b) => b.enabled !== false)
)

// 图标为 bootstrap 图标类名（含空格）时渲染 <i>，否则按文本/emoji 渲染
function isIconClass(icon) {
  return typeof icon === 'string' && icon.trim().length > 0 && icon.includes(' ')
}

function onButtonClick(btn) {
  if (btn.image_url) {
    // 设置了图片预览则打开灯箱
    openLightbox(btn.image_url)
    return
  }
  if (btn.url) {
    window.open(btn.url, '_blank', 'noopener')
  }
}

function scrollToTop() {
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

function onScroll() {
  scrolled.value = window.scrollY > 300
}

async function loadConfig() {
  try {
    const res = await getConfig('Mellow_functions')
    const fb = res.data?.json?.float_buttons || {}
    config.value = {
      enabled: fb.enabled !== false,
      style: fb.style || 'rounded',
      position: fb.position || 'center',
      show_back_to_top: fb.show_back_to_top !== false,
      buttons: fb.buttons || []
    }
  } catch {
    // 读取失败时保持默认配置
  }
}

onMounted(() => {
  loadConfig()
  window.addEventListener('scroll', onScroll)
  onScroll()
})
onUnmounted(() => {
  window.removeEventListener('scroll', onScroll)
})
</script>

<style scoped>
.float-buttons {
  position: fixed;
  right: 18px;
  z-index: 999;
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.float-pos-center {
  top: 50%;
  transform: translateY(-50%);
}
.float-pos-bottom {
  bottom: 96px;
}

.float-btn-item {
  position: relative;
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  color: var(--text-soft);
  background: var(--bg-card);
  border: 1px solid var(--border);
  cursor: pointer;
  transition: all 0.2s;
  user-select: none;
}
.float-style-rounded .float-btn-item {
  border-radius: 50%;
}
.float-style-square .float-btn-item {
  border-radius: 8px;
}
.float-btn-item:hover {
  color: var(--primary);
  border-color: var(--primary);
  background: var(--bg-soft);
}
.float-btn-text {
  font-size: 14px;
  line-height: 1;
}

/* 悬浮图片预览 */
.float-btn-preview {
  position: absolute;
  right: calc(100% + 14px);
  top: 50%;
  transform: translateY(-50%);
  max-width: 220px;
  max-height: 220px;
  object-fit: cover;
  border-radius: 8px;
  border: 1px solid var(--border);
  box-shadow: 0 6px 24px rgba(0, 0, 0, 0.16);
  background: var(--bg-card);
  opacity: 0;
  visibility: hidden;
  transition: opacity 0.2s, visibility 0.2s;
  pointer-events: none;
}
.float-btn-item:hover .float-btn-preview {
  opacity: 1;
  visibility: visible;
}
</style>
