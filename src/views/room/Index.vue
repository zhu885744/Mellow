<template>
  <div class="room-app">
    <!-- ==================== 顶部：房间资料 ==================== -->
    <header class="room-head">
      <RouterLink to="/messages" class="room-icon-btn" title="返回私信">
        <i class="bi bi-chevron-left" aria-hidden="true" />
      </RouterLink>

      <span class="room-avatar">
        <img v-if="room.avatar" :src="fullUrl(room.avatar)" alt="" loading="lazy" />
        <i v-else class="bi bi-people-fill" aria-hidden="true" />
      </span>

      <div class="room-title">
        <h1>{{ room.name || '公共聊天室' }}</h1>
        <p>{{ room.description || '全站用户都在这里，随便聊点什么' }}</p>
      </div>

      <div class="room-actions">
        <span v-if="muted" class="room-mute-tag" :title="muteTip">
          <i class="bi bi-mic-mute" aria-hidden="true" />已禁言
        </span>
        <button v-if="isAdmin" type="button" class="room-btn" @click="openAdmin">
          <i class="bi bi-sliders2" aria-hidden="true" />管理
        </button>
        <RouterLink to="/" class="room-icon-btn" title="返回站点">
          <i class="bi bi-box-arrow-up-left" aria-hidden="true" />
        </RouterLink>
      </div>
    </header>

    <!-- ==================== 消息 ==================== -->
    <div ref="bodyRef" class="room-body">
      <div v-if="loading && !messages.length" class="room-tip">加载中…</div>

      <button
        v-else-if="hasMore"
        type="button"
        class="room-more"
        :disabled="loading"
        @click="loadHistory(messages[0]?.id)"
      >
        <i class="bi bi-clock-history" aria-hidden="true" />加载更早的消息
      </button>

      <template v-for="row in rows" :key="row.key">
        <div v-if="row.type === 'day'" class="room-day"><span>{{ row.label }}</span></div>

        <div
          v-else
          class="room-msg"
          :class="{ 'is-mine': isMine(row.msg) }"
          @contextmenu.prevent="openMessageMenu($event, row.msg)"
        >
          <button
            type="button"
            class="room-msg-avatar"
            :title="isAdmin && !isMine(row.msg) ? '管理该用户' : ''"
            @click="onAvatarClick(row.msg)"
          >
            <img :src="avatarOf(row.msg)" :alt="nameOf(row.msg)" loading="lazy" />
          </button>

          <div class="room-msg-main">
            <div class="room-msg-meta">
              <span class="room-msg-name">{{ isMine(row.msg) ? '我' : nameOf(row.msg) }}</span>
              <time>{{ shortTime(row.msg.create_time) }}</time>
              <button
                v-if="canRevoke(row.msg)"
                type="button"
                class="room-msg-revoke"
                @click="revoke(row.msg)"
              >撤回</button>
            </div>

            <div class="room-bubble" :class="{ 'is-revoked': row.msg.is_revoked === 1 }">
              <template v-if="row.msg.is_revoked === 1">
                该消息已被{{ Number(row.msg.revoke_uid) === Number(row.msg.uid) ? '' : '管理员' }}撤回
              </template>
              <template v-else>
                <!-- 引用回复：展示被引用消息的快照（原消息撤回后依然可读） -->
                <div v-if="row.msg.quote" class="room-quote" :title="quoteTitle(row.msg.quote)">
                  <span class="room-quote-name">{{ quoteName(row.msg.quote) }}</span>
                  <span
                    class="room-quote-text"
                    v-html="renderEmojiWithBreaks(quotePreview(row.msg.quote), { size: 16 })"
                  />
                </div>
                <img
                  v-if="row.msg.msg_type === 'image'"
                  class="room-image"
                  :src="fullUrl(row.msg.content)"
                  alt="图片消息"
                  loading="lazy"
                  @click="openLightbox([fullUrl(row.msg.content)])"
                />
                <span v-else class="room-text" v-html="renderEmojiWithBreaks(row.msg.content, { size: 22 })" />
              </template>
            </div>
          </div>
        </div>
      </template>

      <p v-if="!loading && !messages.length" class="room-tip">还没有人说话，来打个招呼吧</p>
    </div>

    <!-- ==================== 输入 ==================== -->
    <footer class="room-composer">
      <p v-if="muted" class="room-blocked">
        <i class="bi bi-mic-mute" aria-hidden="true" />{{ muteTip }}
      </p>

      <form v-else class="room-composer-box" @submit.prevent="send">
        <!-- 引用态：显示被引用消息的摘要，发送后自动清除 -->
        <div v-if="quoteDraft" class="room-quote-draft">
          <div class="room-quote-draft-body">
            <span class="room-quote-name">{{ quoteName(quoteDraft) }}</span>
            <span
              class="room-quote-text"
              v-html="renderEmojiWithBreaks(quotePreview(quoteDraft), { size: 16 })"
            />
          </div>
          <button type="button" class="room-icon-btn" title="取消引用" @click="clearQuote">
            <i class="bi bi-x-lg" aria-hidden="true" />
          </button>
        </div>

        <div class="room-tools">
          <div class="room-emoji-wrap">
            <button type="button" class="room-icon-btn" title="插入表情" @click="emojiOpen = !emojiOpen">
              <i class="bi bi-emoji-smile" aria-hidden="true" />
            </button>
            <EmojiPicker v-model="emojiOpen" @select="insertEmoji" />
          </div>

          <button
            type="button"
            class="room-icon-btn"
            :title="uploading ? '图片上传中…' : '发送图片'"
            :disabled="uploading"
            @click="pickImage"
          >
            <i :class="uploading ? 'bi bi-arrow-repeat is-spin' : 'bi bi-image'" aria-hidden="true" />
          </button>
          <input
            ref="fileRef"
            class="room-file"
            type="file"
            accept="image/*"
            multiple
            @change="onFilesPicked"
          />
        </div>

        <textarea
          ref="inputRef"
          v-model="draft"
          class="room-input"
          rows="1"
          maxlength="2000"
          placeholder="说点什么…"
          @keydown.enter.exact.prevent="send"
          @paste="onPaste"
        />

        <button type="submit" class="room-send" :disabled="sending || !draft.trim()" title="发送">
          <i :class="sending ? 'bi bi-arrow-repeat is-spin' : 'bi bi-arrow-up-short'" aria-hidden="true" />
        </button>
      </form>
    </footer>

    <!-- ==================== 管理面板（仅超级管理员） ==================== -->
    <div v-if="adminOpen" class="room-admin">
      <div class="room-admin-mask" @click="adminOpen = false" />

      <aside class="room-admin-panel">
        <header class="room-admin-head">
          <span>聊天室管理</span>
          <button type="button" class="room-icon-btn" title="关闭" @click="adminOpen = false">
            <i class="bi bi-x-lg" aria-hidden="true" />
          </button>
        </header>

        <div class="room-admin-tabs">
          <button
            type="button"
            :class="['room-admin-tab', { 'is-active': adminTab === 'profile' }]"
            @click="adminTab = 'profile'"
          >房间资料</button>
          <button
            type="button"
            :class="['room-admin-tab', { 'is-active': adminTab === 'mutes' }]"
            @click="switchMutes"
          >禁言名单{{ mutes.length ? ` (${mutes.length})` : '' }}</button>
          <button
            type="button"
            :class="['room-admin-tab', { 'is-active': adminTab === 'clear' }]"
            @click="switchClear"
          >自动清空</button>
        </div>

        <div v-if="adminTab === 'profile'" class="room-admin-body">
          <label class="room-field">
            <span>名称</span>
            <input v-model="form.name" maxlength="30" placeholder="最多 30 个字" />
          </label>

          <label class="room-field">
            <span>简介</span>
            <textarea v-model="form.description" rows="3" maxlength="200" placeholder="最多 200 个字" />
          </label>

          <label class="room-field">
            <span>头像</span>
            <div class="room-avatar-row">
              <span class="room-avatar room-avatar-sm">
                <img v-if="form.avatar" :src="fullUrl(form.avatar)" alt="" />
                <i v-else class="bi bi-image" aria-hidden="true" />
              </span>
              <input v-model="form.avatar" placeholder="图片地址，或直接上传" />
            </div>
          </label>

          <div class="room-admin-actions">
            <button type="button" class="room-btn" :disabled="avatarUploading" @click="pickAvatar">
              <i :class="avatarUploading ? 'bi bi-arrow-repeat is-spin' : 'bi bi-upload'" aria-hidden="true" />
              上传头像
            </button>
            <button type="button" class="room-btn room-btn-primary" :disabled="saving" @click="saveRoom">
              {{ saving ? '保存中…' : '保存修改' }}
            </button>
          </div>

          <input ref="avatarInput" class="room-file" type="file" accept="image/*" @change="onAvatarPicked" />
        </div>

        <div v-else-if="adminTab === 'mutes'" class="room-admin-body">
          <div v-for="item in mutes" :key="item.uid" class="room-mute-row">
            <img class="room-mute-avatar" :src="avatarOfUser(item.user)" alt="" loading="lazy" />
            <span class="room-mute-name">{{ item.user?.nickname || `用户 #${item.uid}` }}</span>
            <em>{{ untilText(item.until) }}</em>
            <button type="button" class="room-btn room-btn-sm" @click="unmute(item.uid)">解除</button>
          </div>

          <p v-if="!mutes.length" class="room-tip">当前没有被禁言的用户</p>
        </div>

        <div v-else class="room-admin-body">
          <label class="room-field">
            <span>清空间隔</span>
            <SelectMenu
              v-model="clearDays"
              variant="field"
              :options="clearOptions"
              placeholder="请选择清空间隔"
            />
          </label>

          <p class="room-tip">
            到期后服务端会直接删除公共聊天室的全部消息（物理删除，无法恢复）。
            默认每 3 天（72 小时）清空一次。
          </p>

          <p class="room-tip">
            上次清空：{{ clearInfo.last_time ? formatTime(clearInfo.last_time) : '尚未清空过（首次计时中）' }}<br />
            下次清空：{{ clearInfo.next_time ? formatTime(clearInfo.next_time) : '保存后按间隔计算' }}<br />
            上次清空条数：{{ clearInfo.last_count || 0 }}
          </p>

          <div class="room-admin-actions">
            <button
              type="button"
              class="room-btn room-btn-primary"
              :disabled="clearSaving"
              @click="saveAutoClear"
            >{{ clearSaving ? '保存中…' : '保存设置' }}</button>
          </div>
        </div>
      </aside>
    </div>

    <!-- ==================== 管理员点用户头像：禁言操作 ==================== -->
    <div v-if="userPanel" class="room-modal">
      <div class="room-modal-mask" @click="userPanel = null" />
      <div class="room-modal-card">
        <div class="room-modal-user">
          <img :src="avatarOfUser({ avatar: userPanel.avatar })" alt="" />
          <span>{{ userPanel.nickname }}</span>
        </div>
        <p class="room-modal-tip">禁言后该用户不能发言，已在列表中的消息保留</p>
        <div class="room-modal-actions">
          <button type="button" class="room-btn" @click="mute(userPanel.uid, 10)">禁言 10 分钟</button>
          <button type="button" class="room-btn" @click="mute(userPanel.uid, 60)">禁言 1 小时</button>
          <button type="button" class="room-btn" @click="mute(userPanel.uid, 1440)">禁言 1 天</button>
          <button type="button" class="room-btn room-btn-danger" @click="mute(userPanel.uid, 0)">永久禁言</button>
        </div>
      </div>
    </div>

    <!-- ==================== 消息右键菜单 ==================== -->
    <div
      v-if="messageMenu.open"
      class="room-menu-mask"
      @click="closeMessageMenu"
      @contextmenu.prevent="closeMessageMenu"
    />
    <div
      v-if="messageMenu.open"
      class="room-menu"
      role="menu"
      :style="{ left: `${messageMenu.x}px`, top: `${messageMenu.y}px` }"
    >
      <button
        v-if="messageMenu.msg?.is_revoked !== 1"
        type="button"
        class="room-menu-item"
        role="menuitem"
        @click="quoteMessage(messageMenu.msg)"
      >
        <i class="bi bi-quote" aria-hidden="true" />引用消息
      </button>
      <button
        v-if="canRevoke(messageMenu.msg)"
        type="button"
        class="room-menu-item"
        role="menuitem"
        @click="revokeFromMenu(messageMenu.msg)"
      >
        <i class="bi bi-arrow-counterclockwise" aria-hidden="true" />撤回消息
      </button>
      <button
        type="button"
        class="room-menu-item is-danger"
        role="menuitem"
        @click="deleteFromMenu(messageMenu.msg)"
      >
        <i class="bi bi-trash3" aria-hidden="true" />删除消息
      </button>
      <button type="button" class="room-menu-item" role="menuitem" @click="copyMessage(messageMenu.msg)">
        <i class="bi bi-clipboard" aria-hidden="true" />复制
      </button>
    </div>
  </div>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import {
  deleteRoomMessage,
  getRoomAutoClear,
  getRoomInfo,
  listRoomMessages,
  listRoomMutes,
  muteRoomUser,
  revokeRoomMessage,
  saveRoomAutoClear,
  sendRoomMessage,
  unmuteRoomUser,
  updateRoom
} from '@/api/room'
import { uploadAttachments } from '@/api/attachment'
import { useChatStore } from '@/stores/chat'
import { useUserStore } from '@/stores/user'
import { toast } from '@/utils/toast'
import { fromNow, formatTime } from '@/utils/time'
import { openLightbox } from '@/utils/lightbox'
import { getFullUrl, renderEmojiWithBreaks } from '@/utils/emoji'
import EmojiPicker from '@/components/EmojiPicker.vue'
import SelectMenu from '@/components/SelectMenu.vue'

