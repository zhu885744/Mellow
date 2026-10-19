<template>
  <div class="docs-library">
    <div class="card card-pad">
      <header class="list-head">
        <div>
          <h2 class="block-title">文档库</h2>
          <p class="block-desc">
            每个文档项目都是一套独立的内容，前台通过 <code>/docs/项目别名</code> 访问
            <template v-if="projects.length"> · 共 {{ projects.length }} 个项目</template>
          </p>
        </div>
        <div class="head-actions">
          <button type="button" class="btn btn-sm" @click="load">
            <i class="bi bi-arrow-clockwise" /> 刷新
          </button>
          <button type="button" class="btn btn-primary btn-sm" @click="openDialog(null)">
            <i class="bi bi-plus-lg" /> 新建项目
          </button>
        </div>
      </header>

      <div v-if="loading" class="loading"><span class="spinner" /> 加载中...</div>

      <div v-else class="proj-grid">
        <article v-for="item in projects" :key="item.id" class="proj-card">
          <div class="proj-card__head">
            <span class="proj-card__icon" aria-hidden="true">
              <i :class="iconOf(item)" />
            </span>
            <div class="proj-card__title">
              <span class="proj-card__name">{{ item.name }}</span>
              <span v-if="!item.status" class="proj-card__badge">已禁用</span>
            </div>
          </div>

          <p class="proj-card__desc">{{ item.description || '暂无描述' }}</p>

          <div class="proj-card__meta">
            <span>共 {{ counts[item.slug] || 0 }} 篇文档</span>
            <code>/docs/{{ item.slug }}</code>
          </div>

          <div class="proj-card__foot">
            <a class="btn btn-sm" :href="`/docs/${item.slug}`" target="_blank" rel="noopener">访问</a>
            <RouterLink class="btn btn-sm" :to="`/admin/docs/${item.slug}`">编辑</RouterLink>
            <button type="button" class="btn btn-sm" @click="openDialog(item)">设置</button>
            <button type="button" class="btn btn-sm btn-ghost is-danger proj-card__del" title="删除项目" @click="askRemove(item)">
              <i class="bi bi-trash" />
            </button>
          </div>
        </article>

        <button type="button" class="proj-card proj-card--new" @click="openDialog(null)">
          <i class="bi bi-plus-circle" aria-hidden="true" />
          <span>新建项目</span>
        </button>
      </div>
    </div>

    <!-- 新建 / 编辑项目 -->
    <div v-if="dialog.open" class="modal-mask" @click.self="dialog.open = false">
      <div class="modal-card">
        <header class="modal-head">
          <h3>{{ dialog.form.id ? '编辑文档项目' : '创建新的文档项目' }}</h3>
          <button type="button" class="modal-close" @click="dialog.open = false">
            <i class="bi bi-x-lg" />
          </button>
        </header>

        <div class="modal-body">
          <div class="form-row">
            <label>名称 <em class="req">*</em></label>
            <input v-model="dialog.form.name" class="input" type="text" placeholder="如：文章限制阅读" />
          </div>

          <div class="form-row">
            <label>别名 <em class="req">*</em></label>
            <input
              v-model="dialog.form.slug"
              class="input"
              type="text"
              placeholder="仅使用小写字母、数字和短横线，如 article-restricted"
            />
            <p class="form-hint">前台访问地址：/docs/{{ dialog.form.slug || '项目别名' }}</p>
          </div>

          <div class="form-row">
            <label>描述</label>
            <textarea v-model="dialog.form.description" class="input" rows="3" placeholder="用一句话说明这个项目讲什么" />
          </div>

          <div class="form-row">
            <label>图标</label>
            <div class="icon-field">
              <span class="icon-field__preview" aria-hidden="true"><i :class="iconOf(dialog.form)" /></span>
              <input v-model="dialog.form.icon" class="input" type="text" placeholder="bi bi-file-earmark-lock" />
            </div>
            <p class="form-hint">填Bootstrap Icons 类名，如 bi bi-file-earmark-lock；留空使用默认图标。</p>
          </div>

          <label class="switch-row">
            <input v-model="commentEnabled" type="checkbox" />
            <span>
              <strong>启用评论</strong>
              <em>启用之后访客可在该项目的文档页评论，需要登录账户才能评论。</em>
            </span>
          </label>

          <div class="form-row form-row--half">
            <div>
              <label>状态</label>
              <select v-model.number="dialog.form.status" class="input">
                <option :value="1">启用</option>
                <option :value="0">禁用</option>
              </select>
            </div>
            <div>
              <label>排序</label>
              <input v-model.number="dialog.form.sort" class="input" type="number" min="0" />
            </div>
          </div>

          <div class="form-row">
            <label>可见性</label>
            <select v-model.number="dialog.form.visible" class="input">
              <option :value="1">公开</option>
              <option :value="2">登录可见</option>
              <option :value="3">指定角色组</option>
            </select>
          </div>

          <div v-if="dialog.form.visible === 3" class="form-row">
            <label>角色组 ID（逗号分隔）</label>
            <input v-model="dialog.form.role_ids" class="input" type="text" placeholder="如：1,2" />
          </div>
        </div>

        <footer class="modal-foot">
          <button type="button" class="btn btn-sm" @click="dialog.open = false">取消</button>
          <button type="button" class="btn btn-primary btn-sm" :disabled="saving" @click="save">
            {{ saving ? '保存中…' : '保存' }}
          </button>
        </footer>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { toast } from '@/utils/toast'
