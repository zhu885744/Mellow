<template>
  <Teleport to="body">
    <Transition name="lightbox-fade">
      <div
        v-if="state.visible"
        class="lightbox-overlay"
        @click.self="close"
      >
        <button
          class="lightbox-close"
          title="关闭"
          @click="close"
        ><i class="bi bi-x-lg" /></button>

        <button
          v-if="state.images.length > 1"
          class="lightbox-nav lightbox-prev"
          title="上一张"
          @click="prev"
        ><i class="bi bi-chevron-left" /></button>

        <img
          :key="state.index"
          :src="state.images[state.index]"
          class="lightbox-img"
          alt="图片预览"
          @click.stop
        />

        <button
          v-if="state.images.length > 1"
          class="lightbox-nav lightbox-next"
          title="下一张"
          @click="next"
        ><i class="bi bi-chevron-right" /></button>

        <div v-if="state.images.length > 1" class="lightbox-counter">
          {{ state.index + 1 }} / {{ state.images.length }}
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
import { onMounted, onUnmounted, watch } from 'vue'
import { lightboxState, closeLightbox } from '@/utils/lightbox'

const state = lightboxState

function close() {
  closeLightbox()
}
function prev() {
  state.index = (state.index - 1 + state.images.length) % state.images.length
}
function next() {
  state.index = (state.index + 1) % state.images.length
}

function onKeydown(e) {
  if (!state.visible) return
  if (e.key === 'Escape') close()
  else if (e.key === 'ArrowLeft') prev()
  else if (e.key === 'ArrowRight') next()
}

// 打开时锁定页面滚动
watch(
  () => state.visible,
  (v) => {
    document.body.style.overflow = v ? 'hidden' : ''
  }
)

onMounted(() => document.addEventListener('keydown', onKeydown))
onUnmounted(() => {
  document.removeEventListener('keydown', onKeydown)
  document.body.style.overflow = ''
})
</script>

<style scoped>
.lightbox-overlay {
  position: fixed;
  inset: 0;
  z-index: 10000;
  background: rgba(0, 0, 0, 0.85);
  display: flex;
  align-items: center;
  justify-content: center;
}
.lightbox-img {
  max-width: 90vw;
  max-height: 85vh;
  object-fit: contain;
  border-radius: 4px;
  box-shadow: 0 8px 40px rgba(0, 0, 0, 0.5);
  cursor: zoom-out;
}
.lightbox-close {
  position: absolute;
  top: 16px;
  right: 16px;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  border: none;
  background: rgba(255, 255, 255, 0.12);
  color: #fff;
  font-size: 20px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.2s;
}
.lightbox-close:hover {
  background: rgba(255, 255, 255, 0.25);
}
.lightbox-nav {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  width: 44px;
  height: 44px;
  border-radius: 50%;
  border: none;
  background: rgba(255, 255, 255, 0.12);
  color: #fff;
  font-size: 22px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.2s;
}
.lightbox-nav:hover {
  background: rgba(255, 255, 255, 0.25);
}
.lightbox-prev {
  left: 20px;
}
.lightbox-next {
  right: 20px;
}
.lightbox-counter {
  position: absolute;
  bottom: 20px;
  left: 50%;
  transform: translateX(-50%);
  color: #fff;
  font-size: 13px;
  background: rgba(0, 0, 0, 0.4);
  padding: 4px 12px;
  border-radius: 12px;
}
.lightbox-fade-enter-active,
.lightbox-fade-leave-active {
  transition: opacity 0.25s;
}
.lightbox-fade-enter-active .lightbox-img,
.lightbox-fade-leave-active .lightbox-img {
  transition: transform 0.25s;
}
.lightbox-fade-enter-from,
.lightbox-fade-leave-to {
  opacity: 0;
}
.lightbox-fade-enter-from .lightbox-img,
.lightbox-fade-leave-to .lightbox-img {
  transform: scale(0.95);
}
</style>
