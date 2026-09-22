<template>
  <div class="tag-admin">
    <div class="card card-pad">
      <!-- 头部 -->
      <header class="list-head">
        <div>
          <h2 class="block-title">标签管理</h2>
          <p class="block-desc">
            维护文章标签：名称、描述与标签图
            <template v-if="total > 0"> · 共 {{ total }} 个</template>
          </p>
        </div>
        <div class="head-actions">
          <button class="btn btn-primary btn-sm" :disabled="trash" @click="openAdd">
            <i class="bi bi-plus-lg" /> 新建标签
          </button>
        </div>
      </header>

      <!-- 工具栏 -->
      <div class="list-filter">
        <div class="status-tabs">
          <button
            type="button"
            class="status-tab"
            :class="{ active: !trash }"
            @click="switchTab(false)"
          >全部标签</button>
          <button
            type="button"
            class="status-tab trash-tab"
            :class="{ active: trash }"
            @click="switchTab(true)"
          >
            <i class="bi bi-trash3" /> 回收站
          </button>
        </div>

        <div class="filter-right">
          <div class="search-box">
            <i class="bi bi-search" aria-hidden="true" />
            <input
              v-model="keyword"
              class="search-input"
              type="search"
              placeholder="搜索名称…"
              aria-label="搜索名称"
              @input="doSearch"
            />
          </div>
          <button class="btn btn-sm" :disabled="loading" @click="load()">
            <i class="bi bi-arrow-clockwise" /> 刷新
          </button>
        </div>
      </div>

      <!-- 回收站提示 -->
      <div v-if="trash" class="trash-bar">
        <span><i class="bi bi-trash3" /> 回收站内的标签不会在前台展示，可恢复或彻底删除</span>
        <button class="btn btn-sm btn-danger" :disabled="busy || !list.length" @click="askClearRecycle()">
          清空回收站
        </button>
      </div>

      <!-- 列表 -->
      <div v-if="loading" class="loading">
        <span class="spinner" /> 加载中...
      </div>

      <div v-else-if="!list.length" class="empty-row">
        <EmptyState :icon="trash ? 'bi bi-trash3' : 'bi bi-tags'" :text="emptyText" />
      </div>

      <ul v-else class="tag-list">
        <li v-for="item in list" :key="item.id" class="tag-row">
          <div class="tag-avatar">
            <img v-if="item.avatar" :src="item.avatar" :alt="item.name" loading="lazy" />
            <i v-else class="bi bi-hash" />
          </div>

          <div class="tag-main">
            <div class="tag-name-row">
              <span class="tag-name">#{{ item.name || '未命名标签' }}</span>
              <span class="count-chip" :title="countTitle(item)">
                <i class="bi bi-file-earmark-text" /> {{ countText(item) }}
              </span>
            </div>
            <p v-if="item.description" class="tag-desc">{{ item.description }}</p>
            <div class="tag-meta">
              <span class="meta-text">#{{ item.id }}</span>
              <span class="meta-text"><i class="bi bi-clock" /> {{ timeText(item) }}</span>
            </div>
          </div>

          <div class="tag-actions">
            <template v-if="trash">
              <button class="btn btn-ghost btn-sm" title="恢复" aria-label="恢复" :disabled="busy" @click="restore(item)">
                <i class="bi bi-arrow-counterclockwise" />
              </button>
              <button class="btn btn-ghost btn-sm danger" title="彻底删除" aria-label="彻底删除" :disabled="busy" @click="askForceDelete(item)">
                <i class="bi bi-x-octagon" />
              </button>
            </template>

            <template v-else>
              <router-link
                :to="`/tag/${item.id}`"
                class="btn btn-ghost btn-sm"
                title="前台查看"
                aria-label="前台查看"
              >
                <i class="bi bi-eye" />
              </router-link>
              <button class="btn btn-ghost btn-sm" title="编辑" aria-label="编辑" @click="openEdit(item)">
                <i class="bi bi-pencil" />
              </button>
              <button class="btn btn-ghost btn-sm danger" title="删除" aria-label="删除" :disabled="busy" @click="askRemove(item)">
                <i class="bi bi-trash" />
              </button>
            </template>
          </div>
        </li>
      </ul>

      <Pagination
        v-if="!loading && total > pageSize"
        :current="page"
        :total="total"
        :page-size="pageSize"
        @update:current="changePage"
      />
    </div>

    <!-- 新增 / 编辑标签 -->
    <AdminFormDialog
      v-model:visible="dialog.visible"
      :title="dialog.id ? '编辑标签' : '新建标签'"
      :icon="dialog.id ? 'bi bi-pencil-square' : 'bi bi-plus-circle'"
      :loading="dialog.loading"
      confirm-text="保存"
      @confirm="save"
    >
      <div class="form-item">
        <label class="form-label">标签名称</label>
        <input v-model="dialog.name" class="input" type="text" maxlength="32" placeholder="最多 32 字" />
      </div>

      <div class="form-item">
        <label class="form-label">标签描述</label>
        <textarea
          v-model="dialog.description"
          class="textarea"
          rows="3"
          placeholder="可选，用于前台标签页展示"
        />
      </div>

      <div class="form-item">
        <label class="form-label">标签图</label>
        <div class="avatar-row">
          <div class="cover-box">
            <img v-if="dialog.avatar" :src="dialog.avatar" alt="标签图预览" />
            <div v-else class="cover-empty" @click="pickImage">
              <i class="bi bi-image" />
              <span>上传</span>
            </div>
            <button v-if="dialog.avatar" type="button" class="cover-del" title="移除标签图" @click="dialog.avatar = ''">
              <i class="bi bi-x" />
            </button>
          </div>
          <div class="cover-fields">
            <input v-model="dialog.avatar" class="input" type="text" placeholder="粘贴图片链接，或点击下方按钮上传" />
            <div class="cover-actions">
              <button class="btn btn-sm" type="button" :disabled="uploading" @click="pickImage">
                <i class="bi bi-upload" /> {{ uploading ? '上传中...' : '上传图片' }}
              </button>
              <button v-if="dialog.avatar" class="btn btn-sm btn-ghost" type="button" :disabled="uploading" @click="dialog.avatar = ''">
                移除
              </button>
            </div>
          </div>
          <input ref="fileRef" type="file" accept="image/*" hidden @change="onFileChange" />
        </div>
        <p class="form-hint">可选，留空时前台用默认样式展示</p>
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
 * 标签管理（/admin/tags）
 *
 * 标签字段很少（名称 / 描述 / 标签图），做成单页 CRUD：全部标签 + 回收站两个视图。
 *
 * 后端约束（app/api/controller/tags.go）：
 * - tags/all 会额外注入 article_count（该标签被「已审核且未删除」文章引用的数量）；
 *   传 field 时必须带上它，否则会被字段过滤掉；
 * - tags/count 不支持 onlyTrashed，回收站数量不另做统计；
 * - tags/save 自动分流 create / update；允许字段为 name,description,avatar,json,text；
 * - avatar 走 SanitizeURL，name / description / avatar / text 会做 XSS 检测；
 * - 标签没有唯一索引，同名标签可以重复创建（后端不做重名校验）。
 */
