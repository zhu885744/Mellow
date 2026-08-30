<template>
  <div class="card card-pad">
    <header class="write-head">
      <h2 class="block-title">{{ isEdit ? '编辑文章' : '撰写文章' }}</h2>
      <router-link to="/user/posts" class="btn btn-ghost btn-sm">
        <i class="bi bi-arrow-left" /> 返回列表
      </router-link>
    </header>

    <div v-if="loading" class="loading">
      <span class="spinner" /> 加载中...
    </div>

    <div v-else class="write-body">
      <!-- 标题 -->
      <div class="form-item">
        <input
          v-model="form.title"
          class="title-input"
          type="text"
          maxlength="120"
          placeholder="请输入文章标题"
        />
        <p v-if="error.title" class="form-error">{{ error.title }}</p>
      </div>

      <!-- 正文编辑器 -->
      <div class="form-item">
        <MarkdownEditor
          v-model="form.content"
          placeholder="开始书写正文，支持 Markdown 语法…"
          min-height="440px"
          @save="submit(1)"
        />
        <p v-if="error.content" class="form-error">{{ error.content }}</p>
      </div>

      <!-- 附加设置 -->
      <div class="form-item">
        <label class="form-label">摘要</label>
        <textarea
          v-model="form.abstract"
          class="textarea"
          rows="3"
          maxlength="200"
          placeholder="留空将自动截取正文前 120 字"
        />
      </div>

      <div class="form-row">
        <div class="form-item flex-1">
          <label class="form-label">分类</label>
          <select v-model="form.group" class="input">
            <option value="">未分类</option>
            <option v-for="g in groupOptions" :key="g.id" :value="g.id">{{ g.label }}</option>
          </select>
        </div>

        <div class="form-item flex-1">
          <label class="form-label">发布时间</label>
          <input v-model="publishAt" class="input" type="datetime-local" />
        </div>
      </div>

      <!-- 标签 -->
      <div class="form-item">
        <label class="form-label">标签</label>
        <div class="tag-picker">
          <span
            v-for="t in selectedTags"
            :key="t.id"
            class="tag tag-primary tag-removable"
            @click="toggleTag(t)"
          >
            {{ t.name }} <i class="bi bi-x" />
          </span>
          <span
            v-for="t in unselectedTags"
            :key="'u' + t.id"
            class="tag"
            @click="toggleTag(t)"
          >{{ t.name }}</span>
          <span class="tag-add">
            <input
              v-model="newTag"
              class="tag-input"
              type="text"
              placeholder="+ 新标签"
              maxlength="16"
              @keyup.enter="addTag"
            />
          </span>
        </div>
      </div>

      <!-- 封面 -->
      <div class="form-item">
        <label class="form-label">封面</label>
        <div class="cover-box">
          <div v-if="form.cover" class="cover-preview">
            <img :src="form.cover" alt="封面预览" />
            <button type="button" class="cover-del" title="移除封面" @click="form.cover = ''">
              <i class="bi bi-x" />
            </button>
          </div>
          <div v-else class="cover-empty" @click="pickCover">
            <i class="bi bi-image" />
            <span>点击上传</span>
          </div>
          <div class="cover-url">
            <input
              v-model="form.cover"
              class="input"
              type="text"
              placeholder="或直接粘贴图片链接"
            />
            <button type="button" class="btn btn-ghost btn-sm" :disabled="uploading" @click="pickCover">
              {{ uploading ? '上传中...' : '上传' }}
            </button>
          </div>
        </div>
        <input ref="coverFileRef" type="file" accept="image/*" hidden @change="onCoverChange" />
      </div>

      <!-- 操作 -->
      <div class="write-actions">
        <span class="save-tip">{{ savedTip }}</span>
        <button class="btn" :disabled="saving" @click="submit(0)">
          {{ saving ? '处理中...' : '存为草稿' }}
        </button>
        <button class="btn btn-primary" :disabled="saving" @click="submit(1)">
          {{ saving ? '处理中...' : isEdit ? '保存修改' : '发布文章' }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, watch, onMounted, onUnmounted } from 'vue'
import { useRoute, useRouter, onBeforeRouteLeave } from 'vue-router'
import MarkdownEditor from '@/components/MarkdownEditor.vue'
import {
  createArticle,
  updateArticle,
  getArticleForEdit,
  getArticleGroups,
  uploadArticleImage
} from '@/api/article'
import { listAllTags, createTag } from '@/api/tags'
import { useUserStore } from '@/stores/user'
import { storeToRefs } from 'pinia'
import { parseIdField, toIdField, truncate } from '@/utils/helper'
import { toast } from '@/utils/toast'

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()
const { user } = storeToRefs(userStore)

const isEdit = computed(() => !!route.params.id)
const articleId = computed(() => Number(route.params.id) || 0)

const loading = ref(false)
const saving = ref(false)
const uploading = ref(false)
const savedTip = ref('')
const newTag = ref('')
const publishAt = ref('')

