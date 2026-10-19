<template>
  <div class="docs-admin">
    <div class="card card-pad">
      <header class="list-head">
        <div>
          <h2 class="block-title">
            <RouterLink to="/admin/docs" class="head-back" title="返回文档库">
              <i class="bi bi-arrow-left" />
            </RouterLink>
            {{ project?.name || '文档' }}
          </h2>
          <p class="block-desc">
            目录 + 多页面的文档站，支持多级目录、排序与历史回滚
            <template v-if="allDocsCount"> · 共 {{ allDocsCount }} 篇</template>
            <template v-if="project"> · 前台地址 /docs/{{ project.slug }}</template>
          </p>
        </div>
        <div class="head-actions">
          <a class="btn btn-sm" :href="`/docs/${slug}`" target="_blank" rel="noopener">
            <i class="bi bi-box-arrow-up-right" /> 访问前台
          </a>
          <button type="button" class="btn btn-sm" @click="openImportDialog">
            <i class="bi bi-upload" /> 导入
          </button>
          <button type="button" class="btn btn-sm" @click="openGroupDialog(null, null)">
            <i class="bi bi-folder-plus" /> 新建目录
          </button>
          <button type="button" class="btn btn-primary btn-sm" @click="goWrite()">
            <i class="bi bi-plus-lg" /> 新建文档
          </button>
        </div>
      </header>

      <div class="docs-layout">
        <!-- 目录树 -->
        <aside class="docs-tree">
          <div class="docs-tree__head">
            <span>目录</span>
            <button type="button" class="btn btn-sm btn-ghost" title="刷新" @click="reload">
              <i class="bi bi-arrow-clockwise" />
            </button>
          </div>

          <div class="docs-tree__body">
            <button
              type="button"
              class="tree-all"
              :class="{ active: !currentGroup }"
              @click="selectGroup(null)"
            >全部文档</button>

            <DocsTreeNode
              v-for="node in tree"
              :key="node.id"
              :node="node"
              :active-id="currentGroup?.id || 0"
              @select="selectGroup"
              @edit="(item) => openGroupDialog(item, null)"
              @remove="askRemoveGroup"
              @add-child="(item) => openGroupDialog(null, item)"
            />

            <p v-if="!tree.length" class="docs-empty">还没有目录，先新建一个。</p>
          </div>
        </aside>

        <!-- 文档列表 -->
        <section class="docs-list">
          <div class="docs-list__head">
            <span class="docs-list__title">{{ currentGroup ? currentGroup.name : '全部文档' }}</span>
            <span class="docs-list__count">{{ docs.length }} 篇</span>
          </div>

          <div v-if="loading" class="loading"><span class="spinner" /> 加载中...</div>
          <div v-else-if="!docs.length" class="empty-row">这个目录下还没有文档</div>

          <div v-else class="docs-rows">
            <div v-for="(doc, index) in docs" :key="doc.id" class="docs-row">
              <span class="docs-row__sort" :title="`排序 ${doc.sort}`">{{ doc.sort }}</span>

              <div class="docs-row__main" @click="goWrite(doc)">
                <span class="docs-row__title">{{ doc.title }}</span>
                <span class="docs-row__slug">/{{ doc.slug }}</span>
              </div>

              <span class="status-pill" :class="`is-${doc.status}`">{{ statusText(doc.status) }}</span>
              <span class="docs-row__time">{{ formatDate(doc.update_time) }}</span>

              <div class="docs-row__actions">
                <button type="button" class="btn btn-sm btn-ghost" title="上移" :disabled="index === 0" @click="moveDoc(index, -1)">
                  <i class="bi bi-arrow-up" />
                </button>
                <button type="button" class="btn btn-sm btn-ghost" title="下移" :disabled="index === docs.length - 1" @click="moveDoc(index, 1)">
                  <i class="bi bi-arrow-down" />
                </button>
                <button type="button" class="btn btn-sm btn-ghost" title="历史" @click="openHistory(doc)">
                  <i class="bi bi-clock-history" />
                </button>
                <button type="button" class="btn btn-sm btn-ghost" title="编辑" @click="goWrite(doc)">
                  <i class="bi bi-pencil" />
                </button>
                <button type="button" class="btn btn-sm btn-ghost is-danger" title="删除" @click="askRemoveDoc(doc)">
                  <i class="bi bi-trash" />
                </button>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>

    <!-- 目录编辑 -->
    <div v-if="groupDialog.open" class="modal-mask" @click.self="groupDialog.open = false">
      <div class="modal-card">
        <header class="modal-head">
          <h3>{{ groupDialog.form.id ? '编辑目录' : '新建目录' }}</h3>
          <button type="button" class="modal-close" @click="groupDialog.open = false">
            <i class="bi bi-x-lg" />
          </button>
        </header>

        <div class="modal-body">
          <div class="form-row">
            <label>目录名称</label>
            <input v-model="groupDialog.form.name" class="input" type="text" placeholder="如：快速开始" />
          </div>
          <div class="form-row">
            <label>目录标识（slug）</label>
            <input v-model="groupDialog.form.slug" class="input" type="text" placeholder="如：start" />
          </div>
          <div class="form-row">
            <label>上级目录</label>
            <select v-model.number="groupDialog.form.pid" class="input">
              <option :value="0">顶级目录</option>
              <option v-for="item in groupOptions" :key="item.id" :value="item.id">{{ item.name }}</option>
            </select>
          </div>
          <div class="form-row form-row--half">
            <div>
              <label>排序</label>
              <input v-model.number="groupDialog.form.sort" class="input" type="number" min="0" />
            </div>
            <div>
              <label>状态</label>
              <select v-model.number="groupDialog.form.status" class="input">
                <option :value="1">启用</option>
                <option :value="0">禁用</option>
              </select>
            </div>
          </div>
          <div class="form-row">
            <label>描述</label>
            <input v-model="groupDialog.form.description" class="input" type="text" placeholder="可选" />
          </div>
        </div>

        <footer class="modal-foot">
          <button type="button" class="btn btn-sm" @click="groupDialog.open = false">取消</button>
          <button type="button" class="btn btn-primary btn-sm" :disabled="saving" @click="saveGroup">保存</button>
        </footer>
      </div>
    </div>


    <!-- 历史 -->
    <div v-if="historyDialog.open" class="modal-mask" @click.self="historyDialog.open = false">
      <div class="modal-card">
        <header class="modal-head">
          <h3>历史记录 · {{ historyDialog.title }}</h3>
          <button type="button" class="modal-close" @click="historyDialog.open = false">
            <i class="bi bi-x-lg" />
          </button>
        </header>

        <div class="modal-body">
          <div v-if="historyDialog.loading" class="loading"><span class="spinner" /> 加载中...</div>
          <div v-else-if="!historyDialog.list.length" class="empty-row">暂无历史记录</div>
          <div v-else class="history-list">
            <div v-for="item in historyDialog.list" :key="item.id" class="history-row">
              <div class="history-row__main">
                <span class="history-row__summary">{{ item.summary || '保存文档' }}</span>
                <span class="history-row__time">{{ formatDate(item.create_time) }} · #{{ item.id }}</span>
              </div>
              <button type="button" class="btn btn-sm" @click="rollback(item)">回滚</button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 导入 -->
    <div v-if="importDialog.open" class="modal-mask" @click.self="closeImportDialog">
      <div class="modal-card">
        <header class="modal-head">
          <h3>导入文档</h3>
          <button type="button" class="modal-close" @click="closeImportDialog">
            <i class="bi bi-x-lg" />
          </button>
        </header>

        <div class="modal-body">
          <div class="form-row">
            <label>文件（.md / .zip）</label>

            <!-- 原生 file 控件在各浏览器里样式不统一，这里隐藏后用按钮触发 -->
            <div class="import-file">
              <input
                ref="importFileRef"
                class="import-file__input"
                type="file"
                accept=".md,.markdown,.zip"
                @change="onImportFile"
              />
              <button type="button" class="btn btn-sm" :disabled="importing" @click="pickImportFile">
                <i class="bi bi-folder2-open" /> 选择文件
              </button>
              <span class="import-file__name" :class="{ 'is-empty': !importDialog.file }">
                {{ importDialog.file ? importDialog.file.name : '未选择文件' }}
              </span>
            </div>

            <p class="form-hint">
              单个 Markdown 直接导入为一篇；压缩包会按目录结构自动创建文档目录。
              支持 front-matter：title / slug / sort / status。
            </p>
          </div>

          <div class="form-row form-row--half">
            <div>
              <label>导入到</label>
              <select v-model.number="importDialog.gid" class="input">
                <option :value="0">根目录</option>
                <option v-for="item in groupOptions" :key="item.id" :value="item.id">{{ item.name }}</option>
              </select>
            </div>
            <div>
              <label>同名文档</label>
              <select v-model.number="importDialog.overwrite" class="input">
                <option :value="1">覆盖更新</option>
                <option :value="0">跳过</option>
              </select>
            </div>
          </div>

          <div v-if="importDialog.result" class="import-result">
            <p class="import-result__line">
              新建 <strong>{{ importDialog.result.created }}</strong> 篇 ·
              更新 <strong>{{ importDialog.result.updated }}</strong> 篇 ·
              跳过 <strong>{{ importDialog.result.skipped }}</strong> 篇 ·
              目录 <strong>{{ importDialog.result.groups }}</strong> 个
            </p>
            <ul v-if="importDialog.result.errors?.length" class="import-result__errors">
              <li v-for="(item, i) in importDialog.result.errors" :key="i">{{ item }}</li>
            </ul>
          </div>
        </div>

        <footer class="modal-foot">
          <button type="button" class="btn btn-sm" @click="closeImportDialog">关闭</button>
          <button type="button" class="btn btn-primary btn-sm" :disabled="importing || !importDialog.file" @click="submitImport">
            {{ importing ? '导入中…' : '开始导入' }}
          </button>
        </footer>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, watch, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import DocsTreeNode from './DocsTreeNode.vue'