import { ref, reactive, computed, onMounted } from 'vue'
import EmptyState from '@/components/EmptyState.vue'
import Pagination from '@/components/Pagination.vue'
import ConfirmDialog from '@/components/ConfirmDialog.vue'
import AdminFormDialog from '@/components/admin/AdminFormDialog.vue'
import {
  listTagsAdmin,
  saveTag,
  removeTags,
  forceDeleteTags,
  restoreTags,
  clearTagRecycle
} from '@/api/tags'
import { uploadAttachments } from '@/api/attachment'
import { fromNow } from '@/utils/time'
import { debounce } from '@/utils/helper'
import { toast } from '@/utils/toast'

const pageSize = 15

const list = ref([])
const total = ref(0)
const page = ref(1)
const loading = ref(false)
const busy = ref(false)
const trash = ref(false)
const keyword = ref('')
// 防抖后的实际搜索词（避免每敲一个字就打一次接口）
const searchKey = ref('')

const fileRef = ref(null)
const uploading = ref(false)

const dialog = reactive({
  visible: false,
  loading: false,
  id: 0,
  name: '',
  description: '',
  avatar: ''
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

const emptyText = computed(() => {
  if (searchKey.value) return '没有匹配的标签'
  if (trash.value) return '回收站是空的'
  return '还没有标签，先新建一个吧'
})

// ---------- 展示辅助 ----------
function countText(item) {
  // article_count 由后端注入；回收站数据可能没有该字段，用「—」表示未知
  const value = Number(item?.article_count)
  return Number.isFinite(value) ? value : '—'
}

function countTitle(item) {
  const value = Number(item?.article_count)
  return Number.isFinite(value) ? `被 ${value} 篇已发布文章引用` : '暂无引用统计'
}

function timeText(item) {
  if (trash.value) return `删除于 ${fromNow(item.delete_time)}`
  return fromNow(item.create_time)
}

// ---------- 数据加载 ----------
async function load() {
  loading.value = true
  try {
    const params = { page: page.value, limit: pageSize }
    if (trash.value) params.onlyTrashed = true
    // 关键词走后端 like 的「字段名|值」格式
    const kw = searchKey.value.replace(/['"\\%_|]/g, '').trim()
    if (kw) params.like = `name|${kw}`
    const res = await listTagsAdmin(params)
    list.value = res.data?.data || []
    total.value = res.data?.count || 0
  } catch {
    list.value = []
    total.value = 0
  } finally {
    loading.value = false
  }
}

// 搜索后回到第一页
const doSearch = debounce(() => {
  searchKey.value = keyword.value
  page.value = 1
  load()
}, 350)

async function switchTab(value) {
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

// ---------- 图片上传 ----------
function pickImage() {
  fileRef.value?.click()
}

async function onFileChange(e) {
  const file = e.target.files?.[0]
  e.target.value = ''
  if (!file) return
  if (!file.type.startsWith('image/')) {
    toast.warning('请选择图片文件')
    return
  }
  if (file.size > 5 * 1024 * 1024) {
    toast.warning('图片不能超过 5MB')
    return
  }
  uploading.value = true
  try {
    const fd = new FormData()
    fd.append('files', file)
    const res = await uploadAttachments(fd)
    const url = res.data?.results?.[0]?.full_url || res.data?.results?.[0]?.url || ''
    if (!url) throw new Error('empty')
    dialog.avatar = url
    toast.success('图片已上传')
  } catch {
    toast.error('图片上传失败')
  } finally {
    uploading.value = false
  }
}

// ---------- 新增 / 编辑 ----------
function resetDialog() {
  dialog.id = 0
  dialog.name = ''
  dialog.description = ''
  dialog.avatar = ''
}

function openAdd() {
  resetDialog()
  dialog.visible = true
}

function openEdit(item) {
  dialog.id = Number(item.id)
  dialog.name = item.name || ''
  dialog.description = item.description || ''
  dialog.avatar = item.avatar || ''
  dialog.visible = true
}

async function save() {
  const name = dialog.name.trim()
  if (!name) {
    toast.warning('请输入标签名称')
    return
  }

  const payload = {
    name,
    description: dialog.description.trim(),
    avatar: dialog.avatar.trim()
  }
  if (dialog.id) payload.id = dialog.id

  dialog.loading = true
  try {
    await saveTag(payload)
    toast.success(dialog.id ? '修改已保存' : '标签已创建')
    dialog.visible = false
    await load()
  } catch {
    // 失败提示由请求拦截器统一给出（如内容含恶意代码）
  } finally {
    dialog.loading = false
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

function askRemove(item) {
  const used = Number(item.article_count) > 0
  const extra = used ? '已有文章引用该标签，删除后这些文章不会携带此标签。' : ''
  openConfirm({
    title: '删除标签',
    message: `确定删除标签「${item.name || item.id}」吗？${extra}删除后可在回收站找回。`,
    confirmText: '删除',
    danger: true,
    action: async () => {
      await removeTags([item.id])
      toast.success('已移入回收站')
      await load()
    }
  })
}

async function restore(item) {
  busy.value = true
  try {
    await restoreTags([item.id])
    toast.success('已恢复')
    await load()
  } catch {
    /* 拦截器已提示 */
  } finally {
    busy.value = false
  }
}

function askForceDelete(item) {
  openConfirm({
    title: '彻底删除',
    message: `确定彻底删除标签「${item.name || item.id}」吗？此操作不可恢复！`,
    confirmText: '彻底删除',
    danger: true,
    action: async () => {
      await forceDeleteTags([item.id])
      toast.success('已彻底删除')
      await load()
    }
  })
}

function askClearRecycle() {
  openConfirm({
    title: '清空回收站',
    message: '确定清空回收站吗？回收站内所有标签将被彻底删除，不可恢复！',
    confirmText: '清空',
    danger: true,
    action: async () => {
      await clearTagRecycle()
      toast.success('回收站已清空')
      page.value = 1
      await load()
    }
  })
}

onMounted(load)
</script>

<style scoped>
.tag-admin {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

/* ---------- 头部 ---------- */
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
  /* 与搜索框 / 按钮等高 */
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
  width: 200px;
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

/* ---------- 回收站提示 ---------- */
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

/* ---------- 列表 ---------- */
.loading {
  padding: 40px;
  text-align: center;
  color: var(--text-muted);
}
.empty-row {
  padding: 12px 0;
}

.tag-list {
  display: flex;
  flex-direction: column;
}
.tag-row {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 12px 6px;
  border-bottom: 1px dashed var(--border-soft);
  border-radius: var(--radius-sm);
  transition: background 0.15s;
}
.tag-row:last-child {
  border-bottom: none;
}
.tag-row:hover {
  background: var(--bg-muted);
}

.tag-avatar {
  width: 42px;
  height: 42px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  background: var(--bg-muted);
  color: var(--text-light);
  font-size: 18px;
}
.tag-avatar img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.tag-main {
  flex: 1;
  min-width: 0;
}
.tag-name-row {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
}
.tag-name {
  font-size: 14px;
  font-weight: 600;
  color: var(--text);
  word-break: break-word;
}
.count-chip {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  padding: 2px 8px;
  font-size: 12px;
  color: var(--text-muted);
  background: var(--bg-card);
  border: 1px solid var(--border-soft);
  border-radius: 3px;
  font-variant-numeric: tabular-nums;
}
.tag-desc {
  margin: 4px 0 0;
  font-size: 13px;
  line-height: 1.7;
  color: var(--text-soft);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.tag-meta {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px;
  margin-top: 4px;
  font-size: 12px;
  color: var(--text-muted);
}
.meta-text {
  display: inline-flex;
  align-items: center;
  gap: 3px;
}

.tag-actions {
  display: flex;
  align-items: center;
  gap: 4px;
  flex-shrink: 0;
}
.tag-actions .danger:hover:not(:disabled) {
  border-color: var(--danger);
  color: var(--danger);
}
.tag-actions .btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* ---------- 弹窗表单 ---------- */
.form-hint {
  margin: 6px 0 0;
  font-size: 12px;
  line-height: 1.6;
  color: var(--text-muted);
}

.avatar-row {
  display: flex;
  align-items: flex-start;
  gap: 12px;
}
.cover-box {
  position: relative;
  width: 64px;
  height: 64px;
  flex-shrink: 0;
  overflow: hidden;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  background: var(--bg-muted);
}
.cover-box img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.cover-empty {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
  font-size: 11px;
  color: var(--text-light);
  cursor: pointer;
  transition: color 0.2s;
}
.cover-empty:hover {
  color: var(--primary);
}
.cover-del {
  position: absolute;
  right: 0;
  top: 0;
  width: 18px;
  height: 18px;
  border: none;
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.55);
  color: #fff;
  font-size: 11px;
  line-height: 1;
  cursor: pointer;
}
.cover-fields {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.cover-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

@media (max-width: 768px) {
  .list-filter {
    gap: 8px;
  }
  .filter-right {
    width: 100%;
    margin-left: 0;
  }
  .search-box {
    width: 100%;
  }
  .tag-row {
    flex-wrap: wrap;
  }
  .tag-main {
    flex: 1 1 60%;
  }
  .tag-actions {
    width: 100%;
    justify-content: flex-end;
  }
}
</style>
