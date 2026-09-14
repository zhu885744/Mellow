<template>
  <div class="card card-pad">
    <!-- 头部 -->
    <header class="m-head">
      <div>
        <h2 class="block-title">我的动态</h2>
        <p class="block-desc">管理自己发布的动态与草稿</p>
      </div>
      <router-link to="/moments" class="btn btn-ghost btn-sm">
        <i class="bi bi-arrow-right" /> 去发布
      </router-link>
    </header>

    <!-- 筛选栏 -->
    <div class="m-filter">
      <div class="status-tabs">
        <button
          v-for="tab in tabs"
          :key="tab.value"
          type="button"
          class="status-tab"
          :class="{ active: status === tab.value }"
          @click="switchTab(tab.value)"
        >{{ tab.label }}</button>
      </div>
      <div class="search-box">
        <i class="bi bi-search" />
        <input
          v-model="keyword"
          class="search-input"
          type="search"
          placeholder="搜索内容…"
          @input="doSearch"
        />
      </div>
    </div>

    <p v-if="pendingCount > 0" class="audit-tip">
      <i class="bi bi-info-circle" /> 有 {{ pendingCount }} 条动态正在等待审核，审核通过后会公开显示。
    </p>

    <!-- 列表 -->
    <div v-if="loading" class="loading">
      <span class="spinner" /> 加载中...
    </div>

    <div v-else-if="!list.length" class="empty-row">
      <EmptyState :text="keyword ? '没有匹配的动态' : '还没有动态，去发一条吧'" />
      <div class="empty-action">
        <router-link to="/moments" class="btn btn-primary btn-sm">发布动态</router-link>
      </div>
    </div>

    <ul v-else class="m-list">
      <li v-for="item in list" :key="item.id" class="m-row">
        <div class="m-main">
          <!-- 内容：解析 [emoji:url] 为图片（后端已做 HTML 净化，可安全 v-html） -->
          <p class="m-content" v-html="renderContent(item)"></p>

          <!-- 配图 -->
          <div v-if="imagesOf(item).length" class="m-images">
            <img
              v-for="(img, i) in imagesOf(item)"
              :key="img"
              :src="img"
              class="m-img"
              alt="配图"
              loading="lazy"
              @click="preview(item, i)"
            />
          </div>

          <div class="m-meta">
            <span class="post-status" :class="item.status === 1 ? 'is-pub' : 'is-draft'">
              {{ item.status === 1 ? '已发布' : '草稿' }}
            </span>
            <span v-if="!item.audit" class="post-status is-pending">待审核</span>
            <span v-if="item.location" class="meta-text">
              <i class="bi bi-geo-alt" /> {{ item.location }}
            </span>
            <span class="meta-text"><i class="bi bi-eye" /> {{ item.views || 0 }}</span>
            <span class="meta-text"><i class="bi bi-clock" /> {{ fromNow(item.create_time) }}</span>
          </div>
        </div>

        <div class="m-actions">
          <button class="btn btn-ghost btn-sm" title="查看" @click="viewMoment(item)">
            <i class="bi bi-eye" />
          </button>
          <button class="btn btn-ghost btn-sm" title="编辑" @click="openEdit(item)">
            <i class="bi bi-pencil" />
          </button>
          <button class="btn btn-ghost btn-sm danger" title="删除" @click="confirmRemove(item)">
            <i class="bi bi-trash" />
          </button>
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

    <!-- 编辑弹窗 -->
    <Teleport to="body">
      <Transition name="dialog-fade">
        <div v-if="editVisible" class="dialog-overlay" @click.self="closeEdit">
          <div class="dialog">
            <div class="dialog-head">
              <span class="dialog-title">编辑动态</span>
              <button class="btn btn-icon btn-sm btn-round" title="关闭" @click="closeEdit">
                <i class="bi bi-x-lg" />
              </button>
            </div>

            <div class="dialog-body">
              <EmojiEditor
                v-model="editForm.content"
                placeholder="此刻的想法..."
                inline-picker
              >
                <template #extra>
                  <button
                    type="button"
                    class="btn btn-secondary btn-sm"
                    :class="{ 'is-loading': uploading }"
                    :disabled="uploading"
                    title="添加图片"
                    @click="fileInput?.click()"
                  >
                    <i class="bi bi-image" /> {{ uploading ? '上传中...' : '图片' }}
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

              <div v-if="editForm.images.length" class="edit-images">
                <div v-for="(img, i) in editForm.images" :key="img" class="edit-img-item">
                  <img :src="img" alt="配图" />
                  <button type="button" class="img-remove" title="移除" @click="removeEditImage(i)">
                    <i class="bi bi-x-lg" />
                  </button>
                </div>
              </div>

              <div class="location-box">
                <i class="bi bi-geo-alt" />
                <input
                  v-model="editForm.location"
                  class="search-input"
                  type="text"
                  placeholder="位置（可选）"
                  maxlength="64"
                />
              </div>

              <label class="switch-row">
                <input v-model="editForm.status" type="checkbox" :true-value="1" :false-value="0" />
                <span>{{ editForm.status === 1 ? '已发布' : '存为草稿' }}</span>
              </label>
            </div>

            <div class="dialog-foot">
              <button
                class="btn btn-primary btn-sm"
                :class="{ 'is-loading': saving }"
                :disabled="saving || uploading || !canSave"
                @click="submitEdit"
              >
                保存
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<script setup>
import { ref, reactive, computed, watch, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import EmptyState from '@/components/EmptyState.vue'
import Pagination from '@/components/Pagination.vue'
import EmojiEditor from '@/components/EmojiEditor.vue'
import { listMoments, updateMoment, removeMoment, uploadMomentImages } from '@/api/moments'
import { likesCount } from '@/api/tags'
import { renderEmojiWithBreaks } from '@/utils/emoji'
import { openLightbox } from '@/utils/lightbox'
import { useUserStore } from '@/stores/user'
import { storeToRefs } from 'pinia'
import { fromNow } from '@/utils/time'
import { debounce } from '@/utils/helper'
import { toast } from '@/utils/toast'

const router = useRouter()
const userStore = useUserStore()
const { user } = storeToRefs(userStore)

const uid = computed(() => user.value?.id || 0)

const pageSize = 10
const list = ref([])
const total = ref(0)
const page = ref(1)
const loading = ref(false)
const pendingCount = ref(0)

const status = ref('')
const keyword = ref('')
const searchKey = ref('')

const tabs = [
  { label: '全部', value: '' },
  { label: '已发布', value: 1 },
  { label: '草稿', value: 0 }
]

// 批量统计点赞数
// 参考前台 MomentItem.vue：点赞数以 user-likes 记录为准，走 counts 批量接口一次性查回，
// 不依赖后端 moments.likes 冗余字段（后端点赞时并未回写该字段，值不可靠）
async function loadLikes(list) {
  if (!list || !list.length) return
  try {
    const ids = list.map((m) => m.id)
    const res = await likesCount('moment', ids)
    const counts = res?.data?.counts || res?.data?.data?.counts || {}
    list.forEach((m) => {
      m.likeCount = counts[m.id] ?? counts[String(m.id)] ?? 0
    })
  } catch {
    list.forEach((m) => { m.likeCount = m.likeCount ?? 0 })
  }
}

// 渲染动态正文：[emoji:url] -> <img>，并保留换行
function renderContent(item) {
  const text = item?.content || ''
  if (!text) return '（无内容）'
  return renderEmojiWithBreaks(text, { size: 20 })
}

// 解析动态配图：后端以逗号分隔字符串存储，兼容数组形式
function imagesOf(item) {
  const raw = item?.images
  if (!raw) return []
  const arr = Array.isArray(raw) ? raw : String(raw).split(',')
  return arr.map((s) => String(s).trim()).filter(Boolean)
}

function preview(item, index) {
  openLightbox(imagesOf(item), index)
}

async function load() {
  if (!uid.value) return
  loading.value = true
  try {
    const where = { uid: uid.value }
    if (status.value !== '') where.status = status.value
    const params = {
      page: page.value,
      limit: pageSize,
      order: 'create_time desc',
      where: JSON.stringify(where)
    }
    // like 使用后端支持的「字段名|搜索值」格式，并剔除危险字符
    const kw = searchKey.value.replace(/['"\\%_|]/g, '').trim()
    if (kw) params.like = `content|${kw}`

    const res = await listMoments(params)
    list.value = res.data?.data || []
    total.value = res.data?.count || 0
    await loadLikes(list.value)
  } catch {
    list.value = []
    total.value = 0
  } finally {
    loading.value = false
  }
}

// 统计待审核数量（自己的动态不受 audit 过滤影响）
async function loadPending() {
  if (!uid.value) return
  try {
    const res = await listMoments({
      limit: 1,
      where: JSON.stringify({ uid: uid.value, audit: 0 })
    })
    pendingCount.value = Number(res.data?.count) || 0
  } catch {
    pendingCount.value = 0
  }
}

function switchTab(val) {
  if (status.value === val) return
  status.value = val
  page.value = 1
  load()
}

const doSearch = debounce(() => {
  searchKey.value = keyword.value
  page.value = 1
  load()
}, 350)

function changePage(p) {
  if (p < 1 || p === page.value) return
  page.value = p
  load()
}

function viewMoment(item) {
  if (item.status === 1 && item.audit) router.push(`/moments/${item.id}`)
  else openEdit(item)
}

function confirmRemove(item) {
  const text = (item.content || '').slice(0, 20)
  if (!window.confirm(`确定删除这条动态吗？${text ? `内容：${text}…` : ''}删除后可在回收站找回。`)) return
  removeMoment(String(item.id))
    .then(() => {
      toast.success('已删除')
      if (list.value.length === 1 && page.value > 1) page.value -= 1
      load()
      loadPending()
    })
    .catch(() => {})
}

/* ========== 编辑弹窗 ========== */
const editVisible = ref(false)
const saving = ref(false)
const uploading = ref(false)
const fileInput = ref(null)
const editingId = ref(null)

const editForm = reactive({
  content: '',
  images: [],
  location: '',
  status: 1
})

const canSave = computed(() => editForm.content.trim() || editForm.images.length)

function openEdit(item) {
  editingId.value = item.id
  editForm.content = item.content || ''
  editForm.images = [...imagesOf(item)]
  editForm.location = item.location || ''
  editForm.status = item.status === undefined ? 1 : item.status
  editVisible.value = true
}

function closeEdit() {
  if (saving.value) return
  editVisible.value = false
  editingId.value = null
}

async function onPick(e) {
  const files = Array.from(e.target.files || [])
  e.target.value = ''
  if (!files.length) return

  if (editForm.images.length + files.length > 9) {
    toast.warning('最多只能上传 9 张图片')
    return
  }
  const valid = files.filter((file) => {
    if (!file.type.startsWith('image/')) {
      toast.warning(`文件「${file.name}」不是图片`)
      return false
    }
    if (file.size > 10 * 1024 * 1024) {
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
    const urls = results
      .filter((r) => r.status !== 'fail' && r.full_url)
      .map((r) => r.full_url)
    editForm.images.push(...urls)
    if (results.some((r) => r.status === 'fail')) toast.warning('部分图片上传失败')
  } catch {
    /* 拦截器已提示 */
  } finally {
    uploading.value = false
  }
}

function removeEditImage(i) {
  editForm.images.splice(i, 1)
}

async function submitEdit() {
  if (!editingId.value || !canSave.value || saving.value) return
  saving.value = true
  try {
    await updateMoment({
      id: editingId.value,
      content: editForm.content,
      images: editForm.images,
      location: editForm.location,
      status: editForm.status
    })
    toast.success('保存成功')
    editVisible.value = false
    editingId.value = null
    load()
    loadPending()
  } catch {
    toast.error('保存失败')
  } finally {
    saving.value = false
  }
}

watch(keyword, (val) => {
  if (!val) {
    searchKey.value = ''
    page.value = 1
    load()
  }
})

onMounted(() => {
  load()
  loadPending()
})
</script>

<style scoped>
.m-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 16px;
}
.block-title {
  font-size: 16px;
  font-weight: 600;
  margin: 0;
}
.block-desc {
  margin: 4px 0 0;
  font-size: 12px;
  color: var(--text-muted);
}

.m-filter {
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
}
.status-tab {
  padding: 5px 14px;
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
.search-box {
  position: relative;
  margin-left: auto;
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
  padding: 7px 12px 7px 30px;
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

.audit-tip {
  margin: 12px 0 0;
  padding: 8px 12px;
  font-size: 12px;
  color: var(--warning);
  background: var(--gold-wash);
  border-radius: var(--radius-sm);
}

.loading {
  padding: 40px;
  text-align: center;
  color: var(--text-muted);
}
.empty-row {
  padding: 24px 0;
  text-align: center;
}
.empty-action {
  margin-top: 12px;
}

.m-list {
  display: flex;
  flex-direction: column;
}
.m-row {
  display: flex;
  align-items: flex-start;
  gap: 14px;
  padding: 16px 0;
  border-bottom: 1px dashed var(--border-soft);
}
.m-row:last-child {
  border-bottom: none;
}
.m-main {
  flex: 1;
  min-width: 0;
}
.m-content {
  margin: 0 0 8px;
  font-size: 14px;
  line-height: 1.7;
  color: var(--text-soft);
  word-break: break-word;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.m-images {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 8px;
}
.m-img {
  width: 64px;
  height: 64px;
  object-fit: cover;
  border-radius: var(--radius-sm);
  border: 1px solid var(--border);
  cursor: zoom-in;
  transition: transform 0.2s;
}
.m-img:hover {
  transform: translateY(-2px);
}
.m-meta {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 10px;
  font-size: 12px;
  color: var(--text-muted);
}
.meta-text {
  display: inline-flex;
  align-items: center;
  gap: 3px;
}
.post-status {
  padding: 1px 7px;
  font-size: 11px;
  font-weight: 400;
  border-radius: 3px;
}
.post-status.is-pub {
  background: rgba(108, 154, 77, 0.12);
  color: var(--success);
}
.post-status.is-draft {
  background: var(--bg-muted);
  color: var(--text-muted);
}
.post-status.is-pending {
  background: var(--gold-soft);
  color: var(--warning);
}
.m-actions {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
}
.m-actions .danger:hover {
  border-color: var(--danger);
  color: var(--danger);
}

/* ===== 编辑弹窗 ===== */
.hidden-file {
  display: none;
}
.dialog-overlay {
  position: fixed;
  inset: 0;
  z-index: 9000;
  background: rgba(0, 0, 0, 0.45);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
}
.dialog {
  width: 100%;
  max-width: 520px;
  max-height: 88vh;
  display: flex;
  flex-direction: column;
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius-xl);
  box-shadow: var(--shadow-md);
  overflow: hidden;
}
.dialog-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 16px;
  border-bottom: 1px solid var(--border-soft);
}
.dialog-title {
  font-size: 15px;
  font-weight: 600;
}
.dialog-body {
  padding: 16px;
  overflow-y: auto;
}
.dialog-foot {
  display: flex;
  justify-content: flex-end;
  padding: 12px 16px;
  border-top: 1px solid var(--border-soft);
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
.switch-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 12px;
  font-size: 13px;
  color: var(--text-soft);
  cursor: pointer;
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
  background: var(--accent);
}
.dialog-fade-enter-active,
.dialog-fade-leave-active {
  transition: opacity 0.2s;
}
.dialog-fade-enter-from,
.dialog-fade-leave-to {
  opacity: 0;
}

@media (max-width: 640px) {
  .m-filter {
    gap: 8px;
  }
  .search-box {
    width: 100%;
    margin-left: 0;
  }
  .m-row {
    flex-wrap: wrap;
  }
  .m-actions {
    width: 100%;
    justify-content: flex-end;
  }
}
</style>