import { formatDate } from '@/utils/time'
import { toast } from '@/utils/toast'
import {
  docsGroupTree, saveDocsGroup, removeDocsGroup,
  listDocs, removeDocs, sortDocs,
  docsHistory, rollbackDocs, importDocs,
  getDocsProject
} from '@/api/docs'

const route = useRoute()
const router = useRouter()

// 项目别名来自路由 /admin/docs/:slug，对应后端的 docs.version
const slug = computed(() => String(route.params.slug || ''))
const project = ref(null)

const tree = ref([])
const docs = ref([])
const currentGroup = ref(null)
const loading = ref(false)
const saving = ref(false)

const allDocsCount = ref(0)

const groupDialog = reactive({ open: false, form: emptyGroup() })
const historyDialog = reactive({ open: false, loading: false, title: '', docsId: 0, list: [] })
const importDialog = reactive({ open: false, file: null, gid: 0, overwrite: 1, result: null })
const importing = ref(false)
const importFileRef = ref(null)

const groupOptions = computed(() => {
  const result = []
  const walk = (nodes, depth = 0) => {
    for (const node of nodes || []) {
      // 虚拟根节点（未分类，id=0）不作为可选目录，新建时用「根目录」选项
      if (node.id > 0) {
        result.push({ id: node.id, name: `${'　'.repeat(depth)}${node.name}` })
      }
      walk(node.children, depth + 1)
    }
  }
  walk(tree.value)
  return result
})

