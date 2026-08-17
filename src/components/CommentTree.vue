<template>
  <div class="comment-tree">
    <!-- 发表评论（根评论） -->
    <div class="root-comment-box">
      <img class="root-avatar" :src="userStore.user?.avatar || defaultAvatar" alt="" />
      <div class="root-input">
        <EmojiEditor
          v-model="newComment"
          :disabled="!userStore.isLogged"
          :placeholder="userStore.isLogged ? '写下你的评论…' : '登录后即可发表评论'"
        />
        <div class="root-actions">
          <button
            class="btn-primary"
            :disabled="!userStore.isLogged || !newComment.trim()"
            @click="submitRoot"
          >
            发表评论
          </button>
        </div>
      </div>
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
        :reply-to="replyTo"
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
import { ref, watch, onMounted, computed } from 'vue'
import CommentItem from './CommentItem.vue'
import Pagination from './Pagination.vue'
import EmptyState from './EmptyState.vue'
import EmojiEditor from './EmojiEditor.vue'
import { getCommentTree, createComment, removeComment } from '@/api/comment'
import { likesCount, isLiked, like, unlike } from '@/api/tags'
import { useUserStore } from '@/stores/user'
import { toast } from '@/utils/toast'
import { pickCommentAuthor } from '@/utils/helper'

const props = defineProps({
  bindId: { type: [String, Number], required: true },
  bindType: { type: String, default: 'article' },
  authorId: { type: [String, Number], default: null }
})

// 通知父组件真实评论总数（发表/删除后同步）
const emit = defineEmits(['loaded'])

const userStore = useUserStore()

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
    emit('loaded', total.value)
  } catch {
    rawList.value = []
    tree.value = []
    total.value = 0
    emit('loaded', 0)
  } finally {
    loading.value = false
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

// 发表根评论
async function submitRoot() {
  const content = newComment.value.trim()
  if (!content) return
  await onSubmit({ content, pid: 0 })
  newComment.value = ''
}

async function onSubmit({ content, pid }) {
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
.comment-loading {
  padding: 32px;
  text-align: center;
  color: var(--text-muted);
  font-size: 13px;
}

.root-comment-box {
  display: flex;
  gap: 10px;
  padding: 12px;
  background: var(--bg-alt, #faf9f5);
  border: 1px solid var(--border, #e8e6dd);
  border-radius: 12px;
  margin-bottom: 16px;
}
.root-avatar {
  width: 38px;
  height: 38px;
  border-radius: 50%;
  flex-shrink: 0;
  object-fit: cover;
}
.root-input {
  flex: 1;
}
.root-input textarea {
  width: 100%;
  border: 1px solid var(--border, #e8e6dd);
  border-radius: 8px;
  padding: 8px 10px;
  font-size: 14px;
  resize: vertical;
  background: var(--bg, #fff);
  color: var(--text, #2c2c2c);
  font-family: inherit;
  box-sizing: border-box;
}
.root-input textarea:focus {
  outline: none;
  border-color: var(--accent, #c2a36b);
}
.root-actions {
  display: flex;
  justify-content: flex-end;
  margin-top: 8px;
}
.btn-primary {
  background: var(--accent, #c2a36b);
  color: #fff;
  border: none;
  padding: 7px 18px;
  border-radius: 8px;
  font-size: 14px;
  cursor: pointer;
}
.btn-primary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>
