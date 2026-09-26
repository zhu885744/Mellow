<template>
  <div class="attachment-admin">
    <!-- 概览 -->
    <section class="card card-pad panel">
      <header class="panel-head">
        <div>
          <h2 class="block-title">附件管理</h2>
          <p class="block-desc">
            管理全站上传附件：预览、重命名、删除与回收站
            <template v-if="total > 0"> · 共 {{ total }} 个</template>
          </p>
        </div>
        <div class="head-actions">
          <button class="btn btn-primary btn-sm" :disabled="uploading" @click="pickFiles">
            <i class="bi bi-cloud-upload" /> {{ uploading ? '上传中...' : '上传附件' }}
          </button>
          <button
            class="btn btn-ghost btn-sm"
            :disabled="loadingStats"
            title="刷新统计"
            aria-label="刷新统计"
            @click="loadStats"
          >
            <i class="bi bi-arrow-clockwise" />
          </button>
          <input ref="fileRef" type="file" multiple hidden @change="onFileChange" />
        </div>
      </header>

      <div class="stat-grid" :aria-busy="loadingStats">
        <div v-for="s in statCards" :key="s.label" class="stat-card">
          <span class="stat-icon" :style="{ color: s.color }"><i :class="s.icon" /></span>
          <span class="stat-body">
            <span class="stat-value">{{ loadingStats ? '···' : s.value }}</span>
            <span class="stat-label">{{ s.label }}</span>
          </span>
        </div>
      </div>
    </section>

    <div class="card card-pad">
      <header class="list-head">
        <div>
          <h2 class="block-title">附件列表</h2>
          <p class="block-desc">
            彻底删除会连同存储文件一起移除，不可恢复
            <template v-if="total > 0"> · 共 {{ total }} 个</template>
          </p>
        </div>
      </header>

      <!-- 工具栏 -->
      <div class="list-filter">
        <div class="status-tabs">
          <button
            type="button"
            class="status-tab"
            :class="{ active: !trash }"
            @click="switchTrash(false)"
          >全部附件</button>
          <button
            type="button"
            class="status-tab trash-tab"
            :class="{ active: trash }"
            @click="switchTrash(true)"
          >
            <i class="bi bi-trash3" /> 回收站
          </button>
        </div>

        <div class="filter-right">
          <SelectMenu
            v-model="typeKey"
            :options="ATTACHMENT_TYPE_OPTIONS"
            icon="bi bi-file-earmark"
            placeholder="全部类型"
            @change="reload"
          />

          <SelectMenu
            v-model="sortKey"
            :options="sortOptions"
            icon="bi bi-sort-down"
            placeholder="排序方式"
            @change="reload"
          />

          <div class="search-box">
            <i class="bi bi-search" aria-hidden="true" />
            <input
              v-model="keyword"
              class="search-input"
              type="search"
              placeholder="搜索文件名…"
              aria-label="搜索文件名"
              @input="doSearch"
            />
          </div>

          <button class="btn btn-sm" :disabled="loading" @click="load()">
            <i class="bi bi-arrow-clockwise" /> 刷新
          </button>
        </div>
      </div>

      <!-- 批量操作 -->
      <div v-if="selectedIds.length" class="batch-bar">
        <span class="batch-count">已选 <strong>{{ selectedIds.length }}</strong> 个</span>
        <div class="batch-actions">
          <template v-if="trash">
            <button class="btn btn-sm" :disabled="busy" @click="batchRestore()">
              <i class="bi bi-arrow-counterclockwise" /> 批量恢复
            </button>
            <button class="btn btn-sm btn-danger" :disabled="busy" @click="askBatchForceDelete()">
              <i class="bi bi-x-octagon" /> 彻底删除
            </button>
          </template>
          <template v-else>
            <button class="btn btn-sm btn-danger" :disabled="busy" @click="askBatchRemove()">
              <i class="bi bi-trash" /> 删除
            </button>
          </template>
          <button class="btn btn-sm btn-ghost" :disabled="busy" @click="clearSelection">取消选择</button>
        </div>
      </div>

      <div v-if="trash" class="trash-bar">
        <span><i class="bi bi-trash3" /> 回收站内的附件已不参与统计，可恢复或彻底删除</span>
        <button class="btn btn-sm btn-danger" :disabled="busy || !list.length" @click="askClearRecycle()">
          清空回收站
        </button>
      </div>

      <div v-if="loading" class="loading"><span class="spinner" /> 加载中...</div>

      <div v-else-if="!list.length" class="empty-row">
        <EmptyState :icon="trash ? 'bi bi-trash3' : 'bi bi-paperclip'" :text="emptyText" />
      </div>

      <template v-else>
        <div class="list-head-row">
          <label class="pick" title="全选本页">
            <input
              ref="selectAllRef"
              type="checkbox"
              :checked="pageAllSelected"
              :disabled="busy"
              aria-label="全选本页"
              @change="toggleSelectAll"
            />
          </label>
          <span class="list-head-text">本页 {{ list.length }} 个</span>
        </div>

        <ul class="attach-grid">
          <li v-for="item in list" :key="item.id" class="attach-card" :class="{ selected: isSelected(item.id) }">
            <label class="pick card-pick" :title="isSelected(item.id) ? '取消选择' : '选择'">
              <input
                type="checkbox"
                :checked="isSelected(item.id)"
                :disabled="busy"
                :aria-label="`选择附件 ${item.original_name}`"
                @change="toggleSelect(item.id)"
              />
            </label>

            <button
              type="button"
              class="attach-preview"
              :title="`预览 ${item.original_name}`"
              @click="openPreview(item)"
            >
              <img v-if="isPreviewableImage(item)" :src="item.full_url" :alt="item.original_name" loading="lazy" />
              <span v-else class="attach-filetype">
                <i :class="attachmentIcon(item)" />
                <em>{{ extText(item) }}</em>
              </span>
            </button>

            <div class="attach-info">
              <div class="attach-name" :title="item.original_name">{{ item.original_name || '未命名' }}</div>
              <div class="attach-meta">
                <span class="meta-text">{{ formatFileSize(item.file_size) }}</span>
                <span class="meta-text"><i class="bi bi-clock" /> {{ timeText(item) }}</span>
              </div>
              <div class="attach-meta">
                <span class="meta-text" :title="uploaderTitle(item)">
                  <i class="bi bi-person" /> {{ uploaderName(item) }}
                </span>
                <span class="meta-text">{{ attachmentTypeLabel(item) }}</span>
              </div>
            </div>

            <div class="attach-actions">
              <button class="btn btn-ghost btn-sm" title="复制链接" aria-label="复制链接" @click="copyUrl(item)">
                <i class="bi bi-clipboard" />
              </button>
              <template v-if="trash">
                <button class="btn btn-ghost btn-sm" title="恢复" aria-label="恢复" :disabled="busy" @click="restore(item)">
                  <i class="bi bi-arrow-counterclockwise" />
                </button>
                <button class="btn btn-ghost btn-sm danger" title="彻底删除" aria-label="彻底删除" :disabled="busy" @click="askForceDelete(item)">
                  <i class="bi bi-x-octagon" />
                </button>
              </template>
              <template v-else>
                <button class="btn btn-ghost btn-sm" title="重命名" aria-label="重命名" :disabled="busy" @click="openRename(item)">
                  <i class="bi bi-pencil" />
                </button>
                <button class="btn btn-ghost btn-sm danger" title="删除" aria-label="删除" :disabled="busy" @click="askRemove(item)">
                  <i class="bi bi-trash" />
                </button>
              </template>
            </div>
          </li>
        </ul>
      </template>

      <Pagination
        v-if="!loading && total > pageSize"
        :current="page"
        :total="total"
        :page-size="pageSize"
        @update:current="changePage"
      />
    </div>

    <!-- 预览 / 详情 -->
    <AdminFormDialog
      v-model:visible="preview.visible"
      :title="preview.title"
      icon="bi bi-eye"
      :loading="false"
      confirm-text="关闭"
      width="560px"
      @confirm="preview.visible = false"
    >
      <div v-if="preview.image" class="preview-image">
        <img :src="preview.image" :alt="preview.title" />
      </div>
      <div v-else class="preview-icon">
        <i :class="preview.icon" />
        <span>{{ preview.ext }}</span>
      </div>

      <dl class="preview-meta">
        <div class="preview-row">
          <dt>文件名</dt>
          <dd>{{ preview.name }}</dd>
        </div>
        <div class="preview-row">
          <dt>大小</dt>
          <dd>{{ preview.size }}</dd>
        </div>
        <div class="preview-row">
          <dt>类型</dt>
          <dd>{{ preview.mime || '—' }}</dd>
        </div>
        <div class="preview-row">
          <dt>存储</dt>
          <dd>{{ preview.driver || '—' }}</dd>
        </div>
        <div class="preview-row">
          <dt>上传时间</dt>
          <dd>{{ preview.time }}</dd>
        </div>
        <div class="preview-row">
          <dt>访问地址</dt>
          <dd class="preview-url">
            <a :href="preview.url" target="_blank" rel="noopener noreferrer">{{ preview.url }}</a>
            <button class="btn btn-ghost btn-sm" title="复制链接" aria-label="复制链接" @click="copyUrl(preview.raw)">
              <i class="bi bi-clipboard" />
            </button>
          </dd>
        </div>
      </dl>
    </AdminFormDialog>

    <!-- 重命名 -->
    <AdminFormDialog
      v-model:visible="rename.visible"
      title="重命名附件"
      icon="bi bi-pencil-square"
      :loading="rename.loading"
      confirm-text="保存"
      @confirm="saveRename"
    >
      <div class="form-item">
        <label class="form-label">文件名</label>
        <input v-model="rename.name" class="input" type="text" maxlength="256" placeholder="必填" />
        <p class="form-hint">仅修改展示用的原始文件名，不影响实际存储与访问地址</p>
      </div>
    </AdminFormDialog>

    <!-- 操作确认 -->
    <ConfirmDialog
      v-model:visible="confirm.visible"
      :title="confirm.title"
      :message="confirm.message"
      :confirm-text="confirm.confirmText"
      :danger="confirm.danger"
      :loading="confirm.loading"
      @confirm="runConfirm"
    />
  </div>