function emptyGroup() {
  return { id: 0, pid: 0, name: '', slug: '', sort: 0, status: 1, description: '' }
}

// goWrite - 跳到独立整页编辑器（新建走write，编辑走: id /edit）
// 新建时把当前目录与排序带过去，省得再选一次
function goWrite(doc) {
  if (doc?.id) {
    router.push(`/admin/docs/${slug.value}/${doc.id}/edit`)
    return
  }

  const last = docs.value[docs.value.length - 1]
  router.push({
    path: `/admin/docs/${slug.value}/write`,
    query: {
      gid: currentGroup.value?.id || 0,
      sort: last ? Number(last.sort) + 1 : 0
    }
  })
}

function statusText(status) {
  return { 0: '草稿', 1: '已发布' }[Number(status)] || '未知'
}

async function reload() {
  if (!slug.value) return

  loading.value = true
  try {
    const [treeRes, docRes] = await Promise.all([
      docsGroupTree({ version: slug.value }),
      listDocs({ version: slug.value, gid: currentGroup.value ? currentGroup.value.id : undefined })
    ])
    tree.value = treeRes?.data || []
    docs.value = docRes?.data || []

    if (!currentGroup.value) {
      allDocsCount.value = docs.value.length
    }
  } catch (e) {
    toast.error(e?.message || '加载文档失败')
  } finally {
    loading.value = false
  }
}

