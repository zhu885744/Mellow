<template>
  <li class="comment-item" :style="depthStyle">
    <div class="comment-head">
      <img :src="comment.result?.author?.avatar || defaultAvatar" class="avatar" />
      <div class="meta">
        <div class="name">
          {{ comment.result?.author?.nickname || '匿名' }}
          <span v-if="comment.result?.author?.title" class="title-tag">{{ comment.result.author.title }}</span>
        </div>
        <div class="time">{{ fromNow(comment.create_time) }}</div>
      </div>
      <button class="reply-btn" @click="$emit('reply', comment)">回复</button>
    </div>
    <div class="comment-body" v-html="renderedContent"></div>
    <ul v-if="comment.replies?.length" class="sub-comment">
      <CommentItem
        v-for="r in comment.replies"
        :key="r.id"
        :comment="r"
        :depth="depth + 1"
        @reply="(c) => $emit('reply', c)"
      />
    </ul>
  </li>
</template>

<script setup>
import { computed } from 'vue'
import { fromNow } from '@/utils/time'
import { renderEmoji } from '@/utils/emoji'

const props = defineProps({
  comment: { type: Object, required: true },
  depth: { type: Number, default: 0 }
})
defineEmits(['reply'])

const defaultAvatar = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40"><circle cx="20" cy="20" r="20" fill="%23e8e6dd"/></svg>'
const depthStyle = computed(() => ({
  marginLeft: `${Math.min(props.depth, 3) * 24}px`
}))
const renderedContent = computed(() => renderEmoji(props.comment.content, { size: 20 }))
</script>

<style scoped>
.comment-item {
  padding: 16px 0;
  border-bottom: 1px dashed var(--border-soft);
}
.comment-item:last-child {
  border-bottom: none;
}
.comment-head {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 6px;
}
.avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  object-fit: cover;
}
.meta {
  flex: 1;
}
.name {
  font-size: 13px;
  font-weight: 500;
  color: var(--text);
}
.title-tag {
  display: inline-block;
  margin-left: 6px;
  font-size: 11px;
  padding: 1px 6px;
  background: var(--bg-muted);
  color: var(--primary-deep);
  border-radius: 3px;
}
.time {
  font-size: 11px;
  color: var(--text-muted);
}
.reply-btn {
  font-size: 12px;
  color: var(--text-muted);
  background: none;
  border: none;
  cursor: pointer;
}
.reply-btn:hover {
  color: var(--primary);
}
.comment-body {
  font-size: 14px;
  color: var(--text-soft);
  line-height: 1.7;
  padding-left: 48px;
}
.sub-comment {
  margin-left: 24px;
  margin-top: 8px;
  border-left: 2px solid var(--border-soft);
  padding-left: 12px;
}
</style>