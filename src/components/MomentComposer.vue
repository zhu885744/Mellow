<template>
  <div class="composer">
    <!-- 作者 -->
    <div class="composer__head">
      <img v-if="avatar" :src="avatar" class="composer__avatar" alt="" />
      <i v-else class="bi bi-person-circle composer__avatar-icon" aria-hidden="true" />
      <span class="composer__name">{{ nickname }}</span>
    </div>

    <!-- 工具栏：与文章编辑器（MarkdownEditor）同一套视觉 —— 纯图标按钮 + 分隔线。
         按钮都带 @mousedown.prevent，保证点击时不会丢正文选区（表情按光标位置插入）。 -->
    <div class="composer__toolbar">
      <button type="button" class="composer__tool" title="插入表情" @mousedown.prevent @click="openEmoji">
        <i class="bi bi-emoji-smile" />
      </button>
      <button
        type="button"
        class="composer__tool"
        title="上传图片"
        :disabled="uploading"
        @mousedown.prevent
        @click="triggerPick"
      >
        <i class="bi" :class="uploading ? 'bi-hourglass-split' : 'bi-image'" />
      </button>
      <button
        type="button"
        class="composer__tool"
        title="从附件库选择已有图片"
        :disabled="uploading"
        @mousedown.prevent
        @click="showLibrary = true"
      >
        <i class="bi bi-folder2-open" />
      </button>

      <span class="composer__toolbar-split" />
      <span class="composer__count">{{ images.length }}/{{ MAX_IMAGES }}</span>
      <span v-if="uploading" class="composer__count">上传中…</span>
    </div>

    <!-- max-height="none"：输入区随内容长高，滚动交给外层（弹窗 / 页面），
         否则编辑器会在 300px 处自己滚动，弹窗看起来就"不再自适应"了。
         inline-picker：表情面板以文档流展开（撑高容器），弹窗里必须开 —— 否则面板是
         absolute 浮层，会被弹窗的 overflow: hidden 裁掉，且不会让弹窗长高。
         hide-toolbar：内置工具栏由上面那排图标按钮替代 -->
    <EmojiEditor
      ref="editorRef"
      v-model="content"
      placeholder="此刻的想法..."
      max-height="none"
      :inline-picker="inlinePicker"
      hide-toolbar
    />

    <input ref="fileInput" type="file" accept="image/*" multiple class="composer__file" @change="onPick" />

    <!-- 附件库（选择已上传图片加入待发布动态） -->
    <AttachmentLibrary
      v-model:visible="showLibrary"
      title="选择动态图片"
      accept="image"
      multiple
      :max="MAX_IMAGES"
      @select="onLibrarySelect"
    />

    <!-- 已选图片 -->
    <div v-if="images.length" class="composer__images">
      <div v-for="(img, i) in images" :key="img" class="composer__image">
        <img :src="img" class="composer__image-img" alt="预览" />
        <button type="button" class="composer__image-del" title="移除" @click="removeImage(i)">
          <i class="bi bi-x-lg" />
        </button>
      </div>
    </div>

    <!-- 所在位置（可选） -->
    <div class="composer__loc">
      <i class="bi bi-geo-alt" />
      <input
        v-model="location"
        class="composer__loc-input"
        type="text"
        maxlength="64"
        placeholder="所在位置（可选）"
        @keyup.enter="submit"
      />
    </div>

    <div class="composer__actions">
      <button class="btn btn-primary btn-sm btn-block" :disabled="publishing || uploading" @click="submit">
        {{ publishing ? '发布中...' : '发布' }}
      </button>
      <span class="composer__tip">「发布后请耐心等待管理员审核，待审核通过后即可显示动态内容」</span>
    </div>
  </div>
</template>

