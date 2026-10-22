<template>
  <article class="feed-article">
    <!-- 头部：作者信息（头像 / 昵称 / 等级 / 头衔 / 置顶），与动态卡片保持一致 -->
    <div class="fa-head">
      <!-- 作者头像 + 装扮头像框（与侧栏 / 作者主页同一套渲染参数） -->
      <AvatarFrame
        class="fa-avatar"
        :src="author?.avatar || defaultAvatar"
        :frame="author?.json?.frame"
        :frame-hole="frameRender.hole"
        :frame-offset-x="frameRender.offsetX"
        :frame-offset-y="frameRender.offsetY"
        :animated="frameRender.animated"
        :fallback="defaultAvatar"
        :alt="author?.nickname"
        size="40px"
        @click="goAuthor"
      />
      <div class="fa-info">
        <div class="fa-name">
          <span class="fa-name-link" @click="goAuthor">{{ author?.nickname || '匿名' }}</span>
          <span v-if="authorLevel" class="c-level">Lv.{{ authorLevel }}</span>
          <TitleBadge
            v-if="authorTitle || authorTitlePayload"
            :payload="authorTitlePayload || {}"
            :text="authorTitle"
            size="sm"
          />
          <span v-else-if="authorTitle" :class="['c-title', authorTitleClass]">{{ authorTitle }}</span>
          <!-- 佩戴中的勋章（作者信息带 users.json） -->
          <WearingBadge v-if="author?.json?.wearing_badge" :badge="author.json.wearing_badge" />
          <span v-if="article.top" class="fa-top">置顶</span>
        </div>
        <div class="fa-time">
          <span>{{ fromNow(article.publish_time || article.create_time) }}</span>
          <span v-if="groupName" class="fa-group">{{ groupName }}</span>
          <!-- 当前可见范围：仅未登录访客显示 -->
          <ScopeBadge
            v-if="showScopeNotice"
            :scope="article.scope"
            :integral="article.scope_integral"
          />
        </div>
      </div>
    </div>

    <!-- 标题：文章比动态多的信息，点击进详情 -->
    <h3 class="fa-title" @click="goDetail">{{ article.title }}</h3>

    <!-- 正文片段：只展示前面一部分，超出给「查看更多」入口 -->
    <p v-if="previewText" class="fa-body">
      <EmojiText :text="previewText" :size="15" />
    </p>

    <button v-if="hasMore" class="fa-more" type="button" @click="goDetail">
      查看更多
      <i class="bi bi-arrow-right" aria-hidden="true" />
    </button>

    <!-- 封面：有图时按动态图片的方式展示（单图） -->
    <div v-if="cover" class="fa-cover" @click="goDetail">
      <img :src="cover" :alt="article.title" loading="lazy" decoding="async" />
    </div>

    <!-- 操作栏：阅读 / 评论 / 分享（文章列表没有点赞数据，保持轻量） -->
    <div class="fa-actions">
      <span class="fa-stat"><i class="bi bi-eye" aria-hidden="true" /> {{ article.views || 0 }} 阅读</span>
      <span v-if="showComment" class="fa-stat">
        <i class="bi bi-chat-dots" aria-hidden="true" /> {{ commentCount }} 评论
      </span>
      <button class="fa-stat fa-share" type="button" @click="copyLink">
        <i class="bi bi-share" aria-hidden="true" /> 分享
      </button>
    </div>
  </article>
</template>

<script setup>
/**
 * 首页「发现」流里的文章卡片（动态风格）
 *
 * 与 ArticleCard（列表页用的通栏文章行）不同：这里头部是作者信息，正文是文章内容的
 * 纯文本片段，超出部分用「查看更多」引导到详情页，整体观感与 MomentItem 对齐。
 * 只在首页使用，列表页 / 搜索页仍用 ArticleCard。
 */
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { fromNow } from '@/utils/time'
import {
  truncate,
  copyText,
  pickUserLevel,
  pickUserTitle,
  pickUserTitlePayload,
  getTitleColorClass
} from '@/utils/helper'
import { isRichTextEditor } from '@/utils/html'
import { renderMarkdown } from '@/utils/markdown'
import { useUserStore } from '@/stores/user'
import { toast } from '@/utils/toast'
import TitleBadge from './TitleBadge.vue'
import WearingBadge from './WearingBadge.vue'
import EmojiText from './EmojiText.vue'
import ScopeBadge from './ScopeBadge.vue'
import AvatarFrame from './AvatarFrame.vue'
import { resolveFrameRender } from '@/utils/frameRender'

const props = defineProps({
  article: { type: Object, required: true },
  // 正文片段的最大字符数（超出显示「查看更多」）
  textLimit: { type: Number, default: 240 }
})

const router = useRouter()
const userStore = useUserStore()

const defaultAvatar =
  'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40"><circle cx="20" cy="20" r="20" fill="%23e8e6dd"/></svg>'

// 头像加载失败的回退由 AvatarFrame 内部处理（fallback 属性），这里不再需要手动兜底

const author = computed(() => props.article.result?.author || props.article.user || null)
const authorLink = computed(() => {
  const id = author.value?.id || props.article.uid
  return id ? `/author/${id}` : ''
})
const authorLevel = computed(() => pickUserLevel(author.value))
const authorTitle = computed(() => pickUserTitle(author.value))
const authorTitleClass = computed(() => getTitleColorClass(authorTitle.value))
const authorTitlePayload = computed(() => pickUserTitlePayload(author.value))
// 头像框渲染参数（洞大小 / 偏移 / 动效）：以装扮 payload 为准，users.json 副本兜底
const frameRender = computed(() => resolveFrameRender(author.value?.json))

