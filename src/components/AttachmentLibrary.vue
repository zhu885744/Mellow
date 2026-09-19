<template>
  <Teleport to="body">
    <Transition name="attach-fade">
      <div v-if="visible" class="attach-mask" @click.self="close">
        <div class="attach-panel" role="dialog" aria-modal="true" :aria-label="title">
          <!-- 头部 -->
          <header class="attach-head">
            <h3 class="attach-title">
              <i class="bi bi-folder2-open" aria-hidden="true" />
              {{ title }}
            </h3>
            <button type="button" class="attach-close" title="关闭" @click="close">
              <i class="bi bi-x-lg" />
            </button>
          </header>

          <!-- 说明 + 刷新 -->
          <div class="attach-toolbar">
            <span class="attach-tip">
              {{ acceptTip }}
              <template v-if="multiple"> · 最多可选 {{ max }} 个</template>
            </span>
            <button type="button" class="btn btn-sm" :disabled="loading" @click="load()">
              <i class="bi bi-arrow-clockwise" :class="{ 'is-spin': loading }" /> 刷新
            </button>
          </div>

          <!-- 列表 -->
          <div class="attach-body">
            <div v-if="loading" class="attach-state">
              <span class="spinner" /> 加载中...
            </div>

            <div v-else-if="!filtered.length" class="attach-state">
              <i class="bi bi-inbox attach-state-icon" />
              <p>{{ items.length ? '当前页没有符合类型要求的附件' : '附件库还是空的，先上传一些吧' }}</p>
              <button v-if="items.length" type="button" class="btn btn-sm" @click="showAllTypes = true">
                显示全部类型
              </button>
            </div>

            <div v-else class="attach-grid">
              <button
                v-for="item in filtered"
                :key="item.id"
                type="button"
                class="attach-item"
                :class="{ 'is-picked': isPicked(item) }"
                :title="`${item.original_name}｜${formatSize(item.file_size)}｜${fromNow(item.create_time)}`"
                @click="toggle(item)"
              >
                <img v-if="isImage(item)" :src="item.full_url" :alt="item.original_name" loading="lazy" />
                <span v-else class="attach-file">
                  <i class="bi bi-file-earmark-text" />
                  <em>{{ extOf(item) || 'file' }}</em>
                </span>
                <span class="attach-name">{{ item.original_name }}</span>
                <span v-if="isPicked(item)" class="attach-check"><i class="bi bi-check-lg" /></span>
              </button>
            </div>
          </div>

          <!-- 底部分页 + 操作 -->
          <footer class="attach-foot">
            <div class="attach-pager">
              <Pagination
                v-if="total > pageSize"
                :current="page"
                :total="total"
                :page-size="pageSize"
                @update:current="changePage"
              />
              <span v-else class="attach-total">共 {{ total }} 个附件</span>
            </div>
            <div class="attach-actions">
              <span class="attach-picked">{{ picked.length ? `已选 ${picked.length} 个` : '未选择' }}</span>
              <button type="button" class="btn btn-sm" @click="close">取消</button>
              <button
                type="button"
                class="btn btn-primary btn-sm"
                :disabled="!picked.length"
                @click="confirm"
              >
                {{ multiple ? '应用所选' : '应用' }}
              </button>
            </div>
          </footer>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
import { ref, computed, watch, onUnmounted } from 'vue'
import Pagination from './Pagination.vue'
import { listMyAttachments } from '@/api/attachment'
import { extOf, isImageFile, matchAccept } from '@/utils/attachmentFilter'
import { fromNow } from '@/utils/time'
import { toast } from '@/utils/toast'

/**
 * 附件库弹窗
 *
 * 从「当前用户已上传的附件」中挑选文件并应用（可选多选），
 * 供动态 / 评论 / 文章编辑器 / 头像 / 收款码 / 站点 LOGO 等所有上传位置复用。
 *
 * 接口：GET /api/attachment/list（见 docs/API docs/attachment.md）
 */