async function loadProject() {
  if (!slug.value) {
    project.value = null
    return
  }

  try {
    const res = await getDocsProject({ slug: slug.value })
    project.value = res?.data || null
  } catch {
    project.value = null
  }
}

function selectGroup(node) {
  currentGroup.value = node
  reload()
}

function openGroupDialog(item, parent) {
  groupDialog.form = item
    ? { ...emptyGroup(), ...item }
    : { ...emptyGroup(), pid: parent?.id || 0 }
  groupDialog.open = true
}

async function saveGroup() {
  if (!groupDialog.form.name || !groupDialog.form.slug) {
    toast.error('目录名称和标识不能为空')
    return
  }

  saving.value = true
  try {
    const res = await saveDocsGroup({ ...groupDialog.form, version: slug.value })
    if (res?.code !== 200) {
      toast.error(res?.msg || '保存失败')
      return
    }
    toast.success('已保存')
    groupDialog.open = false
    await reload()
  } finally {
    saving.value = false
  }
}

async function askRemoveGroup(node) {
  if (!confirm(`确定删除目录「${node.name}」？目录下有内容时无法删除。`)) return

  const res = await removeDocsGroup(node.id)
  if (res?.code !== 200) {
    toast.error(res?.msg || '删除失败')
    return
  }
  if (currentGroup.value?.id === node.id) currentGroup.value = null
  toast.success('已删除')
  await reload()
}


async function askRemoveDoc(doc) {
  if (!confirm(`确定删除文档「${doc.title}」？`)) return

  const res = await removeDocs(doc.id)
  if (res?.code !== 200) {
    toast.error(res?.msg || '删除失败')
    return
  }
  toast.success('已删除')
  await reload()
}

// 上移 / 下移：交换 sort 后批量提交
async function moveDoc(index, offset) {
  const target = index + offset
  if (target < 0 || target >= docs.value.length) return

  const current = docs.value[index]
  const neighbor = docs.value[target]

  const currentSort = current.sort
  const neighborSort = neighbor.sort

  const items = [
    { id: current.id, sort: neighborSort },
    { id: neighbor.id, sort: currentSort }
  ]

  // sort 相同的情况下用下标兜底，避免交换后顺序不变
  if (currentSort === neighborSort) {
    items[0].sort = index + offset + 1
    items[1].sort = index + 1
  }

  const res = await sortDocs(items)
  if (res?.code !== 200) {
    toast.error(res?.msg || '排序失败')
    return
  }
  await reload()
}

async function openHistory(doc) {
  historyDialog.open = true
  historyDialog.loading = true
  historyDialog.title = doc.title
  historyDialog.docsId = doc.id
  historyDialog.list = []

  try {
    const res = await docsHistory(doc.id)
    historyDialog.list = res?.data || []
  } catch {
    historyDialog.list = []
  } finally {
    historyDialog.loading = false
  }
}