/**
 * 公共聊天室（/room/1）
 *
 * 与私信页的关系：
 *   - 复用同一套视觉与输入体验（表情 / 图片 / 粘贴上传），但群聊没有「已读 / 未读」，
 *     只 maintain 一条全局时间线，所以不复用 stores/chat 的会话逻辑；
 *   - 实时消息走同一个 WebSocket：stores/chat.js 把 room* 事件原样转给 onEvent，
 *     这里订阅后做「上屏 / 撤回 / 改资料 / 被禁言」四种处理。
 *
 * 权限：
 *   - 所有登录用户：看消息、发言、2 分钟内撤回自己的消息；
 *   - 超级管理员（后端 model.IsRootAdmin）：撤回任意消息、禁言 / 解禁、改名称 / 简介 / 头像。
 *     前端的 is_admin 只用来决定「按钮要不要显示」，真正的校验在后端。
 */
const route = useRoute()
const userStore = useUserStore()
const chatStore = useChatStore()

const roomId = computed(() => Number(route.params.id || 1) || 1)

const room = ref({})
const messages = ref([])
const hasMore = ref(false)
const loading = ref(false)

const isAdmin = ref(false)
const muted = ref(false)
const mutedUntil = ref(0)

const draft = ref('')
const sending = ref(false)
const uploading = ref(false)
const emojiOpen = ref(false)

