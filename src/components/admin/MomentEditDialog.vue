<template>
  <AdminFormDialog
    :visible="visible"
    :title="title"
    icon="bi bi-pencil-square"
    width="560px"
    :loading="saving"
    @update:visible="onVisibleChange"
  >
    <EmojiEditor v-model="form.content" placeholder="此刻的想法..." inline-picker>
      <template #extra>
        <button
          type="button"
          class="btn btn-secondary btn-sm"
          :class="{ 'is-loading': uploading }"
          :disabled="uploading"
          title="上传图片"
          @click="fileInput?.click()"
        >
          <i class="bi bi-image" /> {{ uploading ? '上传中...' : '图片' }}
        </button>
        <button
          type="button"
          class="btn btn-secondary btn-sm"
          :disabled="uploading"
          title="从附件库选择已有图片"
          @click="showLibrary = true"
        >
          <i class="bi bi-folder2-open" /> 附件库
        </button>
      </template>
    </EmojiEditor>

    <input
      ref="fileInput"
      type="file"
      accept="image/*"
      multiple
      class="hidden-file"
      @change="onPick"
    />

    <AttachmentLibrary
      v-model:visible="showLibrary"
      title="选择动态图片"
      accept="image"
      multiple
      :max="MAX_IMAGES"
      @select="onLibrarySelect"
    />

    <div v-if="form.images.length" class="edit-images">
      <div v-for="(img, i) in form.images" :key="img + i" class="edit-img-item">
        <img :src="img" alt="配图" />
        <button type="button" class="img-remove" title="移除" @click="removeImage(i)">
          <i class="bi bi-x-lg" />
        </button>
      </div>
    </div>

    <div class="location-box">
      <i class="bi bi-geo-alt" aria-hidden="true" />
      <input
        v-model="form.location"
        class="dialog-input"
        type="text"
        placeholder="位置（可选）"
        maxlength="64"
      />
    </div>

    <label class="switch-row">
      <input v-model="form.status" type="checkbox" :true-value="1" :false-value="0" />
      <span>{{ form.status === 1 ? '已发布' : '存为草稿' }}</span>
    </label>

    <template #footer>
      <button type="button" class="btn btn-sm" :disabled="saving" @click="requestClose">取消</button>
      <button
        type="button"
        class="btn btn-primary btn-sm"
        :class="{ 'is-loading': saving }"
        :disabled="saving || uploading || !canSave"
        @click="submit"
      >
        保存
      </button>
    </template>
  </AdminFormDialog>
</template>

<script setup>
/**
 * 后台动态编辑弹窗
 *
 * 与 manage/Moments.vue 的编辑弹窗保持同一套交互（表情编辑、上传、附件库、位置、发布状态），
 * 抽成组件后列表页只关心「打开哪一条」与「保存成功」两件事。
 */
import { ref, reactive, computed, watch } from 'vue'
import AdminFormDialog from '@/components/admin/AdminFormDialog.vue'
import EmojiEditor from '@/components/EmojiEditor.vue'
import AttachmentLibrary from '@/components/AttachmentLibrary.vue'
import { updateMoment, uploadMomentImages } from '@/api/moments'
import { parseMomentImages } from '@/utils/moment'
import { toast } from '@/utils/toast'

const MAX_IMAGES = 9
const MAX_SIZE = 10 * 1024 * 1024

const props = defineProps({
  visible: { type: Boolean, default: false },
  // 待编辑的动态原始数据（打开弹窗前由父级赋值）
  moment: { type: Object, default: null }
})

const emit = defineEmits(['update:visible', 'saved'])

const form = reactive({
  id: null,
  // 审核状态：moments/update 会依据 status 重算 audit，保存时必须回传原值
  audit: 1,
  content: '',
  images: [],
  location: '',
  status: 1
})

const saving = ref(false)
const uploading = ref(false)
const showLibrary = ref(false)
const fileInput = ref(null)

const title = computed(() => (form.id ? `编辑动态 #${form.id}` : '编辑动态'))
const canSave = computed(() => !!form.content.trim() || form.images.length > 0)

// 每次打开用最新数据重建表单，避免上一条的残留内容串台
watch(
  () => props.visible,
  (visible) => {
    if (visible) resetForm()
  }
)