async function rollback(item) {
  if (!confirm(`回滚到「${item.summary || '历史 #' + item.id}」？当前内容会被覆盖。`)) return

  const res = await rollbackDocs(item.id)
  if (res?.code !== 200) {
    toast.error(res?.msg || '回滚失败')
    return
  }
  toast.success('已回滚')
  historyDialog.open = false
  await reload()
}

function openImportDialog() {
  importDialog.open = true
  importDialog.file = null
  importDialog.gid = currentGroup.value?.id || 0
  importDialog.overwrite = 1
  importDialog.result = null
}

function closeImportDialog() {
  if (importing.value) return
  importDialog.open = false
  // 清空 value，下次选同一个文件也能触发 change
  if (importFileRef.value) importFileRef.value.value = ''
}

function pickImportFile() {
  if (importing.value) return
  importFileRef.value?.click()
}

function onImportFile(event) {
  importDialog.file = event.target.files?.[0] || null
  importDialog.result = null
}

async function submitImport() {
  if (!importDialog.file) {
    toast.error('请先选择文件')
    return
  }

  importing.value = true
  try {
    const fd = new FormData()
    fd.append('file', importDialog.file, importDialog.file.name)
    fd.append('version', slug.value)
    fd.append('gid', String(importDialog.gid))
    fd.append('overwrite', String(importDialog.overwrite))

    const res = await importDocs(fd)
    if (res?.code !== 200) {
      toast.error(res?.msg || '导入失败')
      return
    }

    importDialog.result = res.data || { created: 0, updated: 0, skipped: 0, groups: 0, errors: [] }
    toast.success('导入完成')
    await reload()
  } catch (e) {
    toast.error(e?.message || '导入失败')
  } finally {
    importing.value = false
  }
}

// 切换项目时重置目录选中态并重新拉数据
watch(slug, async () => {
  currentGroup.value = null
  allDocsCount.value = 0
  await loadProject()
  await reload()
})

onMounted(async () => {
  await loadProject()
  await reload()
})
</script>

<style scoped>
/* 头部与工具栏：与其他后台页面保持同一套布局（这些类是各页面 scoped 定义的） */
.list-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 16px;
  flex-wrap: wrap;
}
.block-title {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: var(--text);
}
.head-back {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  font-size: 13px;
  color: var(--text-light);
  text-decoration: none;
  border-radius: var(--radius-sm);
  transition: color 0.15s, background-color 0.15s;
}
.head-back:hover {
  color: var(--primary);
  background: var(--bg-muted);
}
.block-desc {
  margin: 4px 0 0;
  font-size: 12px;
  color: var(--text-muted);
}
.head-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
  flex-wrap: wrap;
}

.docs-layout {
  display: grid;
  grid-template-columns: 260px minmax(0, 1fr);
  gap: 16px;
  align-items: stretch;
  min-height: 420px;
}

/* 目录树 */
.docs-tree {
  min-width: 0;
  display: flex;
  flex-direction: column;
  padding: 10px;
  background: var(--bg-alt);
  border: 1px solid var(--border-soft);
  border-radius: var(--radius);
}
.docs-tree__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 4px 6px 10px;
  font-size: 12px;
  font-weight: 600;
  color: var(--text-muted);
  letter-spacing: 1px;
  border-bottom: 1px solid var(--border-soft);
}
.docs-tree__body {
  display: flex;
  flex-direction: column;
  gap: 2px;
  flex: 1;
  margin-top: 8px;
  overflow-y: auto;
}
.tree-all {
  padding: 8px 10px;
  text-align: left;
  font-size: 13.5px;
  color: var(--text-soft);
  background: transparent;
  border: none;
  border-radius: var(--radius-sm);
  cursor: pointer;
}
.tree-all:hover {
  background: var(--bg-muted);
}
.tree-all.active {
  color: var(--primary);
  background: var(--accent-soft);
  font-weight: 600;
}