const props = defineProps({
  visible: { type: Boolean, default: false },
  title: { type: String, default: '附件库' },
  // 类型限制：image（默认，仅图片）、all / *（全部）、或逗号分隔的 image/*、.png、image/jpeg
  accept: { type: String, default: 'image' },
  multiple: { type: Boolean, default: false },
  // 多选上限
  max: { type: Number, default: 9 },
  pageSize: { type: Number, default: 24 }
})

const emit = defineEmits(['update:visible', 'select'])

const loading = ref(false)
const items = ref([])
const total = ref(0)
const page = ref(1)
const picked = ref([])
// 兜底：类型筛选把本页全部隐藏时，允许临时显示全部类型
const showAllTypes = ref(false)

let bodyOverflow = ''

const isImage = isImageFile

// 按 accept 过滤当前页数据（无法识别类型时不过滤掉，避免「有数据却全被隐藏」）
const filtered = computed(() =>
  items.value.filter((item) => showAllTypes.value || matchAccept(item, props.accept))
)

const acceptTip = computed(() => {
  const accept = String(props.accept || '').toLowerCase()
  if (!accept || accept === '*' || accept === 'all' || showAllTypes.value) return '选择要应用的附件'
  return '仅显示图片类型的附件'
})

function isPicked(item) {
  return picked.value.some((i) => i.id === item.id)
}

function toggle(item) {
  if (props.multiple) {
    const index = picked.value.findIndex((i) => i.id === item.id)
    if (index > -1) {
      picked.value.splice(index, 1)
      return
    }
    if (picked.value.length >= props.max) {
      toast.warning(`最多只能选择 ${props.max} 个附件`)
      return
    }
    picked.value.push(item)
    return
  }
  // 单选：点击即应用
  picked.value = [item]
  confirm()
}

function confirm() {
  if (!picked.value.length) return
  // 统一返回 URL 数组（单选时取 [0]），同时给出完整附件对象便于扩展
  emit('select', picked.value.map((i) => i.full_url), picked.value.slice())
  close()
}

function close() {
  emit('update:visible', false)
}

function changePage(p) {
  if (p < 1 || p === page.value) return
  page.value = p
  load()
}

async function load(reset = true) {
  if (reset) page.value = 1
  loading.value = true
  try {
    const res = await listMyAttachments({ page: page.value, limit: props.pageSize })
    items.value = res.data?.data || []
    total.value = Number(res.data?.count) || 0
  } catch {
    items.value = []
    total.value = 0
  } finally {
    loading.value = false
  }
}

function lockBody(lock) {
  if (lock) {
    bodyOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
  } else {
    document.body.style.overflow = bodyOverflow || ''
  }
}

function onKeydown(e) {
  if (e.key === 'Escape') close()
}

watch(
  () => props.visible,
  (val) => {
    if (val) {
      picked.value = []
      showAllTypes.value = false
      lockBody(true)
      document.addEventListener('keydown', onKeydown)
      load()
    } else {
      lockBody(false)
      document.removeEventListener('keydown', onKeydown)
    }
  }
)

onUnmounted(() => {
  document.removeEventListener('keydown', onKeydown)
  lockBody(false)
})

