<template>
  <div class="moment-card">
    <div class="moment-head">
      <img :src="author?.avatar || defaultAvatar" class="avatar" :alt="author?.nickname" @click="goAuthor" />
      <div class="info">
        <div class="name">
          <span v-if="authorLink" class="name-link" @click="goAuthor">{{ author?.nickname || '匿名' }}</span>
          <span v-else>{{ author?.nickname || '匿名' }}</span>
          <span v-if="authorLevel" class="c-level">Lv.{{ authorLevel }}</span>
          <span v-if="authorTitle" :class="['c-title', authorTitleClass]">{{ authorTitle }}</span>
          <span v-if="moment.top" class="top-tag">置顶</span>
        </div>
        <div class="time">{{ fromNow(moment.create_time) }}</div>
      </div>
      <div v-if="canManage" class="head-actions">
        <button
          class="btn-icon"
          :class="{ active: moment.top }"
          :title="moment.top ? '取消置顶' : '设为置顶'"
          @click="toggleTop"
        ><i class="bi" :class="moment.top ? 'bi-pin-fill' : 'bi-pin'" /></button>
        <button
          class="btn-icon danger"
          title="删除"
          @click="$emit('delete', moment)"
        ><i class="bi bi-x-lg" /></button>
      </div>
    </div>
    <div class="moment-content" v-html="renderedContent"></div>
    <div
      v-if="imageList.length"
      class="moment-images"
      :class="'img-grid-' + getGridType(imageList.length)"
    >
      <img
        v-for="(img, i) in imageList"
        :key="i"
        :src="img"
        class="moment-img"
        loading="lazy"
        decoding="async"
        @click="previewImage(i)"
      />
    </div>
    <div v-if="moment.location" class="moment-loc">
      <i class="bi bi-geo-alt" /> {{ moment.location }}
    </div>
    <div class="moment-actions">
      <button
        ref="likeBtn"
        class="action-item like-btn"
        :class="{ liked }"
        @click="toggleLike"
      >
        <span class="like-heart"><i ref="likeHeart" class="bi" :class="liked ? 'bi-heart-fill' : 'bi-heart'" /></span>
        <span class="like-count">{{ likeCount }}</span>
      </button>
      <button class="action-item" @click="toggleComments">
        <i class="bi bi-chat-dots" /> {{ commentCount }}
        <span v-if="showComments">收起</span>
        <span v-else>评论</span>
      </button>
      <span class="action-item"><i class="bi bi-eye" /> {{ moment.views || 0 }}</span>
    </div>

    <!-- 动态评论 -->
    <div v-if="showComments" class="moment-comments">
      <CommentTree
        :bind-id="moment.id"
        bind-type="moments"
        :author-id="moment.uid"
        @loaded="(n) => commentCount = n"
      />
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { fromNow } from '@/utils/time'
import { isAdmin as helperIsAdmin, pickUserLevel, pickUserTitle, getTitleColorClass } from '@/utils/helper'
import { renderEmojiWithBreaks } from '@/utils/emoji'
import { useUserStore } from '@/stores/user'
import { toast } from '@/utils/toast'
import CommentTree from './CommentTree.vue'
import { call } from '@/api/request'
import { like, unlike, isLiked, likesCount } from '@/api/tags'
import { openLightbox } from '@/utils/lightbox'
import { popIcon, popOut, burstHeart } from '@/utils/likeFx'
import { useRouter } from 'vue-router'

const props = defineProps({
  moment: { type: Object, required: true }
})
const emit = defineEmits(['delete', 'refresh'])

const userStore = useUserStore()
const router = useRouter()

const defaultAvatar = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40"><circle cx="20" cy="20" r="20" fill="%23e8e6dd"/></svg>'

const showComments = ref(false)
const likeBtn = ref(null)
const likeHeart = ref(null)

// 点赞状态（参考 Cardify MomentCard：is-liked + counts 初始化，乐观更新）
const liked = ref(false)
const likeCount = ref(0)

