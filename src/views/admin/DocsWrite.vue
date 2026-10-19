<template>
  <div class="docs-write">
    <div class="card card-pad">
      <!-- 头部 -->
      <header class="write-head">
        <div class="write-head__left">
          <RouterLink :to="`/admin/docs/${slug}`" class="write-back" title="返回文档列表">
            <i class="bi bi-arrow-left" />
          </RouterLink>
          <div>
            <h2 class="block-title">{{ isEdit ? '编辑文档' : '新建文档' }}</h2>
            <p class="block-desc">
              {{ project?.name || '文档' }} · 前台路径
              <code v-if="form.slug">/docs/{{ slug }}{{ gidSlug }}/{{ form.slug }}</code>
              <code v-else>/docs/{{ slug }}/…</code>
            </p>
          </div>
        </div>

        <div class="write-head__actions">
          <a v-if="isEdit" class="btn btn-sm" :href="viewUrl" target="_blank" rel="noopener">
            <i class="bi bi-box-arrow-up-right" /> 查看前台
          </a>
          <button type="button" class="btn btn-sm" @click="save(0)" :disabled="saving">存草稿</button>
          <button type="button" class="btn btn-primary btn-sm" @click="save(1)" :disabled="saving">
            <i class="bi bi-check-lg" /> 发布
          </button>
        </div>
      </header>

      <div v-if="!ready" class="loading"><span class="spinner" /> 加载中...</div>

      <template v-else>
        <!-- 基本信息 -->
        <div class="form-grid">
          <div class="form-row">
            <label>标题 <em class="req">*</em></label>
            <input v-model="form.title" class="input" type="text" placeholder="文档标题" />
          </div>

          <div class="form-row">
            <label>标识（slug） <em class="req">*</em></label>
            <input v-model="form.slug" class="input" type="text" placeholder="如：install" />
            <p class="form-hint">只能用字母、数字、短横线和下划线，同一目录内唯一。</p>
          </div>

          <div class="form-row">
            <label>所属目录</label>
            <select v-model.number="form.gid" class="input">
              <option :value="0">未分类（一级根）</option>
              <option v-for="item in groupOptions" :key="item.id" :value="item.id">{{ item.name }}</option>
            </select>
          </div>

          <div class="form-row">
            <label>排序</label>
            <input v-model.number="form.sort" class="input" type="number" min="0" />
          </div>

          <div class="form-row">
            <label>可见性</label>
            <select v-model.number="form.visible" class="input">
              <option :value="1">公开</option>
              <option :value="2">登录可见</option>
              <option :value="3">指定角色组</option>
            </select>
          </div>

          <div v-if="form.visible === 3" class="form-row">
            <label>角色组 ID（逗号分隔）</label>
            <input v-model="form.role_ids" class="input" type="text" placeholder="如：1,2" />
          </div>
        </div>

        <!-- 正文：复用文章编辑器组件（MarkdownEditor 自带工具栏 / 预览 / 图片上传 / 代码高亮） -->
        <MarkdownEditor
          v-model="form.content"
          placeholder="支持 Markdown：标题、列表、代码块、表格…"
          min-height="460px"
          :max-length="contentLimit"
          @save="save(Number(form.status))"
        />

        <!-- SEO -->
        <details class="write-seo">
          <summary>SEO（可选）</summary>
          <div class="form-grid">
            <div class="form-row">
              <label>SEO 标题</label>
              <input v-model="form.seo_title" class="input" type="text" />
            </div>
            <div class="form-row">
              <label>SEO 关键词</label>
              <input v-model="form.seo_keywords" class="input" type="text" />
            </div>
            <div class="form-row form-row--wide">
              <label>SEO 描述</label>
              <input v-model="form.seo_description" class="input" type="text" />
            </div>
          </div>
        </details>
      </template>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, watch, onMounted, onBeforeUnmount } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import MarkdownEditor from '@/components/MarkdownEditor.vue'
import { toast } from '@/utils/toast'
import { docsGroupTree, getDocs, getDocsProject, saveDocs } from '@/api/docs'

const route = useRoute()
const router = useRouter()

const contentLimit = 99999

const slug = computed(() => String(route.params.slug || ''))
const docsId = computed(() => Number(route.params.id) || 0)
const isEdit = computed(() => docsId.value > 0)

const project = ref(null)
const tree = ref([])
const ready = ref(false)
const saving = ref(false)
const dirty = ref(false)

const form = reactive(emptyForm())

// 前台路径里的目录段：根目录用占位符 "-"
const gidSlug = computed(() => {
  const hit = groupOptions.value.find((item) => item.id === Number(form.gid))
  return hit ? `/${hit.slug}` : '/-'
})

const viewUrl = computed(() => `/docs/${slug.value}${gidSlug.value}/${form.slug}`)

const groupOptions = computed(() => {
  const result = []
  const walk = (nodes, depth = 0) => {
    for (const node of nodes || []) {
      // 虚拟根节点（未分类，id=0）不作为可选目录，新建时用「未分类」选项
      if (node.id > 0) {
        result.push({ id: node.id, name: `${'　'.repeat(depth)}${node.name}`, slug: node.slug })
      }
      walk(node.children, depth + 1)
    }
  }
  walk(tree.value)
  return result
})

