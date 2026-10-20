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
    <!-- 顶层头像框：按「洞」定位，装饰可自由向外延伸 -->
    <img
      v-if="frame && !frameFailed"
      :src="frame"
      class="avatar-frame-overlay"
      :class="{ 'is-animated': animated }"
      :style="frameStyle"
      alt=""
      loading="lazy"
      decoding="async"
      @error="frameFailed = true"
    />
  </span>
</template>

<script setup>
import { ref, computed } from 'vue'

// 与后端 app/model/decoration.go 的 frameHoleMin / frameHoleMax / frameOffsetLimit 保持一致
const HOLE_MIN = 0.2
const HOLE_MAX = 1.5
const OFFSET_LIMIT = 0.5

const props = defineProps({
  src: { type: String, default: '' },
  frame: { type: String, default: '' },
  alt: { type: String, default: '头像' },
  size: { type: String, default: '80px' },
  /**
   * 头像框「洞」的大小：洞直径 ÷ 素材宽度
   *
   * 1   = 洞正好是素材的内切圆，素材按头像大小 1:1 渲染
   * 0.6 = 素材要放大到 1.67 倍，洞才等于头像（装饰画得大的框通常是这个量级）
   *
   * 数据来自 users.json.frame_hole（佩戴时由服务端回写），
   * 没配过的老数据取默认 1，等同于「素材就是贴合头像的」。
   */
  frameHole: { type: Number, default: 1 },
  /** 洞心相对素材中心的横向偏移，单位=素材宽度的比例（修正画布留白不对称） */
  frameOffsetX: { type: Number, default: 0 },
  /** 洞心相对素材中心的纵向偏移，同上 */
  frameOffsetY: { type: Number, default: 0 },
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

function clampOffset(value) {
  const num = Number(value)
  if (!Number.isFinite(num)) return 0
  return Math.min(OFFSET_LIMIT, Math.max(-OFFSET_LIMIT, num))
}

// 用 CSS 变量传参，避免在模板里拼一长串 transform
const frameStyle = computed(() => {
  const raw = Number(props.frameHole)
  const hole = Number.isFinite(raw) && raw > 0
    ? Math.min(HOLE_MAX, Math.max(HOLE_MIN, raw))
    : 1

  return {
    '--frame-hole': hole,
    '--frame-offset-x': clampOffset(props.frameOffsetX),
    '--frame-offset-y': clampOffset(props.frameOffsetY)
  }
})

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

/*
 * 头像框：以「洞」为基准定位
 *
 * --frame-hole      洞直径 ÷ 素材宽度 → 素材宽度取「头像直径 / hole」
 * --frame-offset-x  洞心横向偏移（素材宽度的比例）
 * --frame-offset-y  洞心纵向偏移
 *
 * height:auto 让 <img> 保持素材自身比例：非正方形素材也不会被拉伸，
 * 同时 translate(-50%,-50%) 正好以图片实际尺寸居中。
 */
.avatar-frame-overlay {
  position: absolute;
  top: 50%;
  left: 50%;
  width: calc(100% / var(--frame-hole, 1));
  /*
   * 必须解除全局 `img { max-width: 100% }` 的限制：
   * 洞模型靠「宽度 > 头像」把素材放大，而 max-width 会把它卡在 100%，
   * 表现就是「洞大小调了没反应、但偏移有效」（偏移走 transform，不受 max-width 影响）。
   */
  max-width: none;
  height: auto;
  pointer-events: none;
  z-index: 2;
  transform-origin: center center;
  /* translate 的百分比以元素自身宽度为基准：先居中，再按偏移量平移 */
  transform: translate(
    calc(-50% - var(--frame-offset-x, 0) * 100%),
    calc(-50% - var(--frame-offset-y, 0) * 100%)
  );
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
