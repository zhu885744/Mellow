<template>
  <div class="comment-tree">
    <!-- 发表评论（根评论）；allowComment = false 时只隐藏输入发布模块，评论列表照常展示 -->
    <div v-if="allowComment" class="root-comment-box">
      <img v-if="userStore.isLogged" class="root-avatar" :src="userStore.user?.avatar || defaultAvatar" alt="" @click="goMe" />
      <div class="root-input">
        <div v-if="userStore.isLogged" class="root-meta">
          <span class="root-name" @click="goMe">{{ userStore.user.nickname || '我' }}</span>
          <span v-if="myLevel" class="c-level">Lv.{{ myLevel }}</span>
          <span v-if="myTitle" :class="['c-title', myTitleClass]">{{ myTitle }}</span>
        </div>
        <template v-if="userStore.isLogged">
          <EmojiEditor
            v-model="newComment"
            placeholder="写下你的评论…"
          >
            <template #extra>
              <button
                type="button"
                class="btn btn-secondary btn-sm"
                :class="{ 'is-loading': uploading }"
                title="插入图片"
                @click="fileInput?.click()"
              >
                <i class="bi bi-image" />
                {{ uploading ? '上传中…' : '图片' }}
              </button>
            </template>
          </EmojiEditor>
          <!-- 已选图片预览 -->
          <div v-if="newImages.length" class="img-preview">
            <div v-for="(img, i) in newImages" :key="img" class="img-thumb">
              <img :src="img" alt="" />
              <span class="img-del" title="移除" @click="removeImage(i)">×</span>
            </div>
          </div>
          <input
            ref="fileInput"
            type="file"
            accept="image/*"
            multiple
            class="hidden-file"
            @change="onPickImages"
          />
          <div class="root-actions">
            <span v-if="newImages.length" class="img-tip">已选 {{ newImages.length }} 张图片</span>
            <button
              class="btn btn-primary btn-sm btn-block"
              :disabled="(!newComment.trim() && !newImages.length) || uploading"
              @click="submitRoot"
            >
              发表评论
            </button>
          </div>
        </template>
        <div v-else class="login-tip">
          <span class="login-tip-text">登录后可参与回复讨论。</span>
          <div class="login-tip-actions">
            <RouterLink :to="{ name: 'login', query: { redirect: $route.fullPath } }" class="btn btn-sm btn-primary">登录</RouterLink>
            <RouterLink :to="{ name: 'register' }" class="btn btn-sm">注册</RouterLink>
          </div>
        </div>
      </div>
    </div>

    <!-- 评论已关闭提示（仍展示已有评论） -->
    <div v-else class="comment-closed">
      <i class="bi bi-chat-square" aria-hidden="true" />
      该内容的评论功能已关闭
    </div>

    <div v-if="loading" class="comment-loading">
      <span class="spinner" /> 加载中...
    </div>
    <EmptyState v-else-if="!tree.length" icon="bi bi-chat-dots" text="还没有评论，快来抢沙发~" />
    <template v-else>
      <CommentItem
        v-for="c in tree"
        :key="c.id"
        :comment="c"
        :bind-type="bindType"
        :author-id="authorId"
        :allow-comment="allowComment"
        :reply-to="replyTo"
        :highlight-id="highlightId"
        @like="onLike"
        @reply="onReply"
        @submit="onSubmit"
        @remove="onRemove"
      />
      <Pagination
        v-if="total > pageSize"
        :current="page"
        :total="total"
        :page-size="pageSize"
        @update:current="(p) => { page = p; load() }"
      />
    </template>
  </div>
</template>

<script setup>
import { ref, watch, onMounted, computed, nextTick } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import CommentItem from './CommentItem.vue'
import Pagination from './Pagination.vue'
import EmptyState from './EmptyState.vue'
import EmojiEditor from './EmojiEditor.vue'
import {
  getCommentTree,
  createComment,
  removeComment,
  uploadCommentImages
} from '@/api/comment'
import { likesCount, isLiked, like, unlike } from '@/api/tags'
import { useUserStore } from '@/stores/user'
import { toast } from '@/utils/toast'
import { pickCommentAuthor, pickUserLevel, pickUserTitle, getTitleColorClass } from '@/utils/helper'

