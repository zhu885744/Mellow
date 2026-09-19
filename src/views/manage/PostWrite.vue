<template>
  <div class="write-page">
    <!-- 顶部返回 -->
    <div class="write-top">
      <router-link to="/manage/posts" class="back-link">
        <i class="bi bi-arrow-left" /> 返回列表
      </router-link>
      <span class="write-mode">{{ isEdit ? '编辑文章' : '撰写文章' }}</span>
    </div>

    <!-- 编辑卡片 -->
    <div class="card editor-card">
      <div v-if="loading" class="loading">
        <span class="spinner" /> 加载中...
      </div>

      <template v-else>
        <!-- 标题 -->
        <div class="title-row">
          <input
            v-model="form.title"
            class="title-input"
            type="text"
            maxlength="50"
            placeholder="输入长文标题"
          />
          <span class="title-count" :class="{ over: form.title.length >= titleLimit }">
            {{ form.title.length }}/{{ titleLimit }}
          </span>
        </div>
        <p v-if="error.title" class="form-error">{{ error.title }}</p>

        <!-- 正文编辑器（工具栏 + 正文 + 字数） -->
        <MarkdownEditor
          ref="editorRef"
          v-model="form.content"
          placeholder="来说点什么吧..."
          min-height="420px"
          :max-length="contentLimit"
          @save="submit(1)"
        />
        <p v-if="error.content" class="form-error">{{ error.content }}</p>

        <!-- 更多设置 -->
        <div v-show="showExtra" class="extra-panel">
          <!-- 封面（置顶，单独一行） -->
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
                <button type="button" class="btn btn-ghost btn-sm" title="从附件库选择封面" @click="showCoverLibrary = true">
                  附件库
                </button>
              </div>
            </div>
            <input ref="coverFileRef" type="file" accept="image/*" hidden @change="onCoverChange" />

            <!-- 附件库（选择已上传图片作为封面） -->
            <AttachmentLibrary
              v-model:visible="showCoverLibrary"
              title="选择封面图片"
              accept="image"
              @select="onCoverLibrarySelect"
            />
          </div>

          <div class="form-item">
            <label class="form-label">摘要</label>
            <textarea
              v-model="form.abstract"
              class="textarea"
              rows="3"
              maxlength="200"
              placeholder="请勿留空哦"
            />
          </div>

          <div class="form-item">
            <label class="form-label">发布时间</label>
            <input
              v-model="publishAt"
              class="input"
              type="datetime-local"
              @input="publishAtTouched = true"
            />
          </div>

          <!-- 审核状态（仅管理员可见/可改） -->
          <div v-if="isAdminUser" class="form-item">
            <label class="form-label">审核状态</label>
            <SelectMenu v-model="articleAudit" variant="field" :options="auditOptions" />
            <p class="form-hint">仅管理员可设置：「通过」后文章对访客可见；普通作者保存不会覆盖该状态</p>
          </div>

          <!-- 评论设置（json.comment：allow 允许/禁止，show 显示/隐藏） -->
          <div class="form-item">
            <label class="form-label">允许评论</label>
            <SelectMenu
              v-model="commentAllow"
              variant="field"
              :options="commentAllowOptions"
            />
            <p class="form-hint">选「禁止」后仍展示已有评论，只是关闭发表与回复入口</p>
          </div>

          <div class="form-item">
            <label class="form-label">显示评论</label>
            <SelectMenu
              v-model="commentShow"
              variant="field"
              :options="commentShowOptions"
            />
            <p class="form-hint">选「隐藏」后文章详情页整个评论模块都不显示</p>
          </div>

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
        </div>

        <!-- 底部操作栏 -->
        <div class="action-bar">
          <div class="action-left">
            <!-- 选择分类 -->
            <SelectMenu
              v-model="form.group"
              :options="groupSelectOptions"
              placeholder="选择分类"
              icon="bi bi-collection"
            />

            <!-- 更多设置 -->
            <button
              type="button"
              class="pill"
              :class="{ 'is-active': showExtra }"
              @click="showExtra = !showExtra"
            >
              <i class="bi bi-sliders" aria-hidden="true" />
              更多设置
              <i :class="showExtra ? 'bi bi-chevron-up caret' : 'bi bi-chevron-down caret'" aria-hidden="true" />
            </button>
          </div>

          <div class="action-right">
            <span class="save-tip">{{ savedTip }}</span>
            <button class="btn btn-ghost" :disabled="saving" @click="submit(0)">
              {{ saving ? '处理中...' : '保存草稿' }}
            </button>
            <button class="btn btn-primary btn-pill" :disabled="saving" @click="submit(1)">
              {{ saving ? '处理中...' : isEdit ? '保存修改' : '发布' }}
            </button>
          </div>
        </div>
      </template>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, watch, onMounted, onUnmounted } from 'vue'
