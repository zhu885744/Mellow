<template>
  <div>
    <div v-if="loading" class="loading">
      <span class="spinner" /> 加载评论中...
    </div>
    <div v-else-if="!comments.length" class="empty small">
      还没有评论，<a href="#" @click.prevent="focusEditor">抢沙发</a>
    </div>
    <ul v-else class="comment-tree">
      <CommentItem
        v-for="c in flatTree"
        :key="c.id"
        :comment="c"
        :depth="0"
        @reply="onReply"
      />
    </ul>

    <!-- 评论输入框 -->
    <div class="comment-editor" :ref="el => editorRef = el">
      <div v-if="replyTo" class="reply-to">
        回复 <strong>@{{ replyTo.author?.nickname || '用户' }}</strong>
        <button class="btn-link" @click="replyTo = null">取消</button>
      </div>
      <textarea
        v-model="content"
        class="textarea"
        placeholder="说点什么吧..."
        rows="4"
      />
      <div class="comment-actions">
        <span class="text-muted">支持 Markdown</span>
        <button class="btn btn-primary" :disabled="submitting" @click="submit">
          {{ submitting ? '提交中...' : '发表评论' }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed, watch } from 'vue'
import CommentItem from './CommentItem.vue'
import { getCommentTree, createComment } from '@/api/comment'
import { toast } from '@/utils/toast'
import { useUserStore } from '@/stores/user'
import { useRouter } from 'vue-router'

const props = defineProps({
  bindId: { type: [String, Number], required: true },
  bindType: { type: String, default: 'article' }
})

const router = useRouter()
const userStore = useUserStore()

const comments = ref([])
const loading = ref(false)
const submitting = ref(false)
const content = ref('')
const replyTo = ref(null)
const editorRef = ref(null)

async function load() {
  loading.value = true
  try {
    const res = await getCommentTree(props.bindId, props.bindType, {
      page: 1,
      limit: 100
    })
    comments.value = res.data?.data || []
  } catch {
    comments.value = []
  } finally {
    loading.value = false
  }
}

function onReply(c) {
  replyTo.value = c
  if (editorRef.value) editorRef.value.scrollIntoView({ behavior: 'smooth' })
}

function focusEditor() {
  if (editorRef.value) editorRef.value.scrollIntoView({ behavior: 'smooth' })
}

// 平铺评论树（按 parentId 分组）,然后递归渲染
const flatTree = computed(() => comments.value)

async function submit() {
  if (!userStore.isLogged) {
    toast.warning('请先登录')
    router.push({ name: 'login', query: { redirect: router.currentRoute.value.fullPath } })
    return
  }
  if (!content.value.trim()) {
    toast.warning('评论不能为空')
    return
  }
  submitting.value = true
  try {
    await createComment({
      content: content.value,
      bind_id: props.bindId,
      bind_type: props.bindType,
      pid: replyTo.value?.id || 0
    })
    content.value = ''
    replyTo.value = null
    toast.success('评论成功')
    load()
  } catch (e) {
    // toast already shown
  } finally {
    submitting.value = false
  }
}

watch(() => props.bindId, load)
onMounted(load)
</script>

<style scoped>
.loading {
  padding: 24px;
  text-align: center;
  color: var(--text-muted);
  font-size: 13px;
}
.empty.small {
  padding: 24px;
}
.comment-tree {
  margin-bottom: 24px;
}
.reply-to {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: var(--bg-muted);
  padding: 8px 12px;
  border-radius: var(--radius);
  font-size: 13px;
  margin-bottom: 12px;
  color: var(--text-soft);
}
.btn-link {
  background: none;
  border: none;
  color: var(--text-muted);
  font-size: 12px;
  cursor: pointer;
  text-decoration: underline;
}
.comment-editor {
  padding: 16px;
  background: var(--bg-card);
  border-radius: var(--radius);
  border: 1px solid var(--border-soft);
}
.comment-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 12px;
  font-size: 12px;
}
</style>