const props = defineProps({
  bindId: { type: [String, Number], required: true },
  bindType: { type: String, default: 'article' },
  authorId: { type: [String, Number], default: null },
  highlightId: { type: [String, Number], default: null },
  // 是否允许评论：false 时隐藏「发表评论 / 回复」输入模块，评论内容仍展示
  allowComment: { type: Boolean, default: true }
})

// 通知父组件真实评论总数（发表/删除后同步）
const emit = defineEmits(['loaded'])

const userStore = useUserStore()
const router = useRouter()
const route = useRoute()

// 当前登录用户信息（根评论框展示 + 跳转作者主页）
const myLevel = computed(() => pickUserLevel(userStore.user))
const myTitle = computed(() => pickUserTitle(userStore.user))
const myTitleClass = computed(() => getTitleColorClass(myTitle.value))
function goMe() {
  const id = userStore.user?.id
  if (userStore.isLogged && id) router.push(`/author/${id}`)
}

const rawList = ref([])
const tree = ref([])
const newComment = ref('')

const defaultAvatar = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40"><circle cx="20" cy="20" r="20" fill="%23e8e6dd"/></svg>'
const loading = ref(false)
const page = ref(1)
const pageSize = 15
const total = ref(0)
const replyTo = ref(null)

// 拉取点赞数与已点赞状态（递归处理嵌套树里的所有评论，含子评论）
//  - 已登录：逐项 is-liked，返回里同时带 count（用 count 填点赞数）
//  - 未登录：批量 counts（target_ids 数组）
function flattenTree(list) {
  const result = []
  const walk = (arr) => {
    arr.forEach((c) => {
      result.push(c)
      if (c.replies?.length) walk(c.replies)
    })
  }
  walk(list)
  return result
}

// 递归统计全部评论数（含所有层级的子回复）
// 后端 flat 返回的 count 只统计根评论，需前端补齐子评论
function countAllComments(list) {
  let n = 0
  const walk = (arr) => {
    arr.forEach((c) => {
      n += 1
      if (c.replies?.length) walk(c.replies)
    })
  }
  walk(list)
  return n
}

async function loadLikes(list) {
  const flat = flattenTree(list)
  if (!flat.length) return
  if (userStore.isLogged) {
    await Promise.all(
      flat.map(async (c) => {
        const r = await isLiked('comment', c.id).catch(() => null)
        c.liked = !!r?.data?.is_liked
        if (r?.data?.count !== undefined) c.likeCount = r.data.count
      })
    )
  } else {
    const ids = flat.map((c) => c.id)
    const countsRes = await likesCount('comment', ids).catch(() => null)
    const countMap = countsRes?.data?.counts || {}
    flat.forEach((c) => {
      c.likeCount = countMap[c.id] ?? countMap[String(c.id)] ?? 0
    })
  }
}

async function load() {
  loading.value = true
  try {
    const res = await getCommentTree(props.bindId, props.bindType, {
      page: page.value,
      limit: pageSize
    })
    const list = res.data?.data || []
    total.value = res.data?.count || list.length
    await loadLikes(list)
    rawList.value = list
    // 后端 comment/flat 已返回嵌套树（根评论带 replies 字段），无需前端再构树
    tree.value = list
    // 回传真实评论总数：后端 count 只含根评论，递归统计补齐子评论（取较大值兜底分页）
    emit('loaded', Math.max(total.value, countAllComments(list)))
  } catch {
    rawList.value = []
    tree.value = []
    total.value = 0
    emit('loaded', 0)
  } finally {
    loading.value = false
    // 从侧边栏等入口带 ?comment=xxx 跳转时，定位并高亮该评论
    if (props.highlightId) {
      nextTick(() => {
        const el = document.getElementById(`comment-${props.highlightId}`)
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' })
          el.classList.add('comment-flash')
          setTimeout(() => el.classList.remove('comment-flash'), 2000)
        }
      })
    }
  }
}