function resetForm() {
  const item = props.moment || {}
  form.id = item.id ?? null
  form.audit = Number(item.audit) || 0
  form.content = item.content || ''
  form.images = parseMomentImages(item.images)
  form.location = item.location || ''
  form.status = Number(item.status) === 0 ? 0 : 1
  saving.value = false
  uploading.value = false
  showLibrary.value = false
}

function requestClose() {
  if (saving.value) return
  emit('update:visible', false)
}

// AdminFormDialog 不感知保存中状态，这里拦截一次，避免请求进行中弹窗被关闭
function onVisibleChange(visible) {
  if (visible) {
    emit('update:visible', true)
    return
  }
  requestClose()
}

function removeImage(index) {
  form.images.splice(index, 1)
}

async function onPick(event) {
  const files = Array.from(event.target.files || [])
  event.target.value = ''
  if (!files.length || uploading.value) return

  if (form.images.length + files.length > MAX_IMAGES) {
    toast.warning(`最多上传 ${MAX_IMAGES} 张图片`)
    return
  }

  const valid = files.filter((file) => {
    if (!file.type.startsWith('image/')) {
      toast.warning(`文件「${file.name}」不是图片`)
      return false
    }
    if (file.size > MAX_SIZE) {
      toast.warning(`图片「${file.name}」超过 10MB 限制`)
      return false
    }
    return true
  })
  if (!valid.length) return

  uploading.value = true
  try {
    const fd = new FormData()
    valid.forEach((file) => fd.append('files', file))
    const res = await uploadMomentImages(fd)
    const results = res.data?.results || []
    const urls = results.filter((r) => r.status !== 'fail' && r.full_url).map((r) => r.full_url)
    form.images.push(...urls)
    if (results.some((r) => r.status === 'fail')) toast.warning('部分图片上传失败')
  } catch {
    /* 请求拦截器已提示 */
  } finally {
    uploading.value = false
  }
}

// 附件库：把选中的已上传图片加入配图（去重 + 数量上限）
function onLibrarySelect(urls = []) {
  const rest = MAX_IMAGES - form.images.length
  if (rest <= 0) {
    toast.warning(`最多上传 ${MAX_IMAGES} 张图片`)
    return
  }
  const add = urls.filter((url) => url && !form.images.includes(url)).slice(0, rest)
  form.images.push(...add)
  if (!add.length) {
    toast.info('所选图片已在列表中')
  } else if (add.length < urls.length) {
    toast.warning('受数量限制，部分附件未添加')
  } else {
    toast.success(`已添加 ${add.length} 张图片`)
  }
}

async function submit() {
  if (!form.id || saving.value || !canSave.value) return
  saving.value = true
  try {
    // 回传原 audit，避免保存时被后端的审核规则打回待审核
    await updateMoment({
      id: form.id,
      content: form.content,
      images: form.images,
      location: form.location.trim(),
      status: form.status,
      audit: form.audit
    })
    toast.success('保存成功')
    emit('update:visible', false)
    emit('saved', form.id)
    form.id = null
  } catch {
    /* 请求拦截器已提示，保持弹窗打开便于重试 */
  } finally {
    saving.value = false
  }
}
</script>

<style scoped>
.hidden-file {
  display: none;
}

.edit-images {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 10px;
}
.edit-img-item {
  position: relative;
  width: 72px;
  height: 72px;
  border-radius: var(--radius-sm);
  overflow: hidden;
  border: 1px solid var(--border);
}
.edit-img-item img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}
.img-remove {
  position: absolute;
  top: 0;
  right: 0;
  width: 18px;
  height: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  background: rgba(0, 0, 0, 0.55);
  color: #fff;
  font-size: 11px;
  cursor: pointer;
  border-radius: 0 0 0 6px;
}
.img-remove:hover {
  background: var(--danger);
}

.location-box {
  position: relative;
  margin-top: 10px;
}
.location-box .bi {
  position: absolute;
  left: 10px;
  top: 50%;
  transform: translateY(-50%);
  font-size: 13px;
  color: var(--text-light);
  pointer-events: none;
}
.dialog-input {
  width: 100%;
  padding: 7px 12px 7px 30px;
  font-size: 13px;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background: var(--bg-card);
  color: var(--text);
  outline: none;
  transition: border-color 0.2s, box-shadow 0.2s;
}
.dialog-input:focus {
  border-color: var(--primary);
  box-shadow: 0 0 0 3px var(--accent-ring);
}

.switch-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 12px;
  font-size: 13px;
  color: var(--text-soft);
  cursor: pointer;
}
</style>
