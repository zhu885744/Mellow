<template>
  <div class="comment-item" :class="{ 'is-child': isChild }">
    <div class="c-avatar">
      <img :src="author.avatar || defaultAvatar" :alt="author.nickname" @error="onImgError" />
    </div>
    <div class="c-body">
      <div class="c-head">
        <span class="c-name">{{ author.nickname }}</span>
        <span v-if="author.id === authorId" class="c-badge">作者</span>
        <span class="c-time">{{ formatDate(comment.create_time) }}</span>
        <button v-if="canDelete" class="c-del" @click="$emit('remove', comment)">删除</button>
      </div>

      <div class="c-content" v-html="renderedContent"></div>

      <div class="c-actions">
        <button class="c-action" :class="{ active: comment.liked }" @click="$emit('like', comment)">
          <span class="c-icon"><i class="bi" :class="comment.liked ? 'bi-heart-fill' : 'bi-heart'" /></span>
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
import { ref, computed } from 'vue'
import { formatDate } from '@/utils/time'
import { useUserStore } from '@/stores/user'
import { isAdmin, pickCommentAuthor } from '@/utils/helper'
import { renderEmojiWithBreaks } from '@/utils/emoji'
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
const defaultAvatar = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40"><circle cx="20" cy="20" r="20" fill="%23e8e6dd"/></svg>'
const replyText = ref('')

// 后端把评论作者放在 result.author
const author = computed(() => pickCommentAuthor(props.comment))
const renderedContent = computed(() => renderEmojiWithBreaks(props.comment.content))

const parentName = computed(() => props.comment.parentName || '')

const canDelete = computed(() => {
  const uid = userStore.user?.id
  const cid = author.value.id
  return !!(uid && (String(uid) === String(cid) || isAdmin(userStore.user) || props.authorId === uid))
})

function onImgError(e) {
  e.target.src = defaultAvatar
}

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