import { useRoute, useRouter, onBeforeRouteLeave } from 'vue-router'
import MarkdownEditor from '@/components/MarkdownEditor.vue'
import SelectMenu from '@/components/SelectMenu.vue'
import AttachmentLibrary from '@/components/AttachmentLibrary.vue'
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
import { parseIdField, toIdField, truncate, isAdmin } from '@/utils/helper'
import { toast } from '@/utils/toast'

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()
const { user } = storeToRefs(userStore)

const isEdit = computed(() => !!route.params.id)
const articleId = computed(() => Number(route.params.id) || 0)

// 标题 / 正文字数展示上限（与编辑器右下角计数一致）
const titleLimit = 50
const contentLimit = 9999

const loading = ref(false)
const saving = ref(false)
const uploading = ref(false)
const savedTip = ref('')
const newTag = ref('')
// 发布时间：默认预填当前系统时间
const publishAt = ref(toLocalInput(Math.floor(Date.now() / 1000)))
// 用户是否手动改过发布时间（决定保存时用所选时间还是实时时间）
const publishAtTouched = ref(false)

// 更多设置面板 / 评论开关（json.comment，选项与 admin 端一致）
// allow：1 允许 2 禁止（禁止仍展示已有评论，只关掉发表与回复入口）
// show：1 显示 2 隐藏（隐藏则整个评论模块不显示）
const showExtra = ref(false)
const commentAllow = ref(1)
const commentShow = ref(1)

const commentAllowOptions = [
  { value: 1, label: '允许' },
  { value: 2, label: '禁止' }
]
const commentShowOptions = [
  { value: 1, label: '显示' },
  { value: 2, label: '隐藏' }
]

// 审核状态（仅管理员可见/可改）：0 待审核 1 通过 2 不通过
const isAdminUser = computed(() => isAdmin(user.value))
const articleAudit = ref(1)
const auditOptions = [
  { value: 0, label: '待审核' },
  { value: 1, label: '通过' },
  { value: 2, label: '不通过' }
]
// 原文 json，保存时合并，避免覆盖其它自定义配置
const articleJson = ref({})

const coverFileRef = ref(null)
const editorRef = ref(null)
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

// 下拉选项：首项为「不选择分类」，其余为带缩进的板块树
const groupSelectOptions = computed(() => [
  { value: '', label: '不选择分类' },
  ...groupOptions.value.map((g) => ({ value: g.id, label: g.label }))
])

const selectedTags = computed(() => tags.value.filter((t) => form.tagIds.includes(t.id)))
const unselectedTags = computed(() => tags.value.filter((t) => !form.tagIds.includes(t.id)).slice(0, 30))

// 是否有未保存内容（用于离开提醒）
const dirty = ref(false)
watch(
  () => [
    form.title,
    form.abstract,
    form.content,
    form.cover,
    form.group,
    form.tagIds.join(','),
    publishAt.value,
    commentAllow.value,
    commentShow.value,
    articleAudit.value
  ],
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

// 附件库：选择已上传图片作为封面
const showCoverLibrary = ref(false)
function onCoverLibrarySelect(urls = []) {
  const url = urls[0]
  if (!url) return
  form.cover = url
  toast.success('封面已应用')
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
    status,
    // 评论开关：allow 1 允许 2 禁止 / show 1 显示 2 不显示
    // （合并原有 json.comment，避免覆盖其它配置）
    json: {
      ...(articleJson.value || {}),
      comment: {
        ...((articleJson.value || {}).comment || {}),
        allow: commentAllow.value,
        show: commentShow.value
      }
    }
  }
  const publishTime = resolvePublishTime(status)
  if (publishTime) payload.publish_time = publishTime
  // 审核状态仅管理员可写（后端 root 才允许提交 audit 字段）
  if (isAdminUser.value) payload.audit = articleAudit.value
  return payload
}

/**
 * 计算实际写入的发布时间
 * - 用户手动改过 → 用所选时间
 * - 编辑已有文章（原本已有发布时间）→ 沿用原值
 * - 其它（新文章 / 还没发布过的草稿）→ 发布时取当前系统时间，存草稿不写入
 */