</template>

<script setup>
/**
 * 附件管理（/admin/attachment）
 *
 * 附件列表（网格）、预览与详情、重命名、删除与回收站。
 *
 * 后端约束（app/api/controller/attachment.go、app/model/attachment.go）：
 * - attachment/all 与 count：非管理员只能查到 uploader_id 为自己的附件，
 *   后台依赖管理员身份才能管理全站附件；count 支持 onlyTrashed；
 * - attachment/all 的每行会额外补 uploader_account / uploader_name（昵称，为空回退账号），
 *   列表展示昵称而不是 uploader_id 数字；
 * - attachment/update 允许字段只有 original_name / target_type / target_id，
 *   非管理员改他人附件返回「无权限！」；
 * - remove 是软删除（不删存储文件）；delete / clear **仅管理员**，
 *   会连同存储文件一起物理删除，不可恢复；
 * - remove / restore 返回 { success_ids, failed_ids, errors }，部分失败时 HTTP 码为 207。
 */
import { ref, reactive, computed, watchEffect, onMounted } from 'vue'
import EmptyState from '@/components/EmptyState.vue'
import Pagination from '@/components/Pagination.vue'
import ConfirmDialog from '@/components/ConfirmDialog.vue'
import SelectMenu from '@/components/SelectMenu.vue'
import AdminFormDialog from '@/components/admin/AdminFormDialog.vue'
import {
  listAttachmentsAdmin,
  countAttachments,
  sumAttachmentSize,
  updateAttachment,
  removeAttachments,
  forceDeleteAttachments,
  restoreAttachments,
  clearAttachmentRecycle,
  uploadAttachments
} from '@/api/attachment'
import {
  ATTACHMENT_FIELD,
  ATTACHMENT_TYPE_OPTIONS,
  attachmentIcon,
  attachmentTypeLabel,
  attachmentWhereJSON,
  isPreviewableImage,
  formatFileSize,
  normalizeExt,
  sanitizeAttachmentKeyword
} from '@/utils/attachment'
import { fromNow, formatTime } from '@/utils/time'
import { debounce } from '@/utils/helper'
import { toast } from '@/utils/toast'