function emptyForm() {
  return {
    id: 0, gid: 0, title: '', slug: '', sort: 0, status: 1, visible: 1,
    role_ids: '', content: '', seo_title: '', seo_keywords: '', seo_description: ''
  }
}

function reset() {
  Object.assign(form, emptyForm())
  dirty.value = false
}

async function loadTree() {
  if (!slug.value) return []
  try {
    const res = await docsGroupTree({ version: slug.value })
    tree.value = res?.data || []
  } catch {
    tree.value = []
  }
  return tree.value
}

async function loadProject() {
  if (!slug.value) return
  try {
    const res = await getDocsProject({ slug: slug.value })
    project.value = res?.data || null
  } catch {
    project.value = null
  }
}

async function load() {
  ready.value = false
  reset()
  await loadTree()
  await loadProject()

  if (!isEdit.value) {
    // 新建时带上列表页传来的目录 / 排序作为默认值
    form.gid = Number(route.query.gid) || 0
    form.sort = Number(route.query.sort) || 0
  } else {
    // 列表接口不带 content，编辑要单独拉一次完整详情
    // version 必须显式带上：后端 one 接口的 version 默认是 latest，
    // 不传会把非 latest 项目的文档查成「不存在」
    const res = await getDocs({ id: docsId.value, version: slug.value, admin: 1 }).catch(() => null)
    if (!res?.data) {
      toast.error('文档不存在或已被删除')
      router.replace(`/admin/docs/${slug.value}`)
      return
    }
    Object.assign(form, {
      ...emptyForm(),
      ...res.data,
      id: Number(res.data.id) || docsId.value
    })
  }

  ready.value = true
}

async function save(status) {
  const target = Number(status)
  if (!form.title.trim()) {
    toast.error('标题不能为空')
    return
  }
  if (!form.slug.trim()) {
    toast.error('标识（slug）不能为空')
    return
  }

  saving.value = true
  try {
    // 白名单提交：详情接口还会返回 breadcrumb / prev / next / comment 等只读字段
    const payload = {
      id: Number(form.id) || 0,
      gid: Number(form.gid) || 0,
      version: slug.value,
      slug: form.slug.trim(),
      title: form.title.trim(),
      content: form.content || '',
      sort: Number(form.sort) || 0,
      status: target,
      visible: Number(form.visible) || 1,
      role_ids: form.role_ids || '',
      seo_title: form.seo_title || '',
      seo_keywords: form.seo_keywords || '',
      seo_description: form.seo_description || ''
    }

    const res = await saveDocs(payload)
    if (res?.code !== 200) {
      toast.error(res?.msg || '保存失败')
      return
    }

    form.status = target
    dirty.value = false
    toast.success(target === 1 ? '已发布' : '已存为草稿')

    // 新建成功后转成编辑态，地址换成带 id 的深链
    if (!isEdit.value) {
      const newId = Number(form.id) || Number(res?.data?.id) || 0
      if (newId > 0) {
        form.id = newId
        router.replace(`/admin/docs/${slug.value}/${newId}/edit`)
      }
    }
  } finally {
    saving.value = false
  }
}

function confirmLeave(e) {
  if (!dirty.value) return
  e.preventDefault()
  e.returnValue = ''
}

watch(
  () => [route.params.slug, route.params.id],
  () => load()
)

// 有改动时拦一下刷新 / 关闭，避免误操作丢正文
watch(form, () => {
  if (ready.value) dirty.value = true
}, { deep: true })

onMounted(() => {
  load()
  window.addEventListener('beforeunload', confirmLeave)
})

onBeforeUnmount(() => {
  window.removeEventListener('beforeunload', confirmLeave)
})
</script>

<style scoped>
.write-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 18px;
  flex-wrap: wrap;
}
.write-head__left {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  min-width: 0;
}
.write-back {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 26px;
  margin-top: 2px;
  flex-shrink: 0;
  font-size: 14px;
  color: var(--text-light);
  text-decoration: none;
  border-radius: var(--radius-sm);
  transition: color 0.15s, background-color 0.15s;
}
.write-back:hover {
  color: var(--primary);
  background: var(--bg-muted);
}
.write-head__actions {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}
.block-title {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: var(--text);
}
.block-desc {
  margin: 4px 0 0;
  font-size: 12px;
  color: var(--text-muted);
}
.block-desc code {
  padding: 1px 5px;
  font-size: 11.5px;
  color: var(--primary);
  background: var(--accent-wash);
  border-radius: 4px;
}

/* 表单：窄屏折成单列 */
.form-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0 14px;
}
.form-row {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-bottom: 14px;
}
.form-row--wide {
  grid-column: 1 / -1;
}
.form-row label {
  font-size: 12px;
  color: var(--text-muted);
}
.req {
  color: #dc2626;
  font-style: normal;
}
.form-hint {
  margin: 0;
  font-size: 11.5px;
  line-height: 1.6;
  color: var(--text-light);
}

.write-seo {
  margin-top: 18px;
  padding-top: 14px;
  border-top: 1px dashed var(--border-soft);
  font-size: 12px;
  color: var(--text-muted);
}
.write-seo summary {
  cursor: pointer;
  margin-bottom: 12px;
}

@media (max-width: 900px) {
  .form-grid {
    grid-template-columns: 1fr;
  }
}
</style>