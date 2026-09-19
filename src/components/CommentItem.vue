<template>
  <div class="comment-item" :id="`comment-${comment.id}`" :class="{ 'is-child': isChild, 'comment-highlight': highlightId && String(highlightId) === String(comment.id) }">
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
      </div>

      <div class="c-content" :class="{ 'c-content-link': authorLink }" v-html="renderedContent" @click="goAuthor"></div>

      <!-- 评论图片 -->
      <div v-if="images.length" class="c-images">
        <img
          v-for="(img, i) in images"
          :key="img"
          class="c-img"
          :src="img"
          alt="评论图片"
          loading="lazy"
          @click="preview(i)"
          @error="onImgError"
        />
      </div>

      <div class="c-actions">
        <button ref="likeBtn" class="c-action like-btn" :class="{ active: comment.liked }" @click="$emit('like', comment)">
          <span class="c-icon"><i ref="likeIcon" class="bi" :class="comment.liked ? 'bi-heart-fill' : 'bi-heart'" /></span>
          <span>{{ comment.likeCount || 0 }}</span>
        </button>
        <button v-if="allowComment" class="c-action" @click="$emit('reply', comment)">
          <span class="c-icon"><i class="bi bi-chat-dots" /></span> 回复
        </button>
        <button v-if="canDelete" class="c-action c-del" @click="$emit('remove', comment)">删除</button>
      </div>

      <!-- 回复框（禁止评论时不展示） -->
      <div v-if="allowComment && replyTo && replyTo.id === comment.id" class="c-reply-box">
        <EmojiEditor
          v-model="replyText"
          :placeholder="`回复 @${replyTo.name}：`"
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
        <div v-if="replyImages.length" class="c-reply-images">
          <div v-for="(img, i) in replyImages" :key="img" class="reply-thumb">
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
        <div class="c-reply-actions">
          <span v-if="replyImages.length" class="img-tip">已选 {{ replyImages.length }} 张</span>
          <button class="btn btn-sm" @click="cancelReply">取消</button>
          <button
            class="btn btn-primary btn-sm"
            :disabled="(!replyText.trim() && !replyImages.length) || uploading"
            @click="submitReply"
          >
            发送
          </button>
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
          :allow-comment="allowComment"
          :reply-to="replyTo"
          :highlight-id="highlightId"
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
import { uploadCommentImages } from '@/api/comment'
import { openLightbox } from '@/utils/lightbox'
import { toast } from '@/utils/toast'

const props = defineProps({
  comment: { type: Object, required: true },
  bindType: { type: String, default: 'article' },
  isChild: { type: Boolean, default: false },
  authorId: { type: [String, Number], default: null },
  replyTo: { type: Object, default: null },
  highlightId: { type: [String, Number], default: null },
  // 是否允许评论：false 时隐藏「回复」按钮与回复框
  allowComment: { type: Boolean, default: true }
})

const emit = defineEmits(['like', 'reply', 'submit', 'remove'])

const userStore = useUserStore()
const router = useRouter()
const defaultAvatar = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40"><circle cx="20" cy="20" r="20" fill="%23e8e6dd"/></svg>'
const replyText = ref('')

// 后端把评论作者放在 result.author
const author = computed(() => pickCommentAuthor(props.comment))
const renderedContent = computed(() => renderEmojiWithBreaks(props.comment.content))

// 评论图片：后端以逗号分隔字符串存储，这里统一解析为数组，兼容数组形式
const images = computed(() => {
  const raw = props.comment.images
  if (!raw) return []
  const list = Array.isArray(raw) ? raw : String(raw).split(',')
  return list.map((s) => String(s).trim()).filter(Boolean)
})

// 点击图片打开系统全局灯箱（支持左右切换、缩放、键盘操作）
function preview(index) {
  openLightbox(images.value, index)
}

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

const replyImages = ref([])
const uploading = ref(false)
const fileInput = ref(null)

async function onPickImages(e) {
  const files = Array.from(e.target.files || [])
  e.target.value = ''
  if (!files.length) return

  if (replyImages.value.length + files.length > 9) {
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
    replyImages.value.push(...urls)
    if (results.some((r) => r.status === 'fail')) toast.warning('部分图片上传失败')
  } catch {
    /* 拦截器已提示 */
  } finally {
    uploading.value = false
  }
}

function removeImage(i) {
  replyImages.value.splice(i, 1)
}

function cancelReply() {
  replyText.value = ''
  replyImages.value = []
  emit('reply', { id: null })
}

function submitReply() {
  if (!replyText.value.trim() && !replyImages.value.length) return
  emit('submit', {
    content: replyText.value.trim(),
    images: [...replyImages.value],
    pid: props.comment.id
  })
  replyText.value = ''
  replyImages.value = []
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
  /* 横向 8px 保持昵称/等级/头衔之间呼吸感，纵向 2px 收紧昵称与日期两行间距 */
  gap: 2px 8px;
  font-size: 13px;
  flex-wrap: wrap;
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
.c-badge {
  font-size: 10px;
  padding: 0 5px;
  border-radius: 3px;
  background: var(--accent-soft);
  color: var(--accent);
}
.c-time {
  color: var(--text-muted);
  font-size: 13px;
  font-weight: 500;
  line-height: 1.3;
  font-variant-numeric: tabular-nums;
  flex-basis: 100%; /* 日期独占一行，显示在昵称下面 */
}
.c-del {
  color: var(--text-muted);
  font-size: 13px;
}
.c-del:hover {
  color: var(--accent);
}
.c-content {
  font-size: 15px;
  line-height: 1.7;
  color: var(--text-soft);
  margin: 8px 0;
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
  font-size: 13px;
  font-weight: 500;
  font-variant-numeric: tabular-nums;
  cursor: pointer;
  padding: 0;
  transition: color var(--dur) var(--ease);
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
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 6px;
}

/* ===== 评论图片 ===== */
.c-images {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin: 8px 0;
}
.c-img {
  width: 88px;
  height: 88px;
  object-fit: cover;
  border-radius: var(--radius-xs);
  border: 1px solid var(--border);
  cursor: zoom-in;
  transition: transform var(--dur) var(--ease), box-shadow var(--dur) var(--ease);
}
.c-img:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow);
}

/* ===== 回复框图片上传 ===== */
.hidden-file {
  display: none;
}
.img-tip {
  font-size: 12px;
  color: var(--text-muted);
  margin-right: auto;
}
.c-reply-images {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 8px;
}
.reply-thumb {
  position: relative;
  width: 56px;
  height: 56px;
  border-radius: var(--radius-xs);
  overflow: hidden;
  border: 1px solid var(--border);
}
.reply-thumb img {
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
.c-children {
  margin-top: 12px;
  padding-left: 14px;
  border-left: 2px solid var(--border);
}

/* ========== 移动端适配 ========== */
@media (max-width: 768px) {
  .comment-item {
    gap: 10px;
    padding: 14px 0;
  }
  .c-avatar img {
    width: 36px;
    height: 36px;
  }
  .c-time {
    font-size: 12px;
  }
  /* 子评论缩进收紧，更适配窄屏 */
  .c-children {
    padding-left: 10px;
  }
}
</style>