/* 文档列表 */
.docs-list {
  min-width: 0;
  display: flex;
  flex-direction: column;
  padding: 4px 4px 4px 0;
}
.docs-list__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-bottom: 10px;
  border-bottom: 1px solid var(--border-soft);
}
.docs-list__title {
  font-size: 14px;
  font-weight: 600;
  color: var(--text);
}
.docs-list__count {
  font-size: 12px;
  color: var(--text-light);
}
.docs-rows {
  display: flex;
  flex-direction: column;
}
.docs-row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 4px;
  border-bottom: 1px solid var(--border-soft);
  font-size: 13px;
}
.docs-row:last-child {
  border-bottom: none;
}
.docs-row__sort {
  width: 24px;
  flex-shrink: 0;
  font-size: 11px;
  color: var(--text-light);
  text-align: center;
}
.docs-row__main {
  flex: 1;
  min-width: 0;
  display: flex;
  align-items: baseline;
  gap: 8px;
  cursor: pointer;
}
.docs-row__title {
  font-weight: 600;
  color: var(--text);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.docs-row__main:hover .docs-row__title {
  color: var(--primary);
}
.docs-row__slug {
  flex-shrink: 0;
  font-size: 11px;
  color: var(--text-light);
}
.docs-row__time {
  flex-shrink: 0;
  font-size: 11px;
  color: var(--text-light);
}
.docs-row__actions {
  display: flex;
  align-items: center;
  gap: 2px;
  flex-shrink: 0;
}
.status-pill {
  flex-shrink: 0;
  padding: 2px 8px;
  font-size: 11px;
  border-radius: 999px;
  background: var(--bg-muted);
  color: var(--text-muted);
}
.status-pill.is-1 {
  color: var(--primary);
  background: var(--accent-wash);
}
.status-pill.is-2 {
  color: #b8860b;
  background: rgba(184, 134, 11, 0.12);
}
.docs-empty {
  margin: 12px 6px;
  font-size: 12px;
  color: var(--text-light);
}

/* 弹窗 */
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
.modal-head__actions {
  display: flex;
  align-items: center;
  gap: 8px;
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
.docs-editor {
  width: 100%;
  min-height: 320px;
  padding: 12px;
  font-family: var(--font-mono, ui-monospace, monospace);
  font-size: 13px;
  line-height: 1.7;
  resize: vertical;
}
.form-hint {
  margin: 0;
  font-size: 11.5px;
  line-height: 1.6;
  color: var(--text-light);
}

/* 文件选择：隐藏原生控件，用按钮 + 文件名展示 */
.import-file {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
}
.import-file__input {
  display: none;
}
.import-file__name {
  flex: 1;
  min-width: 0;
  padding: 6px 10px;
  font-size: 12px;
  color: var(--text-soft);
  background: var(--bg-alt);
  border: 1px dashed var(--border-soft);
  border-radius: var(--radius-sm);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.import-file__name.is-empty {
  color: var(--text-light);
}

/* 导入结果 */
.import-result {
  margin-top: 6px;
  padding: 12px 14px;
  background: var(--bg-alt);
  border: 1px solid var(--border-soft);
  border-radius: var(--radius-sm);
}
.import-result__line {
  margin: 0;
  font-size: 13px;
  color: var(--text-soft);
}
.import-result__line strong {
  color: var(--primary);
}
.import-result__errors {
  max-height: 140px;
  margin: 8px 0 0;
  padding-left: 18px;
  overflow-y: auto;
  font-size: 12px;
  line-height: 1.7;
  color: #b45309;
}

.history-list {
  display: flex;
  flex-direction: column;
}
.history-row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 0;
  border-bottom: 1px solid var(--border-soft);
}
.history-row:last-child {
  border-bottom: none;
}
.history-row__main {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.history-row__summary {
  font-size: 13px;
  color: var(--text);
}
.history-row__time {
  font-size: 11px;
  color: var(--text-light);
}

@media (max-width: 900px) {
  .docs-layout {
    grid-template-columns: 1fr;
  }
  .form-row--half {
    flex-direction: column;
  }
}
</style>