const coverFileRef = ref(null)
const groups = ref([])
const tags = ref([])
// 原文的发布时间（0 表示未设置，用于草稿首次发布时补上当前时间）
const originalPublishTime = ref(0)

const form = reactive({
  title: '',
  abstract: '',
  content: '',
  cover: '',
  group: '',
  tagIds: []
})

const error = reactive({ title: '', content: '' })

const groupOptions = computed(() => {
  // 依据 pid 生成带缩进的展示名
  const list = groups.value || []
  const build = (pid, level) => {
    return list
      .filter((g) => Number(g.pid || 0) === Number(pid))
      .flatMap((g) => [
        { id: g.id, label: `${'　'.repeat(level)}${level ? '└ ' : ''}${g.name}` },
        ...build(g.id, level + 1)
      ])
  }
  return build(0, 0)
})

const selectedTags = computed(() => tags.value.filter((t) => form.tagIds.includes(t.id)))
const unselectedTags = computed(() => tags.value.filter((t) => !form.tagIds.includes(t.id)).slice(0, 30))

// 是否有未保存内容（用于离开提醒）
const dirty = ref(false)
watch(
  () => [form.title, form.abstract, form.content, form.cover, form.group, form.tagIds.join(',')],
  () => {
    if (loading.value) return
    dirty.value = true
    savedTip.value = '有未保存的修改'
  }
)

function toggleTag(t) {
  const idx = form.tagIds.indexOf(t.id)
  if (idx > -1) form.tagIds.splice(idx, 1)
  else form.tagIds.push(t.id)
}

async function addTag() {
  const name = newTag.value.trim()
  if (!name) return
  const exist = tags.value.find((t) => t.name === name)
  if (exist) {
    if (!form.tagIds.includes(exist.id)) form.tagIds.push(exist.id)
    newTag.value = ''
    return
  }
  try {
    const res = await createTag(name)
    const id = res.data?.id
    if (!id) throw new Error('no id')
    tags.value.push({ id, name })
    form.tagIds.push(id)
    newTag.value = ''
    toast.success('标签已创建')
  } catch {
    toast.error('标签创建失败')
  }
}

function pickCover() {
  coverFileRef.value?.click()
}

async function onCoverChange(e) {
  const file = e.target.files?.[0]
  e.target.value = ''
  if (!file) return
  if (!file.type.startsWith('image/')) {
    toast.warning('请选择图片文件')
    return
  }
  if (file.size > 10 * 1024 * 1024) {
    toast.warning('图片不能超过 10MB')
    return
  }
  uploading.value = true
  try {
    const fd = new FormData()
    fd.append('files', file)
    const res = await uploadArticleImage(fd)
    const url = res.data?.results?.[0]?.full_url || res.data?.results?.[0]?.url || ''
    if (!url) throw new Error('empty')
    form.cover = url
    toast.success('封面已上传')
  } catch {
    toast.error('封面上传失败')
  } finally {
    uploading.value = false
  }
}

function validate() {
  error.title = form.title.trim() ? '' : '标题不能为空'
  error.content = form.content.trim() ? '' : '正文不能为空'
  return !error.title && !error.content
}

function buildPayload(status) {
  const payload = {
    title: form.title.trim(),
    abstract: form.abstract.trim() || truncate(form.content, 120),
    content: form.content,
    covers: form.cover,
    group: toIdField(form.group === '' ? [] : [form.group]),
    tags: toIdField(form.tagIds),
    editor: 'markdown',
    status
  }
  if (publishAt.value) {
    const ts = Math.floor(new Date(publishAt.value).getTime() / 1000)
    if (!Number.isNaN(ts)) payload.publish_time = ts
  } else if (status === 1 && !originalPublishTime.value) {
    // 草稿首次发布 / 新文章发布：补上当前时间
    payload.publish_time = Math.floor(Date.now() / 1000)
  }
  return payload
}

async function submit(status) {
  if (saving.value) return
  if (!validate()) {
    toast.warning(error.title || error.content)
    return
  }
  saving.value = true
  try {
    const payload = buildPayload(status)
    let id = articleId.value
    if (isEdit.value) {
      await updateArticle({ id, ...payload })
    } else {
      const res = await createArticle(payload)
      id = res.data?.id || 0
    }
    dirty.value = false
    savedTip.value = status === 1 ? '已保存' : '草稿已保存'
    toast.success(status === 1 ? (isEdit.value ? '修改已保存' : '发布成功') : '草稿已保存')
    if (!isEdit.value && id) {
      router.replace(`/user/posts/edit/${id}`)
    }
  } catch {
    /* 拦截器已提示 */
  } finally {
    saving.value = false
  }
}

async function loadMeta() {
  try {
    const res = await getArticleGroups()
    groups.value = res.data?.data || []
  } catch {
    groups.value = []
  }
  try {
    const res = await listAllTags()
    tags.value = (res.data?.data || []).map((t) => ({ id: t.id, name: t.name }))
  } catch {
    tags.value = []
  }
}