import { listAllDocsProjects, saveDocsProject, removeDocsProjects, listDocs } from '@/api/docs'

const DEFAULT_ICON = 'bi bi-journal-bookmark'

const projects = ref([])
const counts = reactive({})
const loading = ref(false)
const saving = ref(false)

const dialog = reactive({ open: false, form: emptyForm() })

// 复选框用 boolean 双向绑定，提交时再转成后端的 0/1
const commentEnabled = computed({
  get: () => Number(dialog.form.comment_enabled) === 1,
  set: (val) => {
    dialog.form.comment_enabled = val ? 1 : 0
  }
})

function emptyForm() {
  return {
    id: 0, name: '', slug: '', description: '', icon: '',
    sort: 0, status: 1, visible: 1, role_ids: '', comment_enabled: 1
  }
}

function iconOf(item) {
  const icon = String(item?.icon || '').trim()
  return icon ? (icon.startsWith('bi') ? icon : `bi ${icon}`) : DEFAULT_ICON
}

async function load() {
  loading.value = true
  try {
    const res = await listAllDocsProjects()
    projects.value = res?.data || []

    // 后台列表不带文档数，逐个项目查一次（项目数量很少）
    for (const item of projects.value) {
      if (counts[item.slug] !== undefined) continue
      const hit = await listDocs({ version: item.slug, limit: 200 })
        .then((r) => (r?.data || []).length)
        .catch(() => 0)
      counts[item.slug] = hit
    }
  } catch (e) {
    toast.error(e?.message || '加载文档项目失败')
  } finally {
    loading.value = false
  }
}

function openDialog(item) {
  dialog.form = item ? { ...emptyForm(), ...item } : emptyForm()
  dialog.open = true
}

async function save() {
  const name = String(dialog.form.name || '').trim()
  const slug = String(dialog.form.slug || '').trim()

  if (!name || !slug) {
    toast.error('项目名称和别名都不能为空')
    return
  }
  if (!/^[a-z0-9-]+$/.test(slug)) {
    toast.error('别名只能使用小写字母、数字和短横线')
    return
  }

  saving.value = true
  try {
    const res = await saveDocsProject({
      id: Number(dialog.form.id) || 0,
      name,
      slug,
      description: dialog.form.description || '',
      icon: dialog.form.icon || '',
      sort: Number(dialog.form.sort) || 0,
      status: Number(dialog.form.status),
      visible: Number(dialog.form.visible) || 1,
      role_ids: dialog.form.role_ids || '',
      comment_enabled: Number(dialog.form.comment_enabled) ? 1 : 0
    })

    if (res?.code !== 200) {
      toast.error(res?.msg || '保存失败')
      return
    }

    toast.success('已保存')
    dialog.open = false
    // 别名可能改过，清掉计数缓存一起重载
    for (const key of Object.keys(counts)) delete counts[key]
    await load()
  } finally {
    saving.value = false
  }
}

async function askRemove(item) {
  if (!confirm(`确定删除项目「${item.name}」？项目下还有文档或目录时无法删除。`)) return

  const res = await removeDocsProjects(item.id)
  if (res?.code !== 200) {
    toast.error(res?.msg || '删除失败')
    return
  }

  delete counts[item.slug]
  toast.success('已删除')
  await load()
}

onMounted(load)
</script>