// 引用态：当前正在引用的消息（null = 未引用）
const quoteDraft = ref(null)
// 消息右键菜单：open / 坐标 / 目标消息
const messageMenu = ref({ open: false, x: 0, y: 0, msg: null })

const bodyRef = ref(null)
const inputRef = ref(null)
const fileRef = ref(null)

// 管理面板
const adminOpen = ref(false)
const adminTab = ref('profile')
const mutes = ref([])
const saving = ref(false)
const avatarUploading = ref(false)
const avatarInput = ref(null)
const form = ref({ name: '', description: '', avatar: '' })

// 自动清空：默认 3 天（72 小时），其余选项与后端 model.RoomAutoClearOptions 对齐
const clearOptions = [
  { value: 1, label: '1 天' },
  { value: 3, label: '3 天（默认，72 小时）' },
  { value: 7, label: '1 星期' },
  { value: 30, label: '30 天' },
  { value: 182, label: '半年' },
  { value: 365, label: '一年' }
]
const clearDays = ref(3)
const clearSaving = ref(false)
const clearInfo = ref({ days: 3, last_time: 0, last_count: 0, next_time: 0 })

// 管理员点某条消息头像后弹出的用户操作
const userPanel = ref(null)

const me = computed(() => Number(userStore.user?.id || 0))
const muteTip = computed(() => {
  if (!muted.value) return ''
  if (mutedUntil.value > 0) return `你已被禁言，${formatTime(mutedUntil.value)} 解除`
  return '你已被禁言，暂时不能发言'
})

// 没有头像时的占位图：内联 SVG，省一次 404
const DEFAULT_AVATAR =
  'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 80"><circle cx="40" cy="40" r="40" fill="%23e8e6dd"/><text x="50%25" y="55%25" text-anchor="middle" font-size="34" fill="%238a8a82" font-family="serif">聊</text></svg>'

function fullUrl(url) {
  return getFullUrl(url || '')
}

function isMine(msg) {
  return Number(msg.uid) === me.value
}

function nameOf(msg) {
  return msg.user?.nickname || `用户 #${msg.uid}`
}

/** 头像地址：空值统一走占位图，避免 img src="" 又请求一次当前页面 */
function avatarOfUser(user) {
  const avatar = user?.avatar || ''
  return avatar ? getFullUrl(avatar) : DEFAULT_AVATAR
}

function avatarOf(msg) {
  return avatarOfUser(msg.user)
}

/** 本人 2 分钟内可撤回；管理员对任何未撤回消息都可撤回（与后端规则一致） */
function canRevoke(msg) {
  if (!msg || msg.is_revoked === 1) return false
  if (isAdmin.value) return true
  if (!isMine(msg)) return false
  return Date.now() / 1000 - Number(msg.create_time || 0) <= 120
}

// ---------- 引用回复 ----------

/**
 * 被引用消息的展示名：自己 / 对方
 *
 * quote 快照里只有 uid，没有昵称；这里从当前时间线里反查一次发送者昵称，
 * 找不到再退回「用户 #uid」。兼容引用态传来的整条消息（from_uid → uid）。
 */
function quoteName(quote) {
  if (!quote) return ''

  const uid = Number(quote.uid ?? quote.from_uid ?? 0)
  if (uid === me.value) return '我'
  if (quote.nickname) return quote.nickname

  const found = messages.value.find((item) => Number(item.uid) === uid && item.user?.nickname)
  return found?.user?.nickname || `用户 #${uid}`
}

/** 被引用消息的摘要：服务端已落快照，这里只做类型兜底 */
function quotePreview(quote) {
  if (!quote) return ''
  if (quote.msg_type === 'image') return '[图片]'
  return String(quote.content || '')
}

function quoteTitle(quote) {
  return quotePreview(quote).replace(/\[emoji:[^\]]+\]/g, '[表情]')
}

function clearQuote() {
  quoteDraft.value = null
}

// ---------- 消息右键菜单 ----------

/** 打开右键菜单：坐标按视口夹紧，避免贴边时菜单跑出屏幕 */
function openMessageMenu(event, msg) {
  if (!msg?.id) return

  const width = 148
  const height = canRevoke(msg) ? 172 : 138
  const x = Math.min(Number(event.clientX) || 0, window.innerWidth - width - 8)
  const y = Math.min(Number(event.clientY) || 0, window.innerHeight - height - 8)

  messageMenu.value = { open: true, x: Math.max(8, x), y: Math.max(8, y), msg }
}