function formatSize(bytes) {
  const size = Number(bytes) || 0
  if (!size) return '未知大小'
  if (size < 1024) return `${size} B`
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`
  return `${(size / 1024 / 1024).toFixed(1)} MB`
}
</script>

<style scoped>
.attach-mask {
  position: fixed;
  inset: 0;
  /* 低于 ConfirmDialog（3000）：确认弹窗需要盖在附件库之上；高于全屏编辑器（2000） */
  z-index: 2900;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
  background: rgba(0, 0, 0, 0.45);
}
.attach-panel {
  display: flex;
  flex-direction: column;
  width: 100%;
  max-width: 760px;
  max-height: min(86vh, 720px);
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-md);
  overflow: hidden;
}

/* ---------- 头部 ---------- */
.attach-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 14px 18px;
  border-bottom: 1px solid var(--border-soft);
}
.attach-title {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: var(--text);
}
.attach-title .bi {
  color: var(--primary);
}
.attach-close {
  width: 28px;
  height: 28px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: none;
  border-radius: var(--radius-sm);
  background: transparent;
  color: var(--text-muted);
  cursor: pointer;
  transition: background 0.15s, color 0.15s;
}
.attach-close:hover {
  background: var(--bg-muted);
  color: var(--primary);
}

/* ---------- 工具条 ---------- */
.attach-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 10px 18px;
  border-bottom: 1px solid var(--border-soft);
}
.attach-tip {
  font-size: 12px;
  color: var(--text-muted);
}
.attach-toolbar .bi.is-spin {
  display: inline-block;
  animation: attach-spin 0.8s linear infinite;
}
@keyframes attach-spin {
  to { transform: rotate(360deg); }
}

/* ---------- 内容 ---------- */
.attach-body {
  flex: 1;
  min-height: 200px;
  overflow-y: auto;
  padding: 14px 18px;
}
.attach-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 48px 12px;
  font-size: 13px;
  color: var(--text-muted);
}
.attach-state p {
  margin: 0;
}
.attach-state-icon {
  font-size: 26px;
  color: var(--text-light);
}

.attach-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(104px, 1fr));
  gap: 10px;
}
.attach-item {
  position: relative;
  padding: 0;
  aspect-ratio: 1 / 1;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background: var(--bg-muted);
  overflow: hidden;
  cursor: pointer;
  transition: border-color 0.15s, box-shadow 0.15s, transform 0.15s;
}
.attach-item:hover {
  border-color: var(--primary-soft);
  transform: translateY(-1px);
}
.attach-item.is-picked {
  border-color: var(--primary);
  box-shadow: 0 0 0 3px var(--accent-ring);
}
.attach-item img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}
.attach-file {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  height: 100%;
  color: var(--text-muted);
}
.attach-file .bi {
  font-size: 26px;
}
.attach-file em {
  font-style: normal;
  font-size: 11px;
  text-transform: uppercase;
  color: var(--text-light);
}
.attach-name {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  padding: 14px 6px 5px;
  font-size: 11px;
  line-height: 1.4;
  color: #fff;
  text-align: left;
  background: linear-gradient(transparent, rgba(0, 0, 0, 0.62));
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.attach-check {
  position: absolute;
  top: 6px;
  right: 6px;
  width: 20px;
  height: 20px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  color: #fff;
  background: var(--primary);
  border-radius: 50%;
}

/* ---------- 底部 ---------- */
.attach-foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 12px 18px;
  border-top: 1px solid var(--border-soft);
}
.attach-total {
  font-size: 12px;
  color: var(--text-muted);
}
.attach-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}
.attach-picked {
  font-size: 12px;
  color: var(--text-muted);
}

/* ---------- 过渡 ---------- */
.attach-fade-enter-active,
.attach-fade-leave-active {
  transition: opacity 0.2s ease;
}
.attach-fade-enter-active .attach-panel,
.attach-fade-leave-active .attach-panel {
  transition: opacity 0.2s ease, transform 0.2s ease;
}
.attach-fade-enter-from,
.attach-fade-leave-to {
  opacity: 0;
}
.attach-fade-enter-from .attach-panel,
.attach-fade-leave-to .attach-panel {
  opacity: 0;
  transform: translateY(-10px) scale(0.98);
}

@media (max-width: 640px) {
  .attach-mask {
    padding: 0;
    align-items: flex-end;
  }
  .attach-panel {
    max-width: none;
    max-height: 92vh;
    border-radius: var(--radius-lg) var(--radius-lg) 0 0;
  }
  .attach-foot {
    flex-direction: column;
    align-items: stretch;
  }
  .attach-actions {
    justify-content: flex-end;
  }
  .attach-grid {
    grid-template-columns: repeat(auto-fill, minmax(88px, 1fr));
  }
}
</style>