const cover = computed(() => {
  const c = props.article.covers
  if (!c) return ''
  if (Array.isArray(c)) return c[0] || ''
  return String(c).split(',')[0] || ''
})

const groupName = computed(() => {
  const g = props.article.result?.group
  if (!g) return ''
  return (Array.isArray(g) ? g[0] : g)?.name || ''
})

const commentCount = computed(() => props.article.result?.comment?.count || 0)
// json.comment.show 为 2（不显示评论）时，列表里也不展示评论数
const showComment = computed(() => Number(props.article.result?.comment?.show ?? 1) !== 2)

// 可见范围：受限时后端会清空 content（abstract 保留），这里按访客身份提示范围
const scopeLocked = computed(() => {
  const state = props.article.scope_state
  return state === 'login' || state === 'pay'
})
const showScopeNotice = computed(
  () => !userStore.isLogged && Number(props.article.scope) > 1
)

/**
 * 正文转纯文本：富文本直接取 HTML 文本，Markdown 先渲染再去标签，
 * 这样首页不会漏出 **加粗** / # 标题 之类的源码记号。
 */
const plainText = computed(() => {
  const raw = String(props.article.content || '').trim()
  const fallback = String(props.article.abstract || props.article.text || '').trim()
  if (!raw) return fallback

  const html = isRichTextEditor(props.article.editor) ? raw : renderMarkdown(raw)
  const el = document.createElement('div')
  el.innerHTML = html
  return (el.textContent || '').replace(/\s+/g, ' ').trim() || fallback
})

// truncate 会自动去掉残留标签并补 "..."
const previewText = computed(() => truncate(plainText.value, props.textLimit))
const hasMore = computed(() => plainText.value.length > props.textLimit || scopeLocked.value)

function goDetail() {
  router.push(`/archives/${props.article.id}`)
}

function goAuthor() {
  if (authorLink.value) router.push(authorLink.value)
}

async function copyLink() {
  const url = `${window.location.origin}/archives/${props.article.id}`
  const ok = await copyText(`【${props.article.title}】${url}`)
  if (ok) toast.success('已复制链接和标题，去分享吧')
  else toast.error('复制失败，请手动复制')
}
</script>

<style scoped>
/* 与 MomentItem 同款卡片：阴影而不是描边，间距一致 */
.feed-article {
  padding: 20px;
  margin-bottom: 16px;
  background: var(--bg-card);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-sm);
  transition: box-shadow 0.2s;
}
.feed-article:hover {
  box-shadow: var(--shadow);
}

.fa-head {
  display: flex;
  gap: 10px;
  align-items: flex-start;
}
/* 尺寸由 AvatarFrame 的 size 属性控制（inline width/height），这里只管布局与交互 */
.fa-avatar {
  flex-shrink: 0;
  cursor: pointer;
}
.fa-info {
  flex: 1;
  min-width: 0;
}
.fa-name {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 6px;
  font-size: 14px;
  font-weight: 600;
  color: var(--text);
}
.fa-name-link {
  cursor: pointer;
}
.fa-name-link:hover {
  color: var(--primary);
}
/* 等级 / 头衔：与 MomentItem 完全一致（scoped 样式不会跨组件生效，这里必须复制一份） */
.c-level {
  font-size: 11px;
  padding: 1px 6px;
  border-radius: 4px;
  background: var(--accent-soft);
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

.fa-top {
  padding: 1px 6px;
  font-size: 11px;
  font-weight: 400;
  border-radius: 3px;
  background: var(--accent-soft);
  color: var(--accent);
}
.fa-time {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 2px;
  font-size: 12px;
  color: var(--text-muted);
}
.fa-group {
  padding: 0 6px;
  border-radius: 3px;
  background: var(--bg-muted);
  color: var(--text-soft);
}

.fa-title {
  margin: 12px 0 8px;
  font-size: 17px;
  font-weight: 600;
  line-height: 1.45;
  color: var(--text);
  cursor: pointer;
}
.fa-title:hover {
  color: var(--primary);
}

.fa-body {
  margin: 0;
  font-size: 13px;
  line-height: 1.8;
  color: var(--text-soft);
  word-break: break-word;
}

/* 查看更多：轻量文字按钮，与正文左对齐 */
.fa-more {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  margin-top: 8px;
  padding: 0;
  font-size: 12px;
  color: var(--primary);
  background: none;
  border: none;
  cursor: pointer;
}
.fa-more:hover {
  color: var(--primary-deep);
}
.fa-more i {
  font-size: 11px;
}

.fa-cover {
  margin-top: 12px;
  border-radius: var(--radius);
  overflow: hidden;
  cursor: pointer;
  background: var(--bg-muted);
  max-height: 220px;
}
.fa-cover img {
  display: block;
  width: 100%;
  max-height: 220px;
  object-fit: cover;
  transition: transform 0.3s;
}
.fa-cover:hover img {
  transform: scale(1.02);
}

.fa-actions {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px dashed var(--border);
  font-size: 12px;
  color: var(--text-muted);
}
.fa-stat {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}
.fa-share {
  padding: 0;
  font-size: 12px;
  color: var(--text-muted);
  background: none;
  border: none;
  cursor: pointer;
}
.fa-share:hover {
  color: var(--primary);
}
</style>