async function loadLikeState() {
  try {
    if (userStore.isLogged) {
      const res = await isLiked('moment', props.moment.id)
      // is-liked 返回 { data: { is_liked, count } }
      liked.value = !!(res?.data?.is_liked ?? res?.data)
      likeCount.value = res?.data?.count ?? res?.data?.total ?? 0
    } else {
      const res = await likesCount('moment', [props.moment.id])
      // counts 返回 { data: { counts: { [id]: n } } }
      const counts = res?.data?.counts || res?.data?.data?.counts || {}
      likeCount.value = counts[props.moment.id] || 0
    }
  } catch {
    /* 保持默认值 */
  }
}

function requireLogin() {
  if (!userStore.isLogged) {
    toast.warning('请先登录')
    router.push({ name: 'login', query: { redirect: router.currentRoute.value.fullPath } })
    return false
  }
  return true
}

async function toggleLike() {
  if (!requireLogin()) return
  // 乐观更新，失败回滚
  const prevLiked = liked.value
  const prevCount = likeCount.value
  liked.value = !prevLiked
  likeCount.value = Math.max(0, prevCount + (liked.value ? 1 : -1))
  // 即时动画 + 消息提示
  if (liked.value) {
    popIcon(likeHeart.value)
    burstHeart(likeBtn.value)
    toast.success('点赞成功')
  } else {
    popOut(likeHeart.value)
    toast.info('已取消点赞')
  }
  try {
    if (liked.value) {
      await like('moment', props.moment.id)
    } else {
      await unlike('moment', props.moment.id)
    }
  } catch {
    liked.value = prevLiked
    likeCount.value = prevCount
    toast.error('操作失败，请重试')
  }
}

// 后端 moments 列表不返回 comment_count，需单独统计。
// 不能用 moments/comment_count：它只统计一级评论（pid=0）。
// 用 comment/count 统计全部评论（含二级及更深的回复），但注意：
// 该接口的 bind_id/bind_type 快捷参数实测无效（会返回全站评论总数），
// 必须走 where 条件过滤，与 countArticlesByAuthor 等先例一致
const commentCount = ref(props.moment.comment_count || 0)
async function loadCommentCount() {
  try {
    const res = await call('comment', 'count', {
      method: 'GET',
      params: {
        where: { bind_id: props.moment.id, bind_type: 'moments' }
      }
    })
    commentCount.value = res.data || 0
  } catch {
    /* 保持现有值 */
  }
}
loadCommentCount()
loadLikeState()

const author = computed(() => props.moment.result?.author || props.moment.user)
// 作者信息：等级/头衔 + 跳转作者主页（与评论一致）
const authorLink = computed(() => {
  const id = author.value?.id || props.moment.uid
  return id ? `/author/${id}` : ''
})
const authorLevel = computed(() => pickUserLevel(author.value))
const authorTitle = computed(() => pickUserTitle(author.value))
const authorTitleClass = computed(() => getTitleColorClass(authorTitle.value))
function goAuthor() {
  if (authorLink.value) router.push(authorLink.value)
}
// 图片字段可能是数组、逗号分隔字符串或空
function parseImages(field) {
  if (!field) return []
  if (Array.isArray(field)) return field.filter(Boolean)
  return String(field)
    .split(/[,|]/)
    .map((s) => s.trim())
    .filter(Boolean)
}
const imageList = computed(() => parseImages(props.moment.images))
const renderedContent = computed(() => renderEmojiWithBreaks(props.moment.content))

// 多图网格类型：1 单图大图 / 2-3 三列 / 4 两列 / 5-9 九宫格
function getGridType(count) {
  if (count === 1) return '1'
  if (count <= 3) return '3'
  if (count <= 4) return '4'
  return '9'
}

const canDelete = computed(() => {
  return userStore.user?.id === props.moment.uid || helperIsAdmin(userStore.user)
})

// 仅管理员可置顶/删除（置顶按钮在删除按钮之前）
const canManage = computed(() => helperIsAdmin(userStore.user))

async function toggleTop() {
  const next = props.moment.top ? 0 : 1
  try {
    await call('moments', 'set_top', {
      method: 'PUT',
      data: { ids: String(props.moment.id), top: next }
    })
    props.moment.top = next
    toast.success(next ? '已设为置顶' : '已取消置顶')
    emit('refresh')
  } catch {
    /* 拦截器已提示 */
  }
}