<script setup>
/**
 * 动态发布器（**唯一实现**）
 *
 * 两处共用这一个组件，不要各自再写一份：
 *   - 动态页 `views/moments/Index.vue`：内联使用（`<MomentComposer class="card card-pad" />`，
 *     卡片外观由调用方通过 class 提供）
 *   - 首页「发布动态」弹窗 `components/MomentComposeDialog.vue`：包一层弹窗外壳
 *
 * 接口与参数口径：api/moments.js 的 createMoment —— content 必填、images 传逗号分隔字符串、
 * status=1 表示发布（0 为草稿）；不传 audit，是否进待审核由后端按站点「动态审核」开关决定
 * （强制传 audit=1 会让审核开关形同虚设）。
 *
 * 正文用 EmojiEditor，所以 @ 提及、表情能力与其它输入处完全一致。
 */
import { computed, ref } from 'vue'
import { storeToRefs } from 'pinia'
import EmojiEditor from './EmojiEditor.vue'
import AttachmentLibrary from './AttachmentLibrary.vue'
import { useUserStore } from '@/stores/user'
import { createMoment, uploadMomentImages } from '@/api/moments'
import { toast } from '@/utils/toast'

const MAX_IMAGES = 9
const MAX_SIZE = 50 * 1024 * 1024

defineProps({
  // 表情面板是否内联展开：弹窗里必须 true（面板撑高弹窗）；
  // 页面内联使用时保持默认 false（浮层，不把页面顶长）
  inlinePicker: { type: Boolean, default: false }
})

const emit = defineEmits(['published'])

const userStore = useUserStore()
const { user } = storeToRefs(userStore)

const content = ref('')
const images = ref([])
const location = ref('')
const publishing = ref(false)
const uploading = ref(false)
const showLibrary = ref(false)
const fileInput = ref(null)
const editorRef = ref(null)

// 自画工具栏用：开关编辑器的表情面板
function openEmoji() {
  editorRef.value?.openEmoji()
}

const avatar = computed(() => user.value?.avatar || '')
const nickname = computed(() => user.value?.nickname || '')

function triggerPick() {
  fileInput.value?.click()
}

// 选择图片后立即上传（attachment/batch），成功后记录 URL 用于预览
async function onPick(event) {
  const files = Array.from(event.target.files || [])
  event.target.value = ''
  if (!files.length || uploading.value) return

  if (images.value.length + files.length > MAX_IMAGES) {
    toast.warning(`最多上传 ${MAX_IMAGES} 张图片`)
    return
  }

  const valid = files.filter((file) => {
    if (file.size > MAX_SIZE) {
      toast.warning(`图片「${file.name}」超过 50MB 限制`)
      return false
    }
    if (!file.type.startsWith('image/')) {
      toast.warning(`文件「${file.name}」不是图片`)
      return false
    }
    return true
  })
  if (!valid.length) return

  uploading.value = true
  try {
    const formData = new FormData()
    valid.forEach((file) => formData.append('files', file))

    const res = await uploadMomentImages(formData)
    const results = res.data?.results || []
    const urls = results.filter((item) => item.status !== 'fail' && item.full_url).map((item) => item.full_url)

    images.value.push(...urls)
    if (results.some((item) => item.status === 'fail')) {
      toast.warning('部分图片上传失败')
    }
  } catch {
    /* 拦截器已提示 */
  } finally {
    uploading.value = false
  }
}

function removeImage(index) {
  images.value.splice(index, 1)
}

// 附件库：把选中的已上传图片加入待发布列表（去重 + 数量上限）
function onLibrarySelect(urls = []) {
  const rest = MAX_IMAGES - images.value.length
  if (rest <= 0) {
    toast.warning(`最多上传 ${MAX_IMAGES} 张图片`)
    return
  }

  const add = urls.filter((url) => url && !images.value.includes(url)).slice(0, rest)
  images.value.push(...add)

  if (!add.length) {
    toast.info('所选图片已在列表中')
  } else if (add.length < urls.length) {
    toast.warning('受数量限制，部分附件未添加')
  } else {
    toast.success(`已添加 ${add.length} 张图片`)
  }
}