function resolvePublishTime(status) {
  if (publishAtTouched.value || originalPublishTime.value) {
    const ts = publishAt.value ? Math.floor(new Date(publishAt.value).getTime() / 1000) : 0
    return Number.isNaN(ts) ? 0 : ts
  }
  return status === 1 ? Math.floor(Date.now() / 1000) : 0
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
    // 回填实际生效的发布时间，避免界面显示与存储不一致
    if (payload.publish_time) {
      originalPublishTime.value = payload.publish_time
      publishAt.value = toLocalInput(payload.publish_time)
      publishAtTouched.value = false
    }
    dirty.value = false
    savedTip.value = status === 1 ? '已保存' : '草稿已保存'
    toast.success(status === 1 ? (isEdit.value ? '修改已保存' : '发布成功') : '草稿已保存')
    if (!isEdit.value && id) {
      router.replace(`/manage/posts/edit/${id}`)
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
      router.replace('/manage/posts')
      return
    }
    // 非管理员只能编辑自己的文章
    const mine = Number(item.uid) === Number(user.value?.id)
    if (!mine) {
      toast.error('只能编辑自己的文章')
      router.replace('/manage/posts')
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

    // 评论开关（2 = 禁止 / 隐藏，其余（含继承）视为 1 = 允许 / 显示）
    articleJson.value = item.json && typeof item.json === 'object' ? item.json : {}
    commentAllow.value = Number(articleJson.value?.comment?.allow) === 2 ? 2 : 1
    commentShow.value = Number(articleJson.value?.comment?.show) === 2 ? 2 : 1

    // 审核状态（仅管理员会用到，0 待审核 1 通过 2 不通过）
    const audit = Number(item.audit)
    articleAudit.value = [0, 1, 2].includes(audit) ? audit : 1

    await loadMeta()
    // 发布时间：已有文章用原值，未设置则默认当前系统时间
    publishAt.value = toLocalInput(originalPublishTime.value || Math.floor(Date.now() / 1000))
    publishAtTouched.value = false
    loading.value = false
    // 数据回填完成后再开启脏值检测
    setTimeout(() => {
      dirty.value = false
      savedTip.value = ''
    }, 0)
    return
  } catch {
    toast.error('文章加载失败')
    router.replace('/manage/posts')
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
.write-page {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

/* ---------- 顶部 ---------- */
.write-top {
  display: flex;
  align-items: center;
  gap: 12px;
}
.back-link {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 13px;
  color: var(--text-muted);
  text-decoration: none;
}
.back-link:hover {
  color: var(--primary);
}
.write-mode {
  font-size: 12px;
  color: var(--text-light);
}

/* ---------- 编辑卡片 ---------- */
.editor-card {
  padding: 0;
  overflow: visible;
}
.loading {
  padding: 40px;
  text-align: center;
  color: var(--text-muted);
}
.form-error {
  margin: 0;
  padding: 0 18px 10px;
  font-size: 12px;
  color: var(--danger);
}
.form-hint {
  margin: 6px 0 0;
  font-size: 12px;
  line-height: 1.6;
  color: var(--text-muted);
}

/* 标题 */
.title-row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 20px 18px 16px;
}
.title-input {
  flex: 1;
  min-width: 0;
  border: none;
  outline: none;
  background: transparent;
  font-size: 22px;
  font-weight: 500;
  line-height: 1.4;
  color: var(--text);
  font-family: var(--font-sans);
}
.title-input::placeholder {
  color: var(--text-light);
  font-weight: 400;
}
.title-count {
  flex-shrink: 0;
  font-size: 12px;
  color: var(--text-muted);
  font-variant-numeric: tabular-nums;
}
.title-count.over {
  color: var(--danger);
}

/* 更多设置面板 */
.extra-panel {
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: 16px 18px 20px;
  border-top: 1px dashed var(--border-soft);
}

/* ---------- 底部操作栏 ---------- */
.action-bar {
  position: sticky;
  bottom: 12px;
  z-index: 6;
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 10px;
  padding: 12px 14px;
  background: var(--bg-card);
  border-top: 1px solid var(--border-soft);
  border-radius: 0 0 var(--radius-lg) var(--radius-lg);
}
.action-left {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
}
.action-right {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-left: auto;
}

/* 胶囊按钮 */
.pill {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 34px;
  padding: 0 14px;
  border: 1px solid var(--border);
  border-radius: 999px;
  background: var(--bg-card);
  color: var(--text-soft);
  font-size: 13px;
  line-height: 1;
  cursor: pointer;
  transition: all 0.18s;
}
.pill:hover:not(:disabled) {
  border-color: var(--primary-soft);
  color: var(--primary);
}
.pill:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.pill.is-active {
  background: var(--accent-soft);
  border-color: var(--primary);
  color: var(--primary-deep);
  font-weight: 600;
}

.save-tip {
  font-size: 12px;
  color: var(--text-muted);
}

/* ---------- 表单（更多设置内） ---------- */

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

@media (max-width: 640px) {
  .title-row {
    padding: 16px 14px 12px;
  }
  .title-input {
    font-size: 18px;
  }
  .extra-panel {
    padding: 14px;
  }
  .form-error {
    padding: 0 14px 8px;
  }
  .action-bar {
    position: static;
    padding: 12px;
  }
  .action-left,
  .action-right {
    width: 100%;
  }
  .action-right {
    justify-content: flex-end;
  }
  .cover-url {
    width: 100%;
  }
}
</style>