const pageSize = 24

// 排序白名单：后端 order 未做校验，必须由前端限定取值
const sortOptions = [
  { value: 'create_time desc', label: '最新上传' },
  { value: 'create_time asc', label: '最早上传' },
  { value: 'file_size desc', label: '体积最大' },
  { value: 'file_size asc', label: '体积最小' },
  { value: 'id desc', label: 'ID 倒序' }
]

// ===== 列表 =====
const list = ref([])
const total = ref(0)
const page = ref(1)
const loading = ref(false)
const busy = ref(false)
const trash = ref(false)
const typeKey = ref('')
const sortKey = ref(sortOptions[0].value)
const keyword = ref('')
const searchKey = ref('')
const selectedIds = ref([])

// ===== 统计 =====
const loadingStats = ref(false)
const stats = reactive({ total: 0, size: 0, image: 0, trash: 0 })

// ===== 上传 =====
const fileRef = ref(null)
const uploading = ref(false)

// ===== 弹窗 =====
const preview = reactive({
  visible: false,
  title: '',
  image: '',
  icon: '',
  ext: '',
  name: '',
  size: '',
  mime: '',
  driver: '',
  time: '',
  url: '',
  raw: null
})

const rename = reactive({
  visible: false,
  loading: false,
  id: 0,
  name: ''
})