<style scoped>
.list-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 16px;
  flex-wrap: wrap;
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
.block-desc code,
.form-hint code {
  padding: 1px 5px;
  font-size: 11.5px;
  color: var(--primary);
  background: var(--accent-wash);
  border-radius: 4px;
}
.head-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}

/* ---------- 项目卡片 ---------- */
.proj-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 12px;
}
.proj-card {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 16px;
  text-align: left;
  background: var(--bg-alt);
  border: 1px solid var(--border-soft);
  border-radius: var(--radius);
}
.proj-card__head {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
}
.proj-card__icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  width: 32px;
  height: 32px;
  font-size: 16px;
  color: var(--primary);
  background: var(--accent-wash);
  border-radius: var(--radius-sm);
}
.proj-card__title {
  display: flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
}
.proj-card__name {
  font-size: 14px;
  font-weight: 600;
  color: var(--text);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.proj-card__badge {
  flex-shrink: 0;
  padding: 1px 6px;
  font-size: 10.5px;
  color: var(--text-muted);
  background: var(--bg-muted);
  border-radius: 999px;
}
.proj-card__desc {
  margin: 0;
  min-height: 38px;
  font-size: 12.5px;
  line-height: 1.55;
  color: var(--text-muted);
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.proj-card__meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  font-size: 11.5px;
  color: var(--text-light);
}
.proj-card__meta code {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.proj-card__foot {
  display: flex;
  align-items: center;
  gap: 6px;
  padding-top: 10px;
  margin-top: auto;
  border-top: 1px solid var(--border-soft);
}
.proj-card__del {
  margin-left: auto;
}

/* 新建卡片：虚线占位 */
.proj-card--new {
  align-items: center;
  justify-content: center;
  gap: 8px;
  min-height: 168px;
  color: var(--text-light);
  background: transparent;
  border-style: dashed;
  cursor: pointer;
}
.proj-card--new:hover {
  color: var(--primary);
  border-color: var(--primary-soft);
}
.proj-card--new i {
  font-size: 22px;
}
.proj-card--new span {
  font-size: 13px;
}

/* ---------- 弹窗 ---------- */
.modal-mask {
  position: fixed;
  inset: 0;
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  background: rgba(0, 0, 0, 0.42);
}
.modal-card {
  width: 100%;
  max-width: 560px;
  max-height: 88vh;
  display: flex;
  flex-direction: column;
  background: var(--bg-card);
  border: 1px solid var(--border-soft);
  border-radius: var(--radius-lg);
  overflow: hidden;
}
.modal-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 16px 20px;
  border-bottom: 1px solid var(--border-soft);
}
.modal-head h3 {
  margin: 0;
  font-size: 15px;
  font-weight: 600;
  color: var(--text);
}
.modal-close {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  padding: 0;
  color: var(--text-light);
  background: transparent;
  border: none;
  border-radius: 50%;
  cursor: pointer;
}
.modal-close:hover {
  color: var(--text);
  background: var(--bg-muted);
}
.modal-body {
  padding: 18px 20px;
  overflow-y: auto;
}
.modal-foot {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  padding: 12px 20px;
  border-top: 1px solid var(--border-soft);
}

.form-row {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-bottom: 14px;
}
.form-row label {
  font-size: 12px;
  color: var(--text-muted);
}
.form-row--half {
  flex-direction: row;
  gap: 12px;
}
.form-row--half > div {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.form-row textarea {
  resize: vertical;
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

.icon-field {
  display: flex;
  align-items: center;
  gap: 8px;
}
.icon-field__preview {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  width: 32px;
  height: 32px;
  font-size: 15px;
  color: var(--primary);
  background: var(--accent-wash);
  border-radius: var(--radius-sm);
}

/* 启用评论开关 */
.switch-row {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 12px 0;
  margin-bottom: 14px;
  cursor: pointer;
}
.switch-row input {
  margin-top: 3px;
  flex-shrink: 0;
  width: 15px;
  height: 15px;
  accent-color: var(--primary);
}
.switch-row span {
  display: flex;
  flex-direction: column;
  gap: 3px;
}
.switch-row strong {
  font-size: 13px;
  font-weight: 600;
  color: var(--text);
}
.switch-row em {
  font-size: 11.5px;
  line-height: 1.6;
  font-style: normal;
  color: var(--text-light);
}

@media (max-width: 900px) {
  .form-row--half {
    flex-direction: column;
  }
}
</style>