async function onLike(comment) {
  if (!userStore.isLogged) {
    toast.warning('请先登录')
    return
  }
  const next = !comment.liked
  const prevCount = comment.likeCount || 0
  // 乐观更新
  comment.liked = next
  comment.likeCount = prevCount + (next ? 1 : -1)
  try {
    if (next) await like('comment', comment.id)
    else await unlike('comment', comment.id)
    // 用 is-liked 返回的实时 count 校准（后端为唯一数据源）
    const r = await isLiked('comment', comment.id).catch(() => null)
    if (r?.data?.count !== undefined) comment.likeCount = r.data.count
    comment.liked = next
    if (next) toast.success('点赞成功')
    else toast.info('已取消点赞')
  } catch {
    comment.liked = !next
    comment.likeCount = prevCount
    toast.error('操作失败')
  }
}

function onReply(comment) {
  replyTo.value = { id: comment.id, name: pickCommentAuthor(comment).nickname || '匿名' }
}

const newImages = ref([])
const uploading = ref(false)
const fileInput = ref(null)

// 选择图片后立即上传，仅保存返回的 URL
async function onPickImages(e) {
  const files = Array.from(e.target.files || [])
  // 清空 value，避免连续选择同一文件时不再触发 change
  e.target.value = ''
  if (!files.length) return

  if (newImages.value.length + files.length > 9) {
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
    const res = await uploadCommentImages(fd)
    const results = res.data?.results || []
    const urls = results
      .filter((r) => r.status !== 'fail' && r.full_url)
      .map((r) => r.full_url)
    newImages.value.push(...urls)
    if (results.some((r) => r.status === 'fail')) toast.warning('部分图片上传失败')
  } catch {
    /* 拦截器已提示 */
  } finally {
    uploading.value = false
  }
}

function removeImage(i) {
  newImages.value.splice(i, 1)
}

// 发表根评论
async function submitRoot() {
  const content = newComment.value.trim()
  if (!content && !newImages.value.length) return
  await onSubmit({ content, images: [...newImages.value], pid: 0 })
  newComment.value = ''
  newImages.value = []
}

async function onSubmit({ content, images, pid }) {
  if (!userStore.isLogged) {
    toast.warning('请先登录')
    return
  }
  try {
    await createComment({
      bind_id: props.bindId,
      bind_type: props.bindType,
      pid: pid || 0,
      content,
      // 后端 processFieldValue 会把数组转为逗号分隔字符串
      images: images || [],
      status: 1,
      audit: 1
    })
    toast.success('评论成功')
    replyTo.value = null
    page.value = 1
    load()
  } catch {
    toast.error('评论失败')
  }
}

async function onRemove(comment) {
  if (!confirm('确定删除该评论吗？')) return
  try {
    await removeComment(String(comment.id))
    toast.success('已删除')
    load()
  } catch {
    toast.error('删除失败')
  }
}

watch(() => props.bindId, () => {
  page.value = 1
  load()
})
onMounted(load)

defineExpose({ load })
</script>

<style scoped>
.comment-tree {
  margin-top: 8px;
}
/* 来自侧边栏等入口的评论定位高亮 */
:deep(.comment-item.comment-highlight) {
  scroll-margin-top: 80px;
}
:deep(.comment-item.comment-flash) {
  animation: comment-flash 2s ease;
  border-radius: var(--radius-lg);
}
@keyframes comment-flash {
  0%, 100% { background: transparent; box-shadow: none; }
  20% { background: var(--accent-soft); box-shadow: 0 0 0 2px var(--accent-glow); }
}

.comment-loading {
  padding: 32px;
  text-align: center;
  color: var(--text-muted);
  font-size: 13px;
}