const confirm = reactive({
  visible: false,
  title: '操作确认',
  message: '',
  confirmText: '确定',
  danger: false,
  loading: false,
  action: null
})

const statCards = computed(() => [
  { label: '附件总数', value: stats.total, icon: 'bi bi-paperclip', color: 'var(--primary)' },
  { label: '占用空间', value: formatFileSize(stats.size), icon: 'bi bi-hdd', color: 'var(--success)' },
  { label: '图片数量', value: stats.image, icon: 'bi bi-image', color: '#0ea5e9' },
  { label: '回收站', value: stats.trash, icon: 'bi bi-trash3', color: 'var(--text-muted)' }
])

const emptyText = computed(() => {
  if (searchKey.value) return '没有匹配的附件'
  if (trash.value) return '回收站是空的'
  return '还没有附件，先上传一个吧'
})

// ---------- 展示辅助 ----------
function extText(item) {
  return normalizeExt(item?.file_ext).toUpperCase() || 'FILE'
}

function timeText(item) {
  if (trash.value) return `删除于 ${fromNow(item.delete_time)}`
  return `上传于 ${fromNow(item.create_time)}`
}

// 上传者显示名：后端 attachment/all 已按 uploader_id 批量补好昵称（uploader_name，
// 昵称为空时后端回退成账号 / 「用户 #id」），这里只做兜底展示
function uploaderName(item) {
  if (item?.uploader_name) return item.uploader_name
  return item?.uploader_id ? `#${item.uploader_id}` : '—'
}