function closeMessageMenu() {
  if (!messageMenu.value.open) return
  messageMenu.value = { ...messageMenu.value, open: false, msg: null }
}

function quoteMessage(msg) {
  closeMessageMenu()
  if (!msg?.id) return

  // 带上昵称：引用态立即可读，不必等 quoteName 去时间线里反查
  quoteDraft.value = { ...msg, nickname: nameOf(msg) }
  nextTick(() => inputRef.value?.focus())
}

function revokeFromMenu(msg) {
  closeMessageMenu()
  revoke(msg)
}

async function deleteFromMenu(msg) {
  closeMessageMenu()
  if (!msg?.id) return

  try {
    const res = await deleteRoomMessage(msg.id)
    if (res?.code !== 200) return

    messages.value = messages.value.filter((item) => Number(item.id) !== Number(msg.id))
    if (Number(quoteDraft.value?.id) === Number(msg.id)) clearQuote()
    toast.success('已删除')
  } catch {
    /* 业务错误已由 request.js 统一提示 */
  }
}

/** 复制：文本去掉 [emoji:url] 标记，图片复制地址 */
async function copyMessage(msg) {
  closeMessageMenu()
  if (!msg) return

  let text = ''
  if (msg.is_revoked === 1) {
    text = `该消息已被${Number(msg.revoke_uid) === Number(msg.uid) ? '' : '管理员'}撤回`
  } else if (msg.msg_type === 'image') {
    text = fullUrl(msg.content)
  } else {
    text = String(msg.content || '').replace(/\[emoji:[^\]]+\]/g, '[表情]')
  }

  if (!text) return

  try {
    await navigator.clipboard.writeText(text)
    toast.success('已复制')
  } catch {
    // 非 HTTPS / 无剪贴板权限：退回 textarea + execCommand
    const el = document.createElement('textarea')
    el.value = text
    el.setAttribute('readonly', '')
    el.style.position = 'fixed'
    el.style.opacity = '0'
    document.body.appendChild(el)
    el.select()
    try {
      document.execCommand('copy')
      toast.success('已复制')
    } catch {
      toast.warning('复制失败，请手动选择文字')
    }
    document.body.removeChild(el)
  }
}

function onMenuKeydown(e) {
  if (e.key === 'Escape') closeMessageMenu()
}

function onMenuScroll() {
  closeMessageMenu()
}

// ---------- 时间 ----------

function shortTime(ts) {
  if (!ts) return ''
  const diff = Date.now() / 1000 - Number(ts)
  if (diff < 60) return '刚刚'
  if (diff < 86400) return fromNow(ts)
  return formatTime(ts).slice(5, 16)
}

function untilText(until) {
  const value = Number(until) || 0
  if (value <= 0) return '永久'
  return `${formatTime(value)} 解除`
}

function dayKey(ts) {
  const value = Number(ts) || 0
  if (value <= 0) return ''
  const date = new Date(value * 1000)
  return `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`
}

function dayLabel(ts) {
  const value = Number(ts) || 0
  if (value <= 0) return ''

  const date = new Date(value * 1000)
  const now = new Date()
  const startOf = (item) => new Date(item.getFullYear(), item.getMonth(), item.getDate()).getTime()
  const diffDays = Math.round((startOf(now) - startOf(date)) / 86400000)

  if (diffDays === 0) return '今天'
  if (diffDays === 1) return '昨天'
  if (date.getFullYear() === now.getFullYear()) return `${date.getMonth() + 1} 月 ${date.getDate()} 日`
  return `${date.getFullYear()} 年 ${date.getMonth() + 1} 月 ${date.getDate()} 日`
}

/** 按天分段：跨天插日期分隔，长记录更容易定位 */
const rows = computed(() => {
  const list = []
  let lastDay = ''

  messages.value.forEach((msg) => {
    const day = dayKey(msg.create_time)
    if (day && day !== lastDay) {
      list.push({ type: 'day', key: `day-${day}-${msg.id}`, label: dayLabel(msg.create_time) })
      lastDay = day
    }
    list.push({ type: 'msg', key: `msg-${msg.id}`, msg })
  })

  return list
})

// ---------- 数据 ----------

function scrollToBottom() {
  nextTick(() => {
    const el = bodyRef.value
    if (el) el.scrollTop = el.scrollHeight
  })
}

function maxSeq(list) {
  let max = 0
  ;(list || []).forEach((item) => {
    const seq = Number(item.seq || item.id) || 0
    if (seq > max) max = seq
  })
  return max
}

/** 合并去重（实时推送与历史/补拉可能先后到达同一条） */
function mergeMessages(list) {
  if (!list?.length) return 0

  const seen = new Set(messages.value.map((item) => Number(item.id)))
  const added = list.filter((item) => item && item.id && !seen.has(Number(item.id)))
  if (!added.length) return 0

  messages.value = [...messages.value, ...added].sort(
    (a, b) => Number(a.seq || a.id) - Number(b.seq || b.id)
  )

  return added.length
}

async function loadInfo() {
  try {
    const res = await getRoomInfo()
    if (res?.code !== 200) return

    room.value = res.data?.room || {}
    isAdmin.value = !!res.data?.is_admin
    muted.value = !!res.data?.muted
    mutedUntil.value = Number(res.data?.muted_until || 0)

    form.value = {
      name: room.value.name || '',
      description: room.value.description || '',
      avatar: room.value.avatar || ''
    }
  } catch {
    /* 错误已由 request.js 提示 */
  }
}

// 历史 / 补拉的代次：自动清空发生后 +1，让在途请求的旧结果直接作废，
// 否则「清空」与「正在翻页」撞在一起时，旧的一页会把已清空的消息又贴回来。
let historyEpoch = 0

async function loadHistory(beforeId = 0) {
  if (loading.value) return
  loading.value = true

  const epoch = historyEpoch

  try {
    const res = await listRoomMessages(beforeId ? { before_id: beforeId } : {})
    if (res?.code !== 200) return
    if (epoch !== historyEpoch) return

    const list = res.data?.data || []
    if (beforeId) {
      const seen = new Set(messages.value.map((item) => Number(item.id)))
      messages.value = [...list.filter((item) => !seen.has(Number(item.id))), ...messages.value]
      const el = bodyRef.value
      if (el) el.scrollTop = 0
    } else {
      messages.value = list
      scrollToBottom()
    }

    hasMore.value = !!res.data?.has_more
  } catch {
    /* 错误已由 request.js 提示 */
  } finally {
    loading.value = false
  }
}