async function loadArticle() {
  if (!isEdit.value) return
  loading.value = true
  try {
    const res = await getArticleForEdit(articleId.value)
    const item = res.data
    if (!item) {
      toast.error('文章不存在或已被删除')
      router.replace('/user/posts')
      return
    }
    // 非管理员只能编辑自己的文章
    const mine = Number(item.uid) === Number(user.value?.id)
    if (!mine) {
      toast.error('只能编辑自己的文章')
      router.replace('/user/posts')
      return
    }
    form.title = item.title || ''
    form.abstract = item.abstract || ''
    form.content = item.content || ''
    const covers = Array.isArray(item.covers) ? item.covers[0] : String(item.covers || '').split(',')[0]
    form.cover = covers || ''
    const groupIds = parseIdField(item.group)
    form.group = groupIds.length ? groupIds[0] : ''
    form.tagIds = parseIdField(item.tags)
    originalPublishTime.value = Number(item.publish_time) || 0
    await loadMeta()
    if (originalPublishTime.value) {
      publishAt.value = toLocalInput(originalPublishTime.value)
    }
    loading.value = false
    // 数据回填完成后再开启脏值检测
    setTimeout(() => {
      dirty.value = false
      savedTip.value = ''
    }, 0)
    return
  } catch {
    toast.error('文章加载失败')
    router.replace('/user/posts')
  } finally {
    loading.value = false
  }
}

function toLocalInput(ts) {
  const d = new Date(Number(ts) * 1000)
  if (Number.isNaN(d.getTime())) return ''
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

onMounted(async () => {
  if (!isEdit.value) await loadMeta()
  await loadArticle()
  window.addEventListener('beforeunload', onBeforeUnload)
})

onUnmounted(() => {
  window.removeEventListener('beforeunload', onBeforeUnload)
})

function onBeforeUnload(e) {
  if (!dirty.value) return
  e.preventDefault()
  e.returnValue = ''
}

onBeforeRouteLeave(() => {
  if (!dirty.value) return true
  return window.confirm('有未保存的修改，确定离开吗？')
})
</script>

<style scoped>
.write-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 16px;
}
.block-title {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
}
.write-body {
  min-width: 0;
}
.title-input {
  width: 100%;
  padding: 10px 12px;
  font-size: 20px;
  font-weight: 600;
  color: var(--text);
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  outline: none;
  transition: border-color 0.2s, box-shadow 0.2s;
}
.title-input:focus {
  border-color: var(--primary);
  box-shadow: 0 0 0 3px rgba(184, 153, 104, 0.12);
}
.form-row {
  display: flex;
  gap: 16px;
}
.form-row .form-item {
  flex: 1;
  min-width: 0;
}
select.input {
  cursor: pointer;
}
.loading {
  padding: 40px;
  text-align: center;
  color: var(--text-muted);
}

/* 标签 */
.tag-picker {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  align-items: center;
}
.tag {
  cursor: pointer;
}
.tag-removable {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}
.tag-add {
  display: inline-flex;
}
.tag-input {
  width: 90px;
  padding: 2px 8px;
  font-size: 12px;
  border: 1px dashed var(--border);
  border-radius: var(--radius-sm);
  background: transparent;
  color: var(--text);
  outline: none;
}
.tag-input:focus {
  border-color: var(--primary);
  width: 120px;
}

/* 封面 */
.cover-box {
  display: flex;
  gap: 12px;
  align-items: flex-start;
  flex-wrap: wrap;
}
.cover-preview {
  position: relative;
  width: 160px;
  height: 100px;
  border-radius: var(--radius);
  overflow: hidden;
  border: 1px solid var(--border);
  flex-shrink: 0;
}
.cover-preview img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.cover-del {
  position: absolute;
  right: 4px;
  top: 4px;
  width: 22px;
  height: 22px;
  border: none;
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.5);
  color: #fff;
  cursor: pointer;
  font-size: 14px;
  line-height: 1;
}
.cover-empty {
  width: 160px;
  height: 100px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  font-size: 12px;
  color: var(--text-light);
  border: 1px dashed var(--border);
  border-radius: var(--radius);
  cursor: pointer;
  transition: all 0.2s;
}
.cover-empty:hover {
  border-color: var(--primary);
  color: var(--primary);
}
.cover-empty .bi {
  font-size: 20px;
}
.cover-url {
  flex: 1;
  min-width: 200px;
  display: flex;
  gap: 8px;
}

.write-actions {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 10px;
  padding-top: 8px;
  border-top: 1px solid var(--border-soft);
}
.save-tip {
  margin-right: auto;
  font-size: 12px;
  color: var(--text-muted);
}

@media (max-width: 640px) {
  .form-row {
    flex-direction: column;
    gap: 0;
  }
  .cover-url {
    width: 100%;
  }
  .write-actions {
    flex-wrap: wrap;
  }
  .save-tip {
    width: 100%;
    margin-bottom: 6px;
  }
}
</style>
