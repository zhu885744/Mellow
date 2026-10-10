<template>
  <span class="avatar-frame" :style="{ width: size, height: size }">
    <!-- 底层圆形用户头像 -->
    <img
      :src="currentSrc"
      :alt="alt"
      class="avatar-frame-img"
      loading="lazy"
      decoding="async"
      @error="onError"
    />
    <!-- 顶层头像框：放大渲染，容纳向外延伸的装饰 -->
    <img
      v-if="frame && !frameFailed"
      :src="frame"
      class="avatar-frame-overlay"
      :class="{ 'is-animated': animated }"
      :style="{ transform: `translate(-50%, -50%) scale(${frameScale})` }"
      alt=""
      loading="lazy"
      decoding="async"
      @error="frameFailed = true"
    />
  </span>
</template>

<script setup>
import { ref, computed } from 'vue'

const props = defineProps({
  src: { type: String, default: '' },
  frame: { type: String, default: '' },
  alt: { type: String, default: '头像' },
  size: { type: String, default: '80px' },
  /**
   * 头像框缩放系数
   * 1 = 和头像一样大
   * >1 放大头像框（推荐1.15 ~ 1.3，根据素材调整）
   */
  frameScale: { type: Number, default: 1.2 },
  // 头像加载失败时的回退图
  fallback: { type: String, default: '' },
  /**
   * 是否播动效（后台装扮的「开启动效」）
   * 数据来自 users.json.frame_animated（佩戴头像框时由服务端回写）
   */
  animated: { type: Boolean, default: false }
})

const failed = ref(false)
const frameFailed = ref(false)

// 头像为空或加载失败时回退到 fallback
const currentSrc = computed(() => {
  if (!props.src || failed.value) return props.fallback || props.src
  return props.src
})

function onError() {
  if (props.fallback) failed.value = true
}
</script>

<style scoped>
.avatar-frame {
  position: relative;
  display: inline-flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  /* 不要加 overflow:hidden，否则放大后的头像框装饰会被截断 */
}

/* 用户头像：占满容器，圆形裁剪 */
.avatar-frame-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: 50%;
  display: block;
  z-index: 1;
}

/* 头像框居中放大 */
.avatar-frame-overlay {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 100%;
  height: 100%;
  pointer-events: none;
  z-index: 2;
  object-fit: contain;
  transform-origin: center center;
}

/* 开启动效：亮度呼吸 + 泛光（与头衔的呼吸动效风格保持一致） */
.avatar-frame-overlay.is-animated {
  animation: avatar-frame-breath 2.4s ease-in-out infinite;
}

@keyframes avatar-frame-breath {
  0%,
  100% {
    filter: brightness(1) drop-shadow(0 0 0 rgba(255, 255, 255, 0));
  }
  50% {
    filter: brightness(1.22) drop-shadow(0 0 6px rgba(255, 255, 255, 0.55));
  }
}
</style>
