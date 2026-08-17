/**
 * 全局图片灯箱状态（配合 src/components/Lightbox.vue 使用）
 * 任意组件调用 openLightbox(images, index) 即可打开灯箱预览
 */
import { reactive } from 'vue'

export const lightboxState = reactive({
  visible: false,
  images: [],
  index: 0
})

export function openLightbox(images, index = 0) {
  const list = (Array.isArray(images) ? images : [images]).filter(Boolean)
  if (!list.length) return
  lightboxState.images = list
  lightboxState.index = Math.min(Math.max(index || 0, 0), list.length - 1)
  lightboxState.visible = true
}

export function closeLightbox() {
  lightboxState.visible = false
}