/** 发布：成功后清空表单并通知父级（父级决定是否刷新列表 / 关闭弹窗） */
async function submit() {
  if (publishing.value || uploading.value) return
  if (!content.value.trim()) {
    toast.warning('内容不能为空')
    return
  }

  publishing.value = true
  try {
    await createMoment({
      content: content.value,
      images: images.value.join(','),
      location: location.value.trim(),
      status: 1
    })

    content.value = ''
    images.value = []
    location.value = ''
    toast.success('发布成功，请耐心等待审核！审核通过后即可显示动态内容。')
    emit('published')
  } catch {
    /* 拦截器已提示 */
  } finally {
    publishing.value = false
  }
}

/** 是否已填写内容（弹窗外壳据此决定关闭时要不要二次确认） */
const hasDraft = computed(() => !!content.value.trim() || images.value.length > 0)

/** 清空表单（取消/关闭弹窗时用；发布成功后 submit 内部已清空） */
function reset() {
  content.value = ''
  images.value = []
  location.value = ''
}

defineExpose({ submit, reset, hasDraft })
</script>

<style scoped>
.composer__head {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}
.composer__avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
}
.composer__avatar-icon {
  font-size: 30px;
  color: var(--text-light, var(--text-muted));
}
.composer__name {
  font-size: 13px;
  font-weight: 500;
}
.composer__count {
  font-size: 12px;
  color: var(--text-muted);
}
.composer__file {
  display: none;
}

/* ---------- 工具栏：与 MarkdownEditor 的 .md-toolbar / .md-tool 保持一致 ---------- */
.composer__toolbar {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 2px;
  margin-bottom: 8px;
  padding-bottom: 6px;
  border-bottom: 1px solid var(--border-soft);
}
.composer__tool {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 30px;
  height: 30px;
  padding: 0 6px;
  border: none;
  border-radius: var(--radius-sm);
  background: transparent;
  color: var(--text-soft);
  font-size: 15px;
  cursor: pointer;
  transition: background 0.15s, color 0.15s;
}
.composer__tool:hover:not(:disabled) {
  background: var(--bg-muted);
  color: var(--primary);
}
.composer__tool:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.composer__toolbar-split {
  width: 1px;
  height: 16px;
  margin: 0 6px;
  background: var(--border);
}

.composer__images {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 10px;
}
.composer__image {
  position: relative;
  width: 72px;
  height: 72px;
  border-radius: var(--radius-sm);
  overflow: hidden;
  border: 1px solid var(--border-soft);
}
.composer__image-img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.composer__image-del {
  position: absolute;
  top: 4px;
  right: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  border: none;
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.55);
  color: #fff;
  font-size: 12px;
  line-height: 1;
  cursor: pointer;
  transition: background 0.2s;
}
.composer__image-del:hover {
  background: var(--danger);
}

.composer__loc {
  position: relative;
  margin-top: 10px;
}
.composer__loc .bi {
  position: absolute;
  left: 10px;
  top: 50%;
  transform: translateY(-50%);
  font-size: 13px;
  color: var(--text-light);
  pointer-events: none;
}
.composer__loc-input {
  width: 100%;
  /* 与发布器工具栏按钮（.btn-sm）等高 */
  height: var(--control-h-sm);
  padding: 0 12px 0 30px;
  font-size: 13px;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  background: var(--bg);
  color: var(--text);
  outline: none;
  transition: border-color 0.2s, box-shadow 0.2s;
}
.composer__loc-input:focus {
  border-color: var(--primary);
  box-shadow: 0 0 0 3px var(--accent-ring);
}

.composer__actions {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-top: 8px;
}
.composer__tip {
  font-size: 12px;
  line-height: 1.5;
  color: var(--text-muted);
}

/* 手机端：位置输入与按钮更紧凑一点 */
@media (max-width: 640px) {
  .composer__image {
    width: 64px;
    height: 64px;
  }
}
</style>