/* 评论已关闭（禁止评论时替代输入模块） */
.comment-closed {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 16px;
  padding: 12px 14px;
  font-size: 13px;
  color: var(--text-muted);
  background: var(--bg-alt);
  border: 1px dashed var(--border);
  border-radius: var(--radius-lg);
}
.comment-closed .bi {
  font-size: 14px;
}

.root-comment-box {
  display: flex;
  gap: 10px;
  padding: 12px;
  background: var(--bg-alt);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  margin-bottom: 16px;
}
.root-avatar {
  width: 38px;
  height: 38px;
  border-radius: 50%;
  flex-shrink: 0;
  object-fit: cover;
  cursor: pointer;
}
.root-input {
  flex: 1;
  min-width: 0;
}
.root-meta {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 6px;
  font-size: 13px;
}
.login-tip {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.login-tip-text {
  color: var(--text-muted);
  font-size: 13px;
}
.login-tip-actions {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-shrink: 0;
}
.root-name {
  font-weight: 600;
  color: var(--text);
  cursor: pointer;
  transition: color 0.2s;
}
.root-name:hover {
  color: var(--primary);
}
.c-level {
  font-size: 11px;
  padding: 1px 6px;
  border-radius: var(--radius-xs);
  background: var(--accent-soft);
  color: var(--primary-deep);
  flex-shrink: 0;
}
.c-title {
  font-size: 11px;
  padding: 1px 6px;
  border-radius: var(--radius-xs);
  font-weight: 600;
  color: #fff;
  flex-shrink: 0;
}
/* 头衔配色（与 Profile 页 10 个头衔一致） */
.title-zhangmen { background: linear-gradient(135deg, #c8a04a, #b07d2e); }
.title-zhanglao { background: linear-gradient(135deg, #8e6f3e, #6c4f24); }
.title-hufa { background: linear-gradient(135deg, #c0392b, #a93226); }
.title-neimen { background: linear-gradient(135deg, #2980b9, #1f618d); }
.title-waimen { background: linear-gradient(135deg, #16a085, #117a65); }
.title-lianqi { background: linear-gradient(135deg, #27ae60, #1e8449); }
.title-zhuji { background: linear-gradient(135deg, #7cb342, #558b2f); }
.title-jiedan { background: linear-gradient(135deg, #e67e22, #ca6f1e); }
.title-yuanying { background: linear-gradient(135deg, #6c5ce7, #5a3fd4); }
.title-huashen { background: linear-gradient(135deg, #f6d365, #fda085); text-shadow: 0 1px 2px rgba(0, 0, 0, 0.25); }
.title-xiake { background: linear-gradient(135deg, #4a9e6f, #2f7d52); }
.title-xuetu { background: linear-gradient(135deg, #9aa0a6, #6c757d); }
.title-default { background: #6c757d; }
.root-input textarea {
  width: 100%;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 8px 10px;
  font-size: 15px;
  line-height: 1.7;
  resize: vertical;
  background: var(--bg-muted);
  color: var(--text);
  font-family: inherit;
  box-sizing: border-box;
}
.root-input textarea:focus {
  outline: none;
  border-color: var(--accent);
  box-shadow: 0 0 0 3px var(--accent-ring);
}
.root-actions {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 8px;
}
.hidden-file {
  display: none;
}
.img-tip {
  font-size: 12px;
  color: var(--text-muted);
}
/* 已选图片预览 */
.img-preview {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 8px;
}
.img-thumb {
  position: relative;
  width: 64px;
  height: 64px;
  border-radius: var(--radius-xs);
  overflow: hidden;
  border: 1px solid var(--border);
}
.img-thumb img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}
.img-del {
  position: absolute;
  top: 0;
  right: 0;
  width: 16px;
  height: 16px;
  line-height: 15px;
  text-align: center;
  font-size: 13px;
  color: #fff;
  background: rgba(0, 0, 0, 0.55);
  border-radius: 0 0 0 var(--radius-xs);
  cursor: pointer;
}
.img-del:hover {
  background: var(--accent);
}
</style>