// 悬浮提示：把昵称 / 账号 / 用户 ID 都列出来，便于管理员核对是哪个账号上传的
function uploaderTitle(item) {
  const lines = [`上传者：${uploaderName(item)}`]
  if (item.uploader_account) lines.push(`账号：${item.uploader_account}`)
  if (item.uploader_id) lines.push(`用户 ID：${item.uploader_id}`)
  return lines.join('\n')
}

async function copyUrl(item) {
  const url = typeof item === 'string' ? item : item?.full_url
  if (!url) return
  try {
    await navigator.clipboard.writeText(url)
    toast.success('链接已复制')
  } catch {
    toast.info('复制失败，请手动复制')
  }
}

// ---------- 统计 ----------
async function loadStats() {
  loadingStats.value = true
  try {
    const [totalRes, sizeRes, imageRes, trashRes] = await Promise.all([
      countAttachments(),
      sumAttachmentSize(),
      countAttachments({ where: attachmentWhereJSON('image') }),
      countAttachments({ onlyTrashed: true })
    ])
    stats.total = Number(totalRes?.data || 0)
    stats.size = Number(sizeRes?.data?.file_size || 0)
    stats.image = Number(imageRes?.data || 0)
    stats.trash = Number(trashRes?.data || 0)
  } catch {
    /* 统计失败不阻塞列表 */
  } finally {
    loadingStats.value = false
  }
}

// ---------- 列表 ----------
async function load() {
  loading.value = true
  try {
    const params = {
      page: page.value,
      limit: pageSize,
      field: ATTACHMENT_FIELD,
      order: trash.value ? 'delete_time desc' : sortKey.value
    }
    if (trash.value) params.onlyTrashed = true

    const where = attachmentWhereJSON(typeKey.value)
    if (where) params.where = where

    const kw = sanitizeAttachmentKeyword(searchKey.value)
    if (kw) params.like = `original_name|${kw}`

    const res = await listAttachmentsAdmin(params)
    list.value = res.data?.data || []
    total.value = res.data?.count || 0
    clearSelection()
  } catch {
    list.value = []
    total.value = 0
  } finally {
    loading.value = false
  }
}

function reload() {
  page.value = 1
  load()
}

const doSearch = debounce(() => {
  searchKey.value = keyword.value
  reload()
}, 350)

async function switchTrash(value) {
  if (trash.value === value) return
  trash.value = value
  keyword.value = ''
  searchKey.value = ''
  page.value = 1
  await load()
}

function changePage(p) {
  if (p < 1 || p === page.value) return
  page.value = p
  load()
}

// ---------- 选中 ----------
const selectedSet = computed(() => new Set(selectedIds.value))
const pageAllSelected = computed(() => list.value.length > 0 && list.value.every((i) => selectedSet.value.has(i.id)))
const someSelected = computed(() => selectedIds.value.length > 0 && !pageAllSelected.value)

const selectAllRef = ref(null)

watchEffect(() => {
  if (selectAllRef.value) selectAllRef.value.indeterminate = someSelected.value
})

function isSelected(id) {
  return selectedSet.value.has(id)
}

function toggleSelect(id) {
  const next = new Set(selectedIds.value)
  if (next.has(id)) next.delete(id)
  else next.add(id)
  selectedIds.value = [...next]
}

function toggleSelectAll() {
  selectedIds.value = pageAllSelected.value ? [] : list.value.map((i) => i.id)
}

function clearSelection() {
  selectedIds.value = []
}

// ---------- 上传 ----------
function pickFiles() {
  fileRef.value?.click()
}

async function onFileChange(e) {
  const files = Array.from(e.target.files || [])
  e.target.value = ''
  if (!files.length) return

  uploading.value = true
  try {
    const fd = new FormData()
    files.forEach((file) => fd.append('files', file))
    const res = await uploadAttachments(fd)
    const results = res?.data?.results || []
    toast.success(`上传完成：成功 ${results.length} 个`)
    await Promise.all([load(), loadStats()])
  } catch {
    // 失败提示由请求拦截器统一给出（如类型不允许、体积超限）
  } finally {
    uploading.value = false
  }
}

