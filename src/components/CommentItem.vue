<template>
  <div class="comment-item" :class="{ 'is-child': isChild }">
    <div class="c-avatar">
      <img :src="author.avatar || defaultAvatar" :alt="author.nickname" @error="onImgError" />
    </div>
    <div class="c-body">
      <div class="c-head">
        <span v-if="authorLink" class="c-name c-name-link" @click="goAuthor">{{ author.nickname }}</span>
        <span v-else class="c-name">{{ author.nickname }}</span>
        <span v-if="author.level" class="c-level">Lv.{{ author.level }}</span>
        <span v-if="author.title" :class="['c-title', titleClass]">{{ author.title }}</span>
        <span v-if="author.id === authorId" class="c-badge">作者</span>
        <span class="c-time">{{ formatDate(comment.create_time) }}</span>
        <button v-if="canDelete" class="c-del" @click="$emit('remove', comment)">删除</button>
      </div>

      <div class="c-content" :class="{ 'c-content-link': authorLink }" v-html="renderedContent" @click="goAuthor"></div>

      <div class="c-actions">
        <button ref="likeBtn" class="c-action like-btn" :class="{ active: comment.liked }" @click="$emit('like', comment)">
          <span class="c-icon"><i ref="likeIcon" class="bi" :class="comment.liked ? 'bi-heart-fill' : 'bi-heart'" /></span>
          <span>{{ comment.likeCount || 0 }}</span>
        </button>
        <button class="c-action" @click="$emit('reply', comment)">
          <span class="c-icon"><i class="bi bi-chat-dots" /></span> 回复
        </button>
      </div>

      <!-- 回复框 -->
      <div v-if="replyTo && replyTo.id === comment.id" class="c-reply-box">
        <EmojiEditor
          v-model="replyText"
          :placeholder="`回复 @${replyTo.name}：`"
        />
        <div class="c-reply-actions">
          <button class="btn btn-sm" @click="cancelReply">取消</button>
          <button class="btn btn-primary btn-sm" :disabled="!replyText.trim()" @click="submitReply">发送</button>
        </div>
      </div>

      <!-- 子评论 -->
      <div v-if="comment.replies && comment.replies.length" class="c-children">
        <CommentItem
          v-for="child in comment.replies"
          :key="child.id"
          :comment="child"
          :bind-type="bindType"
          :is-child="true"
          :author-id="authorId"
          :reply-to="replyTo"
          @like="$emit('like', $event)"
          @reply="$emit('reply', $event)"
          @submit="$emit('submit', $event)"
          @remove="$emit('remove', $event)"
        />
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { useRouter } from 'vue-router'
import { formatDate } from '@/utils/time'
import { useUserStore } from '@/stores/user'
import { isAdmin, pickCommentAuthor, getTitleColorClass } from '@/utils/helper'
import { renderEmojiWithBreaks } from '@/utils/emoji'
import { popIcon, popOut, burstHeart } from '@/utils/likeFx'
import EmojiEditor from './EmojiEditor.vue'

const props = defineProps({
  comment: { type: Object, required: true },
  bindType: { type: String, default: 'article' },
  isChild: { type: Boolean, default: false },
  authorId: { type: [String, Number], default: null },
  replyTo: { type: Object, default: null }
})

const emit = defineEmits(['like', 'reply', 'submit', 'remove'])

const userStore = useUserStore()
const router = useRouter()
const defaultAvatar = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40"><circle cx="20" cy="20" r="20" fill="%23e8e6dd"/></svg>'
const replyText = ref('')

// 后端把评论作者放在 result.author
const author = computed(() => pickCommentAuthor(props.comment))
const renderedContent = computed(() => renderEmojiWithBreaks(props.comment.content))

// 作者主页链接（作者 id 存在时才可点击）
const authorLink = computed(() => {
  const id = author.value?.id
  return id ? `/author/${id}` : ''
})
function goAuthor() {
  if (authorLink.value) router.push(authorLink.value)
}

// 头衔配色（复用作者主页映射）
const titleClass = computed(() => getTitleColorClass(author.value.title))

const parentName = computed(() => props.comment.parentName || '')

const canDelete = computed(() => {
  const uid = userStore.user?.id
  const cid = author.value.id
  return !!(uid && (String(uid) === String(cid) || isAdmin(userStore.user) || props.authorId === uid))
})

function onImgError(e) {
  e.target.src = defaultAvatar
}

const likeIcon = ref(null)
const likeBtn = ref(null)

// 点赞状态由父组件（CommentTree）乐观更新，此处监听触发动画
watch(
  () => props.comment.liked,
  (val, old) => {
    if (val === old || val === undefined) return
    if (val) {
      popIcon(likeIcon.value)
      burstHeart(likeBtn.value)
    } else {
      popOut(likeIcon.value)
    }
  }
)

function cancelReply() {
  replyText.value = ''
  emit('reply', { id: null })
}

function submitReply() {
  if (!replyText.value.trim()) return
  emit('submit', { content: replyText.value.trim(), pid: props.comment.id })
  replyText.value = ''
}
</script>

<style scoped>
.comment-item {
  display: flex;
  gap: 12px;
  padding: 16px 0;
  border-bottom: 1px dashed var(--border);
}
.comment-item:last-child {
  border-bottom: none;
}
.c-avatar img {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  object-fit: cover;
  background: var(--bg-muted);
}
.c-body {
  flex: 1;
  min-width: 0;
}
.c-head {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
}
.c-name {
  font-weight: 500;
  color: var(--text);
}
.c-name-link {
  cursor: pointer;
  transition: color 0.2s;
}
.c-name-link:hover {
  color: var(--primary);
}
.c-level {
  font-size: 11px;
  padding: 1px 6px;
  border-radius: 4px;
  background: rgba(184, 153, 104, 0.14);
  color: var(--primary-deep);
  flex-shrink: 0;
}
.c-title {
  font-size: 11px;
  padding: 1px 6px;
  border-radius: 4px;
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
.c-badge {
  font-size: 10px;
  padding: 0 5px;
  border-radius: 3px;
  background: rgba(192, 57, 43, 0.1);
  color: var(--accent);
}
.c-time {
  color: var(--text-muted);
  font-size: 12px;
}
.c-del {
  margin-left: auto;
  border: none;
  background: none;
  color: var(--text-muted);
  font-size: 12px;
  cursor: pointer;
}
.c-del:hover {
  color: var(--accent);
}
.c-content {
  font-size: 14px;
  line-height: 1.7;
  color: var(--text-soft);
  margin: 6px 0;
  word-break: break-word;
}
.c-content-link {
  cursor: pointer;
  transition: color 0.2s;
}
.c-content-link:hover {
  color: var(--primary);
}
.c-reply-to {
  color: var(--primary);
}
.c-actions {
  display: flex;
  gap: 16px;
}
.c-action {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  border: none;
  background: none;
  color: var(--text-muted);
  font-size: 12px;
  cursor: pointer;
  padding: 0;
}
.c-action:hover {
  color: var(--primary);
}
.like-btn {
  position: relative;
}
.c-action.active {
  color: var(--accent);
}
.c-icon {
  font-size: 14px;
}
.c-reply-box {
  margin-top: 10px;
}
.c-reply-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 6px;
}
.c-children {
  margin-top: 12px;
  padding-left: 14px;
  border-left: 2px solid var(--border);
}
</style>