/** 断线重连补拉：按本地最大 seq 往后翻，最多 5 页 */
async function syncMessages() {
  let cursor = maxSeq(messages.value)
  const epoch = historyEpoch

  for (let page = 0; page < 5; page += 1) {
    const res = await listRoomMessages({ after_seq: cursor, limit: 50 })
    if (res?.code !== 200) return
    if (epoch !== historyEpoch) return

    const list = res.data?.data || []
    if (!list.length) return

    mergeMessages(list)
    cursor = Number(res.data?.last_seq) || cursor
    if (!res.data?.has_more) break
  }
}

// ---------- 发送 ----------

async function postMessage(content, msgType = 'text', quoteId = 0) {
  const res = await sendRoomMessage({
    content,
    msg_type: msgType,
    // 引用回复：只传被引用消息 id，摘要由服务端回查后落快照
    quote_id: Number(quoteId) || 0,
    // 幂等键：连点 / 重试都只会落一条
    client_msg_id: `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
  })

  if (res?.code !== 200) return null

  // 服务端已经广播了同一条，这里也合并一次：谁先到都不重复
  mergeMessages([res.data])
  scrollToBottom()

  return res.data
}

async function send() {
  const content = draft.value.trim()
  if (!content || sending.value || muted.value) return

  sending.value = true
  try {
    const message = await postMessage(content, 'text', quoteDraft.value?.id)
    if (message) {
      draft.value = ''
      clearQuote()
    }
  } catch {
    /* 错误已由 request.js 提示 */
  } finally {
    sending.value = false
  }
}

async function revoke(msg) {
  if (!canRevoke(msg)) return

  try {
    const res = await revokeRoomMessage(msg.id)
    if (res?.code !== 200) return
    applyRevoke(res.data)
    toast.success('已撤回')
  } catch {
    /* 超过 2 分钟等业务错误已由 request.js 提示 */
  }
}

function applyRevoke(message) {
  if (!message?.id) return

  // 正在引用的消息被撤回：引用态一起清掉，避免发出去必然失败的引用
  if (Number(quoteDraft.value?.id) === Number(message.id)) clearQuote()

  const index = messages.value.findIndex((item) => Number(item.id) === Number(message.id))
  if (index < 0) return
  messages.value[index] = { ...messages.value[index], ...message, is_revoked: 1, content: '' }
}

function insertEmoji(text) {
  const el = inputRef.value
  const value = draft.value

  if (!el) {
    draft.value = value + text
    return
  }

  const start = el.selectionStart ?? value.length
  const end = el.selectionEnd ?? value.length
  draft.value = value.slice(0, start) + text + value.slice(end)

  nextTick(() => {
    el.focus()
    const pos = start + text.length
    el.setSelectionRange(pos, pos)
  })
}

function pickImage() {
  if (uploading.value || muted.value) return
  fileRef.value?.click()
}

const MAX_IMAGE_SIZE = 5 * 1024 * 1024

async function uploadAndSendImages(files) {
  if (muted.value) return

  const list = Array.from(files || []).filter((file) => file && String(file.type).startsWith('image/'))
  if (!list.length) {
    toast.warning('请选择图片文件')
    return
  }

  const oversize = list.find((file) => file.size > MAX_IMAGE_SIZE)
  if (oversize) {
    toast.warning('图片不能超过 5MB')
    return
  }

  uploading.value = true
  try {
    const form_data = new FormData()
    list.forEach((file) => form_data.append('files', file))

    const res = await uploadAttachments(form_data)
    const urls = (res?.data?.results || [])
      .filter((row) => row.status !== 'fail')
      .map((row) => row.full_url || row.url || '')
      .filter(Boolean)

    if (!urls.length) {
      toast.warning('图片上传失败，请稍后重试')
      return
    }

    for (const url of urls) {
      // 引用只挂在第一张上：成功发出后即消费掉
      const message = await postMessage(url, 'image', quoteDraft.value?.id)
      if (!message) break
      clearQuote()
    }
  } catch {
    toast.error('图片发送失败，请稍后重试')
  } finally {
    uploading.value = false
  }
}

function onFilesPicked(event) {
  const input = event.target
  // 先拷贝再清空：input.value = '' 会把 input.files 一起清掉
  const files = Array.from(input.files || [])
  input.value = ''
  uploadAndSendImages(files)
}

function onPaste(event) {
  const files = Array.from(event.clipboardData?.items || [])
    .filter((item) => item.kind === 'file' && String(item.type).startsWith('image/'))
    .map((item) => item.getAsFile())
    .filter(Boolean)

  if (!files.length) return
  event.preventDefault()
  uploadAndSendImages(files)
}

// ---------- 管理 ----------

function openAdmin() {
  form.value = {
    name: room.value.name || '',
    description: room.value.description || '',
    avatar: room.value.avatar || ''
  }
  adminOpen.value = true
  adminTab.value = 'profile'
}

function switchMutes() {
  adminTab.value = 'mutes'
  loadMutes()
}

async function loadMutes() {
  try {
    const res = await listRoomMutes()
    if (res?.code === 200) mutes.value = res.data?.data || []
  } catch {
    /* 权限不足等错误已由 request.js 提示 */
  }
}

function switchClear() {
  adminTab.value = 'clear'
  loadAutoClear()
}

async function loadAutoClear() {
  try {
    const res = await getRoomAutoClear()
    if (res?.code !== 200) return

    clearInfo.value = res.data || clearInfo.value
    clearDays.value = Number(res.data?.days || 3)
  } catch {
    /* 权限不足等错误已由 request.js 提示 */
  }
}

async function saveAutoClear() {
  if (clearSaving.value) return

  clearSaving.value = true
  try {
    const res = await saveRoomAutoClear(clearDays.value)
    if (res?.code !== 200) return

    clearInfo.value = res.data || clearInfo.value
    clearDays.value = Number(res.data?.days || clearDays.value)
    toast.success('已保存，下次清空按新间隔计算')
  } catch {
    /* 错误已由 request.js 提示 */
  } finally {
    clearSaving.value = false
  }
}

async function saveRoom() {
  if (saving.value) return

  const name = form.value.name.trim()
  if (!name) {
    toast.warning('聊天室名称不能为空')
    return
  }

  saving.value = true
  try {
    const res = await updateRoom({
      name,
      description: form.value.description.trim(),
      avatar: form.value.avatar.trim()
    })
    if (res?.code !== 200) return

    room.value = { ...room.value, ...(res.data || {}) }
    toast.success('已保存')
  } catch {
    /* 错误已由 request.js 提示 */
  } finally {
    saving.value = false
  }
}

function pickAvatar() {
  avatarInput.value?.click()
}

async function onAvatarPicked(event) {
  const input = event.target
  const file = Array.from(input.files || [])[0]
  input.value = ''
  if (!file) return

  if (file.size > MAX_IMAGE_SIZE) {
    toast.warning('图片不能超过 5MB')
    return
  }

  avatarUploading.value = true
  try {
    const payload = new FormData()
    payload.append('files', file)

    const res = await uploadAttachments(payload)
    const row = (res?.data?.results || []).find((item) => item.status !== 'fail')
    const url = row?.full_url || row?.url || ''
    if (!url) {
      toast.warning('上传失败，请稍后重试')
      return
    }
    form.value.avatar = url
  } catch {
    toast.error('上传失败，请稍后重试')
  } finally {
    avatarUploading.value = false
  }
}

/** 管理员点消息头像：打开禁言操作浮层 */
function onAvatarClick(msg) {
  if (!isAdmin.value || isMine(msg) || msg.is_revoked === 1) return
  userPanel.value = {
    uid: Number(msg.uid),
    nickname: nameOf(msg),
    avatar: msg.user?.avatar || ''
  }
}

async function mute(uid, minutes) {
  try {
    const res = await muteRoomUser(uid, minutes)
    if (res?.code !== 200) return

    toast.success(minutes > 0 ? `已禁言 ${minutes} 分钟` : '已永久禁言')
    userPanel.value = null

    if (adminOpen.value && adminTab.value === 'mutes') loadMutes()
  } catch {
    /* 错误已由 request.js 提示 */
  }
}

async function unmute(uid) {
  try {
    const res = await unmuteRoomUser(uid)
    if (res?.code !== 200) return

    mutes.value = mutes.value.filter((item) => Number(item.uid) !== Number(uid))
    toast.success('已解除禁言')
  } catch {
    /* 错误已由 request.js 提示 */
  }
}

// ---------- 实时 ----------

let unsubscribeEvent = null

function onRoomEvent(payload = {}) {
  // 断线重连：按本地最大 seq 补齐断网期间的消息，顺便刷新禁言状态
  if (payload.type === 'reconnect') {
    syncMessages()
    loadInfo()
    return
  }

  const event = payload.event
  const type = event?.type
  const data = event?.data
  if (!type || !data) return

  if (type === 'room') {
    if (mergeMessages([data])) scrollToBottom()
    return
  }

  if (type === 'room_revoke') {
    applyRevoke(data)
    return
  }

  // 本人删除：服务端只私推给同账号的其它在线设备，本机也要把气泡移除
  if (type === 'room_delete') {
    const id = Number(data.id || 0)
    if (!id) return
    messages.value = messages.value.filter((item) => Number(item.id) !== id)
    if (Number(quoteDraft.value?.id) === id) clearQuote()
    return
  }

  if (type === 'room_update') {
    room.value = { ...room.value, ...data }
    return
  }

  // 服务端按间隔自动清空了全部消息：把本地时间线一起清掉（游标随 messages 归零）
  if (type === 'room_clear') {
    historyEpoch += 1
    messages.value = []
    hasMore.value = false
    clearQuote()
    loadHistory(0)
    toast.info('聊天室记录已自动清空')
    return
  }

  if (type === 'room_mute' && Number(data.uid) === me.value) {
    muted.value = true
    mutedUntil.value = Number(data.until || 0)
    return
  }

  if (type === 'room_unmute' && Number(data.uid) === me.value) {
    muted.value = false
    mutedUntil.value = 0
  }
}

// 禁言是「到点自动失效」的：页面开着时定期刷新一次状态，
// 到期后输入框能自己恢复，不用手动刷新页面
let infoTimer = null

onMounted(async () => {
  chatStore.start()
  await Promise.all([loadInfo(), loadHistory(0)])
  unsubscribeEvent = chatStore.onEvent(onRoomEvent)
  infoTimer = setInterval(loadInfo, 60 * 1000)

  // 菜单打开时按 Esc / 滚动页面都要收起，避免浮在错误的位置
  document.addEventListener('keydown', onMenuKeydown)
  window.addEventListener('scroll', onMenuScroll, true)
})

onBeforeUnmount(() => {
  if (unsubscribeEvent) unsubscribeEvent()
  clearInterval(infoTimer)
  document.removeEventListener('keydown', onMenuKeydown)
  window.removeEventListener('scroll', onMenuScroll, true)
})
</script>

<style scoped>
/* 整屏页面：与私信页同一套骨架，但群聊内容居中收窄，长行更好读 */
.room-app {
  display: flex;
  flex-direction: column;
  height: 100vh;
  height: 100dvh;
  overflow: hidden;
  color: var(--text);
  background: var(--bg);
}

/* ==================== 顶部 ==================== */
.room-head {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-shrink: 0;
  padding: 12px 18px;
  background: var(--bg-card);
  border-bottom: 1px solid var(--border);
}
.room-icon-btn {
  width: 32px;
  height: 32px;
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 15px;
  color: var(--text-light);
  background: transparent;
  border: 0;
  border-radius: 50%;
  cursor: pointer;
  text-decoration: none;
  transition: color var(--dur-fast) var(--ease), background-color var(--dur-fast) var(--ease);
}
.room-icon-btn:hover {
  color: var(--primary);
  background: var(--bg-muted);
}
.room-avatar {
  flex-shrink: 0;
  width: 40px;
  height: 40px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  font-size: 18px;
  color: var(--primary);
  background: var(--accent-wash);
  border: 1px solid var(--primary-soft);
  border-radius: 50%;
}
.room-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.room-avatar-sm {
  width: 32px;
  height: 32px;
  font-size: 14px;
}
.room-title {
  flex: 1;
  min-width: 0;
}
.room-title h1 {
  margin: 0;
  font-size: 15px;
  font-weight: 700;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}
.room-title p {
  margin: 2px 0 0;
  font-size: 12px;
  color: var(--text-light);
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}
.room-actions {
  display: flex;
  align-items: center;
  gap: 6px;
}
.room-mute-tag {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 3px 9px;
  font-size: 11px;
  color: var(--danger);
  background: var(--accent-wash);
  border-radius: 999px;
}

/* 通用按钮 */
.room-btn {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 6px 12px;
  font-family: inherit;
  font-size: 12.5px;
  color: var(--text-soft);
  background: var(--bg-card);
  border: 1px solid var(--border-soft);
  border-radius: var(--radius);
  cursor: pointer;
  transition: color var(--dur-fast) var(--ease), border-color var(--dur-fast) var(--ease);
}
.room-btn:hover:not(:disabled) {
  color: var(--primary);
  border-color: var(--primary-soft);
}
.room-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.room-btn-primary {
  color: #fff;
  background: var(--primary);
  border-color: var(--primary);
}
.room-btn-primary:hover:not(:disabled) {
  color: #fff;
  filter: brightness(1.06);
}
.room-btn-danger {
  color: var(--danger);
  border-color: var(--danger);
}
.room-btn-sm {
  padding: 3px 9px;
  font-size: 11.5px;
}

/* ==================== 消息区 ==================== */
.room-body {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 20px max(18px, calc((100% - 900px) / 2)) 10px;
  scrollbar-width: thin;
}
.room-tip {
  padding: 32px 0;
  font-size: 12px;
  text-align: center;
  color: var(--text-light);
}
.room-more {
  display: flex;
  align-items: center;
  gap: 4px;
  margin: 0 auto 16px;
  padding: 5px 14px;
  font-family: inherit;
  font-size: 12px;
  color: var(--text-soft);
  background: var(--bg-card);
  border: 1px solid var(--border-soft);
  border-radius: 999px;
  cursor: pointer;
}
.room-more:hover:not(:disabled) {
  color: var(--primary);
  border-color: var(--primary-soft);
}
.room-day {
  display: flex;
  justify-content: center;
  margin: 18px 0 14px;
  font-size: 11px;
  color: var(--text-light);
}
.room-day span {
  padding: 2px 10px;
  background: var(--bg-muted);
  border-radius: 999px;
}

.room-msg {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  margin-bottom: 16px;
}
.room-msg.is-mine {
  flex-direction: row-reverse;
}
.room-msg-avatar {
  flex-shrink: 0;
  width: 34px;
  height: 34px;
  padding: 0;
  overflow: hidden;
  background: var(--bg-muted);
  border: 0;
  border-radius: 50%;
  cursor: pointer;
}
.room-msg-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.room-msg-main {
  display: flex;
  flex-direction: column;
  max-width: 70%;
  min-width: 0;
}
.room-msg.is-mine .room-msg-main {
  align-items: flex-end;
}
.room-msg-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 4px;
  font-size: 11px;
  color: var(--text-light);
}
.room-msg.is-mine .room-msg-meta {
  flex-direction: row-reverse;
}
.room-msg-name {
  font-size: 12px;
  font-weight: 600;
  color: var(--text-soft);
  max-width: 160px;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}
.room-msg-revoke {
  padding: 0;
  font-family: inherit;
  font-size: 11px;
  color: var(--text-light);
  background: transparent;
  border: 0;
  cursor: pointer;
  opacity: 0;
  transition: opacity var(--dur-fast) var(--ease), color var(--dur-fast) var(--ease);
}
.room-msg:hover .room-msg-revoke {
  opacity: 1;
}
.room-msg-revoke:hover {
  color: var(--danger);
}

.room-bubble {
  padding: 10px 14px;
  font-size: 14px;
  line-height: 1.75;
  color: var(--text);
  background: var(--bg-card);
  border: 1px solid var(--border-soft);
  border-radius: var(--radius-lg);
  border-top-left-radius: var(--radius-xs);
  box-shadow: var(--shadow-sm);
  word-break: break-word;
  white-space: pre-wrap;
}
.room-msg.is-mine .room-bubble {
  color: #fff;
  background: var(--primary);
  border-color: var(--primary);
  border-top-left-radius: var(--radius-lg);
  border-bottom-right-radius: var(--radius-xs);
  box-shadow: none;
}
.room-bubble.is-revoked {
  font-size: 12.5px;
  font-style: normal;
  color: var(--text-light);
  background: var(--bg-muted);
  border-color: transparent;
  box-shadow: none;
}
.room-msg.is-mine .room-bubble.is-revoked {
  color: var(--text-light);
  background: var(--bg-muted);
}
.room-image {
  display: block;
  max-width: 240px;
  max-height: 240px;
  border-radius: var(--radius-sm);
  cursor: zoom-in;
}
.room-text {
  display: inline-block;
  vertical-align: top;
  white-space: pre-wrap;
}

/* 引用块：气泡内的浅色摘要，左侧竖线区分「这是被引用的内容」 */
.room-quote {
  display: flex;
  flex-direction: column;
  gap: 1px;
  margin-bottom: 6px;
  padding: 5px 9px;
  font-size: 12px;
  line-height: 1.5;
  color: var(--text-soft);
  background: var(--bg-muted);
  border-left: 3px solid var(--primary);
  border-radius: var(--radius-xs);
  white-space: normal;
}
.room-quote-name {
  font-weight: 600;
  color: var(--text-light);
}
.room-quote-text {
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  line-clamp: 2;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  word-break: break-word;
}
.room-msg.is-mine .room-quote {
  color: rgba(255, 255, 255, 0.82);
  background: rgba(255, 255, 255, 0.14);
  border-left-color: rgba(255, 255, 255, 0.65);
}
.room-msg.is-mine .room-quote-name {
  color: #fff;
}

/* ==================== 输入区 ==================== */
.room-composer {
  flex-shrink: 0;
  padding: 10px max(18px, calc((100% - 900px) / 2)) calc(12px + env(safe-area-inset-bottom));
  background: var(--bg-card);
  border-top: 1px solid var(--border);
}
.room-composer-box {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  gap: 6px;
  padding: 6px 6px 6px 8px;
  background: var(--bg);
  border: 1px solid var(--border-soft);
  border-radius: var(--radius-lg);
  transition: border-color var(--dur-fast) var(--ease), box-shadow var(--dur-fast) var(--ease);
}
.room-composer-box:focus-within {
  border-color: var(--primary);
  box-shadow: 0 0 0 3px var(--accent-ring);
}
.room-tools {
  display: flex;
  align-items: center;
  flex-shrink: 0;
  margin-bottom: 2px;
}
.room-emoji-wrap {
  position: relative;
}
.room-emoji-wrap :deep(.emoji-picker-panel) {
  top: auto;
  bottom: calc(100% + 8px);
  z-index: 3200;
}
.room-input {
  flex: 1;
  min-width: 0;
  min-height: 36px;
  max-height: 132px;
  padding: 8px 2px;
  font-family: inherit;
  font-size: 14px;
  line-height: 1.6;
  color: var(--text);
  background: transparent;
  border: 0;
  outline: none;
  resize: none;
}
.room-input::placeholder {
  color: var(--text-light);
}
.room-send {
  width: 36px;
  height: 36px;
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  color: #fff;
  background: var(--primary);
  border: 0;
  border-radius: 50%;
  cursor: pointer;
}
.room-send:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}
.room-file {
  position: fixed;
  left: -9999px;
  top: -9999px;
  width: 1px;
  height: 1px;
  opacity: 0;
  pointer-events: none;
}
.room-blocked {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  margin: 0;
  padding: 10px 0;
  font-size: 12px;
  color: var(--danger);
  background: var(--accent-wash);
  border-radius: var(--radius);
}

/* ==================== 管理抽屉 ==================== */
.room-admin {
  position: fixed;
  inset: 0;
  z-index: 3400;
}
.room-admin-mask {
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.28);
}
.room-admin-panel {
  position: absolute;
  top: 0;
  right: 0;
  bottom: 0;
  width: 360px;
  max-width: 92vw;
  display: flex;
  flex-direction: column;
  background: var(--bg-card);
  border-left: 1px solid var(--border);
  box-shadow: var(--shadow-lg);
}
.room-admin-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 16px;
  font-size: 14px;
  font-weight: 600;
  border-bottom: 1px solid var(--border-soft);
}
.room-admin-tabs {
  display: flex;
  gap: 4px;
  padding: 10px 16px 0;
  border-bottom: 1px solid var(--border-soft);
}
.room-admin-tab {
  padding: 7px 10px;
  font-family: inherit;
  font-size: 12.5px;
  color: var(--text-light);
  background: transparent;
  border: 0;
  border-bottom: 2px solid transparent;
  cursor: pointer;
}
.room-admin-tab.is-active {
  color: var(--primary);
  border-bottom-color: var(--primary);
}
.room-admin-body {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 14px 16px calc(16px + env(safe-area-inset-bottom));
}
.room-field {
  display: block;
  margin-bottom: 14px;
}
.room-field > span {
  display: block;
  margin-bottom: 6px;
  font-size: 12px;
  color: var(--text-soft);
}
.room-field input,
.room-field textarea {
  width: 100%;
  padding: 8px 10px;
  font-family: inherit;
  font-size: 13px;
  line-height: 1.6;
  color: var(--text);
  background: var(--bg);
  border: 1px solid var(--border-soft);
  border-radius: var(--radius-sm);
  outline: none;
  resize: vertical;
}
.room-field input:focus,
.room-field textarea:focus {
  border-color: var(--primary);
  box-shadow: 0 0 0 3px var(--accent-ring);
}
.room-avatar-row {
  display: flex;
  align-items: center;
  gap: 10px;
}
.room-avatar-row input {
  flex: 1;
  min-width: 0;
}
.room-admin-actions {
  display: flex;
  gap: 8px;
  margin-top: 4px;
}
.room-mute-row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 0;
  border-bottom: 1px solid var(--border-soft);
}
.room-mute-avatar {
  width: 30px;
  height: 30px;
  flex-shrink: 0;
  object-fit: cover;
  background: var(--bg-muted);
  border-radius: 50%;
}
.room-mute-name {
  flex: 1;
  min-width: 0;
  font-size: 13px;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}
.room-mute-row em {
  font-size: 11px;
  font-style: normal;
  color: var(--text-light);
}

/* ==================== 用户操作弹窗 ==================== */
.room-modal {
  position: fixed;
  inset: 0;
  z-index: 3500;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
}
.room-modal-mask {
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.3);
}
.room-modal-card {
  position: relative;
  width: 300px;
  max-width: 100%;
  padding: 18px;
  background: var(--bg-card);
  border: 1px solid var(--border-soft);
  border-radius: var(--radius);
  box-shadow: var(--shadow-lg);
}
.room-modal-user {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 14px;
  font-weight: 600;
}
.room-modal-user img {
  width: 36px;
  height: 36px;
  object-fit: cover;
  background: var(--bg-muted);
  border-radius: 50%;
}
.room-modal-tip {
  margin: 10px 0 14px;
  font-size: 12px;
  line-height: 1.7;
  color: var(--text-light);
}
.room-modal-actions {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}

.is-spin {
  animation: room-spin 0.9s linear infinite;
}
@keyframes room-spin {
  to {
    transform: rotate(360deg);
  }
}

/* 窄屏 */
@media (max-width: 860px) {
  .room-head {
    padding: 10px 12px;
  }
  .room-title p {
    display: none;
  }
  .room-body {
    padding: 14px 12px 6px;
  }
  .room-composer {
    padding: 8px 12px calc(10px + env(safe-area-inset-bottom));
  }
  .room-msg-main {
    max-width: 80%;
  }
  .room-msg-revoke {
    opacity: 1;
  }
  .room-image {
    max-width: 200px;
    max-height: 200px;
  }
  .room-btn {
    padding: 5px 9px;
  }
  .room-admin-panel {
    width: 100%;
    max-width: none;
  }
}

/* ==================== 引用态（输入框上方） ==================== */
.room-quote-draft {
  flex-basis: 100%;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 8px;
  margin-bottom: 2px;
  background: var(--bg-muted);
  border-left: 3px solid var(--primary);
  border-radius: var(--radius-xs);
}
.room-quote-draft-body {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 1px;
  font-size: 12px;
  line-height: 1.5;
}

/* ==================== 消息右键菜单 ==================== */
.room-menu-mask {
  position: fixed;
  inset: 0;
  z-index: 60;
}
.room-menu {
  position: fixed;
  z-index: 61;
  min-width: 148px;
  padding: 6px;
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  box-shadow: var(--shadow-md);
}
.room-menu-item {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  height: 34px;
  padding: 0 10px;
  font-size: 13px;
  color: var(--text-soft);
  text-align: left;
  white-space: nowrap;
  background: none;
  border: 0;
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition: color var(--dur-fast) var(--ease), background-color var(--dur-fast) var(--ease);
}
.room-menu-item:hover {
  color: var(--text);
  background: var(--bg-muted);
}
.room-menu-item i {
  font-size: 14px;
  opacity: 0.9;
}
.room-menu-item.is-danger {
  color: var(--danger);
}
.room-menu-item.is-danger:hover {
  color: var(--danger);
  background: var(--accent-soft);
}
</style>