// ---------- 预览 ----------
function openPreview(item) {
  preview.title = item.original_name || '附件详情'
  preview.image = isPreviewableImage(item) ? item.full_url : ''
  preview.icon = attachmentIcon(item)
  preview.ext = extText(item)
  preview.name = item.original_name || '—'
  preview.size = formatFileSize(item.file_size)
  preview.mime = item.mime_type || ''
  preview.driver = item.storage_driver || ''
  preview.time = formatTime(item.create_time)
  preview.url = item.full_url || ''
  preview.raw = item
  preview.visible = true
}

// ---------- 重命名 ----------
function openRename(item) {
  rename.id = Number(item.id)
  rename.name = item.original_name || ''
  rename.visible = true
}

async function saveRename() {
  const name = rename.name.trim()
  if (!name) {
    toast.warning('请输入文件名')
    return
  }
  rename.loading = true
  try {
    await updateAttachment({ id: rename.id, original_name: name })
    toast.success('已重命名')
    rename.visible = false
    await load()
  } catch {
    /* 拦截器已提示 */
  } finally {
    rename.loading = false
  }
}

// ---------- 删除 / 恢复 ----------
function openConfirm({ title, message, confirmText = '确定', danger = false, action }) {
  confirm.title = title
  confirm.message = message
  confirm.confirmText = confirmText
  confirm.danger = danger
  confirm.action = action
  confirm.visible = true
}

async function runConfirm() {
  if (typeof confirm.action !== 'function') {
    confirm.visible = false
    return
  }
  confirm.loading = true
  try {
    const ok = await confirm.action()
    if (ok !== false) confirm.visible = false
  } catch {
    // 请求失败时保持弹窗打开，错误提示已由请求拦截器统一给出
  } finally {
    confirm.loading = false
  }
}

// remove / restore 返回成功与失败明细，统一给出提示
function summary(res, okText) {
  const success = res?.data?.success_ids || []
  const failed = res?.data?.failed_ids || []
  if (failed.length) {
    toast.warning(`${okText}：成功 ${success.length} 个，失败 ${failed.length} 个`)
  } else {
    toast.success(`${okText}：${success.length} 个`)
  }
}

async function afterMutation(removedCount = 0) {
  if (removedCount > 0 && list.value.length <= removedCount && page.value > 1) {
    page.value -= 1
  }
  await load()
  loadStats()
}

function askRemove(item) {
  openConfirm({
    title: '删除附件',
    message: `确定删除附件「${item.original_name}」吗？删除后可在回收站找回（不会删除存储文件）。`,
    confirmText: '删除',
    danger: true,
    action: async () => {
      const res = await removeAttachments([item.id])
      summary(res, '已删除')
      await afterMutation(1)
    }
  })
}

async function restore(item) {
  busy.value = true
  try {
    const res = await restoreAttachments([item.id])
    summary(res, '已恢复')
    await afterMutation(1)
  } catch {
    /* 拦截器已提示 */
  } finally {
    busy.value = false
  }
}

function askForceDelete(item) {
  openConfirm({
    title: '彻底删除',
    message: `确定彻底删除附件「${item.original_name}」吗？存储文件会一并删除，此操作不可恢复！`,
    confirmText: '彻底删除',
    danger: true,
    action: async () => {
      await forceDeleteAttachments([item.id])
      toast.success('已彻底删除')
      await afterMutation(1)
    }
  })
}

function askBatchRemove() {
  const ids = [...selectedIds.value]
  openConfirm({
    title: '批量删除',
    message: `确定删除选中的 ${ids.length} 个附件吗？删除后可在回收站找回。`,
    confirmText: '删除',
    danger: true,
    action: async () => {
      const res = await removeAttachments(ids)
      summary(res, '已删除')
      clearSelection()
      await afterMutation(ids.length)
    }
  })
}