function toggleComments() {
  showComments.value = !showComments.value
}

function previewImage(i) {
  openLightbox(imageList.value, i)
}
</script>

<style scoped>
.moment-card {
  background: var(--bg-card);
  border-radius: var(--radius-lg);
  border: 1px solid var(--border-soft);
  padding: 20px;
  margin-bottom: 16px;
  transition: box-shadow 0.2s;
}
.moment-card:hover {
  box-shadow: var(--shadow);
}
.moment-head {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
}
.avatar {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  object-fit: cover;
  cursor: pointer;
}
.info {
  flex: 1;
  min-width: 0;
}
.name {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 14px;
  font-weight: 500;
  flex-wrap: wrap;
}
.name-link {
  cursor: pointer;
  transition: color 0.2s;
}
.name-link:hover {
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
.top-tag {
  display: inline-block;
  margin-left: 6px;
  font-size: 11px;
  padding: 1px 6px;
  background: rgba(192, 57, 43, 0.1);
  color: var(--accent);
  border-radius: 3px;
}
.time {
  font-size: 12px;
  color: var(--text-muted);
}
.head-actions {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-left: auto;
}
.btn-icon {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: var(--bg-muted);
  color: var(--text-muted);
  cursor: pointer;
  font-size: 15px;
  line-height: 1;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: none;
}
.btn-icon:hover {
  background: var(--primary);
  color: #fff;
}
.btn-icon.danger:hover {
  background: var(--danger);
  color: #fff;
}
.btn-icon.active {
  background: var(--accent);
  color: #fff;
}
.btn-icon:hover {
  background: var(--danger);
  color: #fff;
}

.moment-content {
  font-size: 14px;
  line-height: 1.7;
  color: var(--text);
  margin-bottom: 12px;
  white-space: pre-wrap;
  word-break: break-word;
}
.moment-images {
  display: grid;
  gap: 6px;
  margin-bottom: 12px;
}
.moment-images.img-grid-1 {
  grid-template-columns: 1fr;
  max-width: 320px;
}
.moment-images.img-grid-3 {
  grid-template-columns: repeat(3, 1fr);
  max-width: 320px;
}
.moment-images.img-grid-4 {
  grid-template-columns: repeat(2, 1fr);
  max-width: 320px;
}
.moment-images.img-grid-9 {
  grid-template-columns: repeat(3, 1fr);
  max-width: 420px;
}
.moment-img {
  width: 100%;
  aspect-ratio: 1;
  object-fit: cover;
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition: transform 0.2s;
  background: var(--bg-muted);
}
.img-grid-1 .moment-img {
  width: auto;
  max-height: 260px;
  aspect-ratio: auto;
  object-fit: contain;
  justify-self: center;
  background: none;
}
.moment-img:hover {
  transform: scale(1.02);
}
.moment-loc {
  font-size: 12px;
  color: var(--text-muted);
  margin-bottom: 12px;
}
.moment-actions {
  display: flex;
  gap: 16px;
  padding-top: 12px;
  border-top: 1px dashed var(--border-soft);
  font-size: 12px;
  color: var(--text-muted);
}
.action-item {
  cursor: pointer;
  border: none;
  background: none;
  color: inherit;
  font: inherit;
  padding: 0;
}
.action-item:hover {
  color: var(--primary);
}
.like-btn {
  position: relative;
}
.action-item .like-heart {
  display: inline-block;
  font-size: 13px;
  margin-right: 3px;
  transition: transform 0.2s;
}
.action-item.liked {
  color: var(--accent);
}
.action-item.liked .like-heart {
  transform: scale(1.2);
}
.moment-comments {
  margin-top: 14px;
  padding-top: 14px;
  border-top: 1px solid var(--border-soft);
}
.moment-comment-box {
  margin-top: 12px;
}
.moment-comment-input {
  width: 100%;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 8px 10px;
  font-size: 13px;
  font-family: inherit;
  resize: vertical;
  background: var(--bg);
  color: var(--text);
}
.moment-comment-input:focus {
  outline: none;
  border-color: var(--primary);
}
.moment-comment-actions {
  display: flex;
  justify-content: flex-end;
  margin-top: 6px;
}
</style>