async function batchRestore() {
  const ids = [...selectedIds.value]
  busy.value = true
  try {
    const res = await restoreAttachments(ids)
    summary(res, '已恢复')
    clearSelection()
    await afterMutation(ids.length)
  } catch {
    /* 拦截器已提示 */
  } finally {
    busy.value = false
  }
}

function askBatchForceDelete() {
  const ids = [...selectedIds.value]
  openConfirm({
    title: '批量彻底删除',
    message: `确定彻底删除选中的 ${ids.length} 个附件吗？存储文件会一并删除，不可恢复！`,
    confirmText: '彻底删除',
    danger: true,
    action: async () => {
      await forceDeleteAttachments(ids)
      toast.success(`已彻底删除 ${ids.length} 个`)
      clearSelection()
      await afterMutation(ids.length)
    }
  })
}

function askClearRecycle() {
  openConfirm({
    title: '清空回收站',
    message: '确定清空回收站吗？回收站内所有附件的存储文件会被一并删除，不可恢复！',
    confirmText: '清空',
    danger: true,
    action: async () => {
      await clearAttachmentRecycle()
      toast.success('回收站已清空')
      page.value = 1
      await afterMutation(0)
    }
  })
}

onMounted(() => {
  load()
  loadStats()
})
</script>

<style scoped>
.attachment-admin {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

/* ---------- 概览 ---------- */
.panel-head,
.list-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 16px;
}
.block-title {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
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
}

.stat-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 12px;
}
.stat-card {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px;
  background: var(--bg-muted);
  border-radius: var(--radius);
}
.stat-icon {
  width: 36px;
  height: 36px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 12px;
  background: var(--bg-card);
  font-size: 18px;
}
.stat-body {
  display: flex;
  flex-direction: column;
  min-width: 0;
}
.stat-value {
  font-size: 18px;
  font-weight: 700;
  line-height: 1.2;
}
.stat-label {
  font-size: 12px;
  color: var(--text-muted);
}

/* ---------- 工具栏 ---------- */
.list-filter {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
  padding-bottom: 14px;
  border-bottom: 1px solid var(--border-soft);
}
.status-tabs {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}
.status-tab {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  /* 与下拉 / 搜索框 / 按钮等高 */
  height: var(--control-h-sm);
  padding: 0 14px;
  font-size: 13px;
  border-radius: var(--radius-sm);
  border: 1px solid transparent;
  background: var(--bg-muted);
  color: var(--text-soft);
  cursor: pointer;
  transition: all 0.15s;
}
.status-tab:hover {
  color: var(--primary);
}
.status-tab.active {
  background: var(--primary);
  color: #fff;
}
.filter-right {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  margin-left: auto;
}
.search-box {
  position: relative;
  width: 170px;
}
.search-box .bi {
  position: absolute;
  left: 10px;
  top: 50%;
  transform: translateY(-50%);
  font-size: 13px;
  color: var(--text-light);
}
.search-input {
  width: 100%;
  height: var(--control-h-sm);
  padding: 0 12px 0 30px;
  font-size: 13px;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background: var(--bg-card);
  color: var(--text);
  outline: none;
  transition: border-color 0.2s, box-shadow 0.2s;
}
.search-input:focus {
  border-color: var(--primary);
  box-shadow: 0 0 0 3px var(--accent-ring);
}

/* ---------- 批量 / 回收站 ---------- */
.batch-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 12px;
  padding: 10px 12px;
  background: var(--accent-wash);
  border: 1px solid var(--accent-soft);
  border-radius: var(--radius);
}
.batch-count {
  font-size: 13px;
  color: var(--text-soft);
}
.batch-count strong {
  color: var(--primary-deep);
}
.batch-actions {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 6px;
}
.trash-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 12px;
  padding: 10px 12px;
  font-size: 12px;
  color: var(--warning);
  background: var(--gold-wash);
  border-radius: var(--radius);
}

/* ---------- 网格 ---------- */
.loading {
  padding: 40px;
  text-align: center;
  color: var(--text-muted);
}
.empty-row {
  padding: 12px 0;
}

.list-head-row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 8px 4px;
}
.list-head-text {
  font-size: 12px;
  color: var(--text-muted);
}

.attach-grid {
  display: grid;
  /* 卡片宽度固定区间，窄屏自动减少列数 */
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: 12px;
}
.attach-card {
  position: relative;
  display: flex;
  flex-direction: column;
  padding: 8px;
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  transition: border-color 0.15s, background 0.15s;
}
.attach-card:hover {
  border-color: var(--primary);
}
.attach-card.selected {
  border-color: var(--primary);
  background: var(--accent-wash);
}

.pick {
  display: flex;
  align-items: center;
  cursor: pointer;
}
.pick input {
  width: 15px;
  height: 15px;
  accent-color: var(--primary);
  cursor: pointer;
}
.card-pick {
  position: absolute;
  left: 12px;
  top: 12px;
  z-index: 1;
  padding: 2px;
  border-radius: 4px;
  background: rgba(255, 255, 255, 0.85);
}

.attach-preview {
  width: 100%;
  aspect-ratio: 4 / 3;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  border: none;
  border-radius: var(--radius-sm);
  background: var(--bg-muted);
  cursor: pointer;
}
.attach-preview img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.attach-filetype {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  color: var(--text-muted);
}
.attach-filetype .bi {
  font-size: 32px;
}
.attach-filetype em {
  font-size: 11px;
  font-style: normal;
  letter-spacing: 0.04em;
}

.attach-info {
  margin-top: 8px;
  min-width: 0;
}
.attach-name {
  font-size: 13px;
  font-weight: 600;
  color: var(--text);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.attach-meta {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 4px;
  font-size: 11px;
  color: var(--text-muted);
}
.meta-text {
  display: inline-flex;
  align-items: center;
  gap: 3px;
}

.attach-actions {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 2px;
  margin-top: 6px;
}
.attach-actions .danger:hover:not(:disabled) {
  border-color: var(--danger);
  color: var(--danger);
}
.attach-actions .btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* ---------- 弹窗 ---------- */
.preview-image {
  display: flex;
  align-items: center;
  justify-content: center;
  max-height: 320px;
  overflow: hidden;
  border-radius: var(--radius);
  background: var(--bg-muted);
}
.preview-image img {
  max-width: 100%;
  max-height: 320px;
  object-fit: contain;
}
.preview-icon {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 24px;
  color: var(--text-muted);
  background: var(--bg-muted);
  border-radius: var(--radius);
}
.preview-icon .bi {
  font-size: 44px;
}
.preview-icon span {
  font-size: 12px;
  letter-spacing: 0.06em;
}

.preview-meta {
  margin: 14px 0 0;
}
.preview-row {
  display: flex;
  gap: 12px;
  padding: 6px 0;
  font-size: 13px;
}
.preview-row dt {
  width: 72px;
  flex-shrink: 0;
  color: var(--text-muted);
}
.preview-row dd {
  margin: 0;
  min-width: 0;
  color: var(--text-soft);
  word-break: break-all;
}
.preview-url {
  display: flex;
  align-items: center;
  gap: 6px;
}
.preview-url a {
  min-width: 0;
  color: var(--primary);
  text-decoration: none;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.preview-url a:hover {
  text-decoration: underline;
}

.form-hint {
  margin: 6px 0 0;
  font-size: 12px;
  line-height: 1.6;
  color: var(--text-muted);
}

@media (max-width: 768px) {
  .list-filter {
    gap: 8px;
  }
  .filter-right,
  .search-box {
    width: 100%;
    margin-left: 0;
  }
  .attach-grid {
    grid-template-columns: repeat(2, 1fr);
  }
  .stat-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}
</style>
