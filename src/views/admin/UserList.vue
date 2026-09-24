<template>
  <div class="user-list">
    <div class="card card-pad">
      <!-- 头部 -->
      <header class="list-head">
        <div>
          <h2 class="block-title">用户列表</h2>
          <p class="block-desc">
            查看用户资料、分配权限组、冻结与封禁账号
            <template v-if="total > 0"> · 共 {{ total }} 位</template>
          </p>
        </div>
        <div class="head-actions">
          <button class="btn btn-primary btn-sm" @click="openCreate">
            <i class="bi bi-person-plus" /> 新建用户
          </button>
        </div>
      </header>

      <!-- 筛选栏 -->
      <div class="list-filter">
        <div class="status-tabs">
          <button
            v-for="tab in tabs"
            :key="tab.key"
            type="button"
            class="status-tab"
            :class="{ active: !trash && status === tab.key }"
            @click="switchTab(tab.key)"
          >{{ tab.label }}</button>
          <button
            type="button"
            class="status-tab trash-tab"
            :class="{ active: trash }"
            @click="toggleTrash"
          >
            <i class="bi bi-trash3" /> 回收站
          </button>
        </div>

        <div class="filter-right">
          <SelectMenu
            v-model="searchField"
            :options="searchFields"
            icon="bi bi-funnel"
            placeholder="搜索范围"
            @change="reload"
          />

          <SelectMenu
            v-model="sortKey"
            :options="sortOptions"
            :disabled="trash"
            icon="bi bi-sort-down"
            placeholder="排序方式"
            @change="reload"
          />

          <div class="search-box">
            <i class="bi bi-search" aria-hidden="true" />
            <input
              v-model="keyword"
              class="search-input"
              type="search"
              :placeholder="`搜索${searchFieldLabel}…`"
              :aria-label="`搜索${searchFieldLabel}`"
              @input="doSearch"
            />
          </div>

          <button
            class="btn btn-ghost btn-sm"
            :disabled="loading"
            title="刷新"
            aria-label="刷新列表"
            @click="load"
          >
            <i class="bi bi-arrow-clockwise" />
          </button>
        </div>
      </div>

      <!-- 批量操作栏（选中后出现） -->
      <div v-if="selectedIds.length" class="batch-bar">
        <span class="batch-count">已选 <strong>{{ selectedIds.length }}</strong> 位</span>
        <div class="batch-actions">
          <template v-if="trash">
            <button class="btn btn-sm" :disabled="busy" @click="batchRestore()">
              <i class="bi bi-arrow-counterclockwise" /> 批量恢复
            </button>
            <button class="btn btn-sm btn-danger" :disabled="busy" @click="askBatchForceDelete()">
              <i class="bi bi-x-octagon" /> 彻底删除
            </button>
          </template>
          <template v-else>
            <button class="btn btn-sm" :disabled="busy" @click="batchStatus(USER_STATUS_NORMAL)">
              <i class="bi bi-person-check" /> 批量通过/解冻
            </button>
            <button class="btn btn-sm" :disabled="busy" @click="batchStatus(USER_STATUS_FROZEN)">
              <i class="bi bi-snow" /> 批量冻结
            </button>
            <button class="btn btn-sm btn-danger" :disabled="busy" @click="askBatchRemove()">
              <i class="bi bi-trash" /> 删除
            </button>
          </template>
          <button class="btn btn-sm btn-ghost" :disabled="busy" @click="clearSelection">取消选择</button>
        </div>
      </div>

      <!-- 回收站提示条 -->
      <div v-if="trash" class="trash-bar">
        <span><i class="bi bi-trash3" /> 回收站中的用户无法登录，可恢复或彻底删除</span>
        <button class="btn btn-sm btn-danger" :disabled="busy || !total" @click="askClearRecycle()">
          清空回收站
        </button>
      </div>

      <!-- 列表 -->
      <div v-if="loading" class="loading">
        <span class="spinner" /> 加载中...
      </div>

      <div v-else-if="!list.length" class="empty-row">
        <EmptyState :icon="trash ? 'bi bi-trash3' : 'bi bi-people'" :text="emptyText" />
      </div>

      <template v-else>
        <!-- 本页全选 -->
        <div class="list-head-row">
          <label class="pick" title="全选本页（系统管理员与当前账号不可选）">
            <input
              ref="selectAllRef"
              type="checkbox"
              :checked="pageAllSelected"
              :disabled="busy || !selectableUsers.length"
              aria-label="全选本页"
              @change="toggleSelectAll"
            />
          </label>
          <span class="list-head-text">本页 {{ list.length }} 位 · 共 {{ total }} 位</span>
        </div>

        <ul class="user-items">
          <li
            v-for="item in list"
            :key="item.id"
            class="user-row"
            :class="{ selected: isSelected(item.id) }"
          >
            <label class="pick" :title="isProtected(item) ? protectedText(item) : (isSelected(item.id) ? '取消选择' : '选择')">
              <input
                type="checkbox"
                :checked="isSelected(item.id)"
                :disabled="busy || isProtected(item)"
                :aria-label="`选择用户 ${item.nickname || item.id}`"
                @change="toggleSelect(item.id)"
              />
            </label>

            <img class="user-avatar" :src="item.avatar || defaultAvatar" :alt="item.nickname || 'avatar'" loading="lazy" />

            <div class="user-main">
              <div class="user-name-row">
                <span class="user-name">{{ item.nickname || '未设置昵称' }}</span>

                <span v-if="Number(item.id) === 1" class="flag is-admin">
                  <i class="bi bi-patch-check-fill" /> 系统管理员
                </span>
                <span v-else-if="isSelf(item)" class="flag is-self">当前账号</span>

                <span v-for="g in groupsOf(item)" :key="g.id" class="flag is-group">
                  <i class="bi bi-shield-check" /> {{ g.name || g.key }}
                </span>

                <span class="status-chip" :class="userStatusClass(item)">
                  <i :class="userStatusIcon(item)" />
                  {{ userStatusLabel(item) }}
                </span>

                <span v-if="isBanned(item)" class="status-chip is-ban">
                  <i class="bi bi-shield-x" /> 封禁中
                </span>
              </div>

              <div class="user-contact">
                <span v-if="item.account" class="contact-item"><i class="bi bi-person-badge" /> {{ item.account }}</span>
                <span v-if="item.email" class="contact-item"><i class="bi bi-envelope" /> {{ item.email }}</span>
                <span v-if="item.phone" class="contact-item"><i class="bi bi-telephone" /> {{ item.phone }}</span>
                <span v-if="!item.account && !item.email && !item.phone" class="contact-item is-empty">未绑定账号 / 邮箱 / 手机号</span>
              </div>

              <div class="user-meta">
                <span class="meta-text">#{{ item.id }}</span>
                <span v-if="item.title" class="meta-chip"><i class="bi bi-award" /> {{ item.title }}</span>
                <span class="meta-text"><i class="bi bi-lightning-charge" /> {{ item.exp || 0 }} 经验</span>
                <span class="meta-text"><i class="bi bi-coin" /> {{ item.integral || 0 }} 积分</span>
                <span v-if="item.source" class="meta-text"><i class="bi bi-box-arrow-in-right" /> {{ item.source }}</span>
                <span class="meta-text"><i class="bi bi-clock" /> {{ timeText(item) }}</span>
                <span v-if="banCountOf(item) > 0" class="meta-text is-warn">
                  <i class="bi bi-exclamation-octagon" /> 累计封禁 {{ banCountOf(item) }} 次
                </span>
              </div>

              <p v-if="isBanned(item)" class="ban-line">
                <i class="bi bi-shield-x" /> {{ banLine(item) }}
              </p>
            </div>

            <div class="user-actions">
              <template v-if="trash">
                <button class="btn btn-ghost btn-sm" title="恢复" aria-label="恢复" :disabled="busy" @click="restore(item)">
                  <i class="bi bi-arrow-counterclockwise" />
                </button>
                <button class="btn btn-ghost btn-sm danger" title="彻底删除" aria-label="彻底删除" :disabled="busy" @click="askForceDelete(item)">
                  <i class="bi bi-x-octagon" />
                </button>
              </template>

              <template v-else>
                <!-- 账号状态（0 正常 / 1 冻结）：单选切换，当前状态高亮 -->
                <div class="status-switch" role="radiogroup" aria-label="账号状态">
                  <label
                    v-for="opt in STATUS_OPTIONS"
                    :key="opt.key"
                    class="status-option"
                    :class="[`is-${opt.key}`, { active: Number(item.status) === opt.value, 'is-disabled': busy || isProtected(item) }]"
                    :title="isProtected(item) ? protectedText(item) : `设为${opt.label}`"
                  >
                    <input
                      type="radio"
                      class="status-radio"
                      :name="`user-status-${item.id}`"
                      :value="opt.value"
                      :checked="Number(item.status) === opt.value"
                      :disabled="busy || isProtected(item)"
                      :aria-label="opt.label"
                      @change="changeStatus(item, opt.value)"
                    />
                    <i :class="opt.icon" aria-hidden="true" />
                  </label>
                </div>

                <router-link
                  :to="`/author/${item.id}`"
                  class="btn btn-ghost btn-sm"
                  title="查看主页"
                  aria-label="查看主页"
                >
                  <i class="bi bi-box-arrow-up-right" />
                </router-link>

                <button class="btn btn-ghost btn-sm" title="编辑资料" aria-label="编辑资料" @click="openEdit(item)">
                  <i class="bi bi-pencil" />
                </button>

                <button class="btn btn-ghost btn-sm" title="分配权限组" aria-label="分配权限组" @click="openGroups(item)">
                  <i class="bi bi-shield-check" />
                </button>

                <button
                  v-if="isBanned(item)"
                  class="btn btn-ghost btn-sm ok"
                  title="解除封禁"
                  aria-label="解除封禁"
                  :disabled="busy"
                  @click="askUnban(item)"
                >
                  <i class="bi bi-shield-check" />
                </button>
                <button
                  v-else
                  class="btn btn-ghost btn-sm danger"
                  :title="isProtected(item) ? protectedText(item) : '封禁账号'"
                  aria-label="封禁账号"
                  :disabled="busy || isProtected(item)"
                  @click="openBan(item)"
                >
                  <i class="bi bi-shield-x" />
                </button>

                <button
                  class="btn btn-ghost btn-sm danger"
                  :title="isProtected(item) ? protectedText(item) : '删除'"
                  aria-label="删除"
                  :disabled="busy || isProtected(item)"
                  @click="askRemove(item)"
                >
                  <i class="bi bi-trash" />
                </button>
              </template>
            </div>
          </li>
        </ul>
      </template>

      <Pagination
        v-if="!loading && total > pageSize"
        :current="page"
        :total="total"
        :page-size="pageSize"
        @update:current="changePage"
      />
    </div>

    <!-- 新建 / 编辑用户 -->
    <AdminFormDialog
      v-model:visible="edit.visible"
      :title="edit.dialogTitle"
      :icon="edit.mode === 'create' ? 'bi bi-person-plus' : 'bi bi-pencil-square'"
      :loading="edit.loading"
      confirm-text="保存"
      width="600px"
      @confirm="saveUser"
    >
      <!-- 基本资料 -->
      <section class="form-section">
        <h4 class="section-title">基本资料</h4>

        <div class="form-item">
          <label class="form-label">头像</label>
          <div class="avatar-row">
            <div class="avatar-box">
              <img v-if="edit.avatar" :src="edit.avatar" alt="头像预览" />
              <div v-else class="avatar-empty" @click="pickAvatar">
                <i class="bi bi-image" />
                <span>上传</span>
              </div>
              <button v-if="edit.avatar" type="button" class="avatar-del" title="移除头像" @click="edit.avatar = ''">
                <i class="bi bi-x" />
              </button>
            </div>
            <div class="avatar-fields">
              <input v-model="edit.avatar" class="input" type="text" placeholder="粘贴图片链接，或点击下方按钮上传" />
              <div class="avatar-actions">
                <button class="btn btn-sm" type="button" :disabled="uploading" @click="pickAvatar">
                  <i class="bi bi-upload" /> {{ uploading ? '上传中...' : '上传图片' }}
                </button>
                <button v-if="edit.avatar" class="btn btn-sm btn-ghost" type="button" :disabled="uploading" @click="edit.avatar = ''">
                  移除
                </button>
              </div>
            </div>
            <input ref="avatarFileRef" type="file" accept="image/*" hidden @change="onAvatarChange" />
          </div>
        </div>

        <div class="form-grid">
          <div class="form-item">
            <label class="form-label">昵称</label>
            <input v-model="edit.nickname" class="input" type="text" maxlength="32" placeholder="汉字、字母、数字、下划线或中划线" />
          </div>
          <div class="form-item">
            <label class="form-label">性别</label>
            <SelectMenu v-model="edit.gender" variant="field" :options="GENDER_OPTIONS" />
          </div>
        </div>

        <div class="form-item">
          <label class="form-label">头衔</label>
          <input v-model="edit.title" class="input" type="text" maxlength="32" placeholder="可选，展示在用户资料页" />
        </div>

        <div class="form-item">
          <label class="form-label">个人简介</label>
          <textarea v-model="edit.description" class="textarea" rows="2" maxlength="256" placeholder="可选，最多 256 字" />
        </div>
      </section>

      <!-- 账号与安全 -->
      <section class="form-section">
        <h4 class="section-title">账号与安全</h4>

        <div class="form-grid">
          <div class="form-item">
            <label class="form-label">账号</label>
            <input v-model="edit.account" class="input" type="text" maxlength="32" placeholder="字母或数字，4-32 位" />
          </div>
          <div class="form-item">
            <label class="form-label">{{ edit.mode === 'create' ? '登录密码' : '重置密码' }}</label>
            <input v-model="edit.password" class="input" type="text" maxlength="32" placeholder="6-32 位" />
            <p class="form-hint">
              {{ edit.mode === 'create' ? '留空则该账号只能通过邮箱验证码登录' : '留空表示不修改当前密码' }}
            </p>
          </div>
        </div>

        <div class="form-grid">
          <div class="form-item">
            <label class="form-label">邮箱{{ edit.mode === 'create' ? '（必填）' : '' }}</label>
            <input v-model="edit.email" class="input" type="email" placeholder="user@example.com" />
          </div>
          <div class="form-item">
            <label class="form-label">手机号</label>
            <input v-model="edit.phone" class="input" type="text" maxlength="32" placeholder="可选" />
          </div>
        </div>

        <div class="form-grid">
          <div class="form-item">
            <label class="form-label">注册来源</label>
            <input v-model="edit.source" class="input" type="text" maxlength="32" placeholder="如 mellow / default" />
            <p class="form-hint">用于区分注册渠道，留空则不修改</p>
          </div>
          <div class="form-item">
            <label class="form-label">账号状态</label>
            <SelectMenu
              v-model="edit.status"
              variant="field"
              :options="STATUS_OPTIONS"
              :disabled="Number(edit.id) === 1"
            />
            <p v-if="Number(edit.id) === 1" class="form-hint">系统管理员账号状态不可修改</p>
          </div>
        </div>

        <div class="form-item">
          <label class="form-label">管理员备注</label>
          <input v-model="edit.remark" class="input" type="text" placeholder="仅后台可见" />
        </div>
      </section>
    </AdminFormDialog>

    <!-- 封禁用户 -->
    <AdminFormDialog
      v-model:visible="ban.visible"
      title="封禁用户"
      icon="bi bi-shield-x"
      :loading="ban.loading"
      confirm-text="确认封禁"
      width="560px"
      @confirm="submitBan"
    >
      <p class="dialog-tip">
        将对 <strong>{{ ban.nickname || `用户 ${ban.uid}` }}</strong> 执行封禁；封禁会强制其下线，可随时解封。
      </p>

      <div class="form-item">
        <label class="form-label">封禁范围</label>
        <label class="check-line">
          <input v-model="ban.all" type="checkbox" />
          <span>全面封禁（限制全部操作）</span>
        </label>
        <div v-if="!ban.all" class="check-grid">
          <label v-for="t in BAN_TYPES" :key="t.bit" class="check-line">
            <input v-model="ban.bits" type="checkbox" :value="t.bit" />
            <span>{{ t.label }}</span>
          </label>
        </div>
        <p class="form-hint">当前封禁内容：{{ banTypeText(banTypeMask) }}</p>
      </div>

      <div class="form-item">
        <label class="form-label">封禁时长</label>
        <SelectMenu v-model="ban.durationMode" variant="field" :options="BAN_DURATION_OPTIONS" />
        <p class="form-hint">
          自动梯度按该用户累计封禁次数计算：首次 1 天、二次 7 天、三次 15 天、四次 30 天、五次及以上永久。
        </p>
      </div>

      <div class="form-item">
        <label class="form-label">封禁原因</label>
        <input v-model="ban.reason" class="input" type="text" maxlength="512" placeholder="默认为「违反社区规定」" />
      </div>

      <div class="form-item">
        <label class="form-label">违规证据</label>
        <textarea v-model="ban.evidence" class="textarea" rows="3" maxlength="1024" placeholder="可选，如违规内容链接、截图地址等" />
      </div>

      <div class="form-item">
        <label class="form-label">附加处理</label>
        <label class="check-line">
          <input v-model="ban.freezeUser" type="checkbox" />
          <span>同时冻结账号（无法登录，解封时一并恢复）</span>
        </label>
        <label class="check-line">
          <input v-model="ban.banAppeal" type="checkbox" />
          <span>禁止申诉</span>
        </label>
        <label class="check-line is-danger">
          <input v-model="ban.deleteContent" type="checkbox" />
          <span>同时删除该用户的全部内容（文章 / 动态 / 评论，移入回收站）</span>
        </label>
      </div>
    </AdminFormDialog>

    <!-- 分配权限组 -->
    <AdminFormDialog
      v-model:visible="groups.visible"
      title="分配权限组"
      icon="bi bi-shield-check"
      :loading="groups.loading"
      confirm-text="保存"
      @confirm="saveGroups"
    >
      <p class="dialog-tip">
        为 <strong>{{ groups.nickname || `用户 ${groups.uid}` }}</strong> 指定所属权限组，保存后立即生效（该用户需重新登录刷新权限）。
      </p>

      <div v-if="groups.fetching" class="loading"><span class="spinner" /> 加载权限组...</div>

      <div v-else-if="!groups.all.length" class="dialog-empty">
        暂无可用权限组：请先到「权限组」页面创建，或确认当前账号有权访问权限组列表。
      </div>

      <div v-else class="check-grid is-block">
        <label v-for="g in groups.all" :key="g.id" class="check-line">
          <input v-model="groups.selected" type="checkbox" :value="Number(g.id)" />
          <span>
            {{ g.name || g.key }}
            <code v-if="g.key" class="group-key">{{ g.key }}</code>
            <span v-if="Number(g.root) === 1" class="root-flag">超管</span>
          </span>
        </label>
      </div>
    </AdminFormDialog>

    <!-- 操作确认 -->
    <ConfirmDialog
      v-model:visible="confirm.visible"
      :title="confirm.title"
      :message="confirm.message"
      :confirm-text="confirm.confirmText"
      :danger="confirm.danger"
      :loading="confirm.loading"
      @confirm="runConfirm"
    />
  </div>
</template>

<script setup>
/**
 * 用户列表（/admin/users 子路由）
 *
 * 与父级 Users.vue 通过 inject('usersAdmin') 联动：统计卡片点击 → 列表筛选，
 * 列表增删改 → 刷新统计卡片。列表状态（标签 / 回收站 / 排序 / 搜索 / 页码）都在这里维护。
 *
 * 关键约束（后端 users 控制器）：
 * - users/update 的允许字段随权限变化，管理员（root）才能改 email/phone/source/remark；
 * - users/status 只允许 0/1，且禁止修改系统管理员；
 * - users/ban 的 duration 传字符串 '0' 表示永久，不传并置 auto_gradient=true 走自动梯度；
 * - users/remove|delete 禁止包含 id=1 与当前登录账号，故前端直接禁用这些行的选择与操作。
 */
import { ref, reactive, computed, inject, watchEffect, onMounted, onUnmounted } from 'vue'
import { storeToRefs } from 'pinia'
import { useUserStore } from '@/stores/user'
import EmptyState from '@/components/EmptyState.vue'
import Pagination from '@/components/Pagination.vue'
import ConfirmDialog from '@/components/ConfirmDialog.vue'
import AdminFormDialog from '@/components/admin/AdminFormDialog.vue'
import SelectMenu from '@/components/SelectMenu.vue'
import {
  listUsers,
  createUser,
  updateUser,
  setUserStatus,
  banUser,
  unbanUser,
  removeUsers,
  forceDeleteUsers,
  restoreUsers,
  clearUserRecycle
} from '@/api/users'
import { listAuthGroups, setUserAuthGroups } from '@/api/auth-group'
import { uploadAttachments } from '@/api/attachment'
import { fromNow, formatTime } from '@/utils/time'
import { debounce } from '@/utils/helper'
import { toast } from '@/utils/toast'
import {
  USER_TABS,
  USER_SORT_OPTIONS,
  USER_SEARCH_FIELDS,
  USER_TRASH_KEY,
  USER_TRASH_ORDER,
  USER_DEFAULT_ORDER,
  USER_STATUS_NORMAL,
  USER_STATUS_AUDIT,
  USER_STATUS_FROZEN,
  BAN_TYPES,
  BAN_TYPE_ALL,
  BAN_DURATION_OPTIONS,
  userListParams,
  userStatusLabel,
  banTypeText,
  banDurationText,
  banRecordOf,
  isUserBanned,
  userGroupsOf,
  isProtectedUser,
  protectedReason
} from '@/utils/user'

const store = useUserStore()
const { user: currentUser } = storeToRefs(store)
const currentUid = computed(() => Number(currentUser.value?.id || 0))

// 父级 Users.vue 注入的联动能力（统计卡片 ←→ 列表筛选）
const admin = inject('usersAdmin', null)

const pageSize = 15
const tabs = USER_TABS
const sortOptions = USER_SORT_OPTIONS
const searchFields = USER_SEARCH_FIELDS

// 账号状态切换项（对应后端 users/status 的 0/1/2）
// 同时用作行内状态单选与编辑弹窗的 SelectMenu 选项（后者只取 value / label）
// 待审核（2）由「注册验证方式=人工审核」写入，管理员点「正常」即视为审核通过
const STATUS_OPTIONS = [
  { value: USER_STATUS_NORMAL, key: 'normal', label: '正常', icon: 'bi bi-person-check' },
  { value: USER_STATUS_AUDIT, key: 'audit', label: '待审核', icon: 'bi bi-hourglass-split' },
  { value: USER_STATUS_FROZEN, key: 'frozen', label: '冻结', icon: 'bi bi-snow' }
]

// 性别下拉选项（后端存 boy / girl / 空）
const GENDER_OPTIONS = [
  { value: '', label: '保密' },
  { value: 'boy', label: '男' },
  { value: 'girl', label: '女' }
]

const defaultAvatar =
  'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 80"><circle cx="40" cy="40" r="40" fill="%23e8e6dd"/><text x="50%25" y="55%25" text-anchor="middle" font-size="34" fill="%238a8a82" font-family="serif">用</text></svg>'

const list = ref([])
const total = ref(0)
const page = ref(1)
const loading = ref(false)
const busy = ref(false)
// 回收站模式
const trash = ref(false)
const status = ref('all')
const sortKey = ref(USER_DEFAULT_ORDER)
const searchField = ref('nickname')
const keyword = ref('')
const searchKey = ref('')
const selectedIds = ref([])

const currentTab = computed(() => tabs.find((tab) => tab.key === status.value) || tabs[0])

const searchFieldLabel = computed(
  () => searchFields.find((f) => f.value === searchField.value)?.label || '昵称'
)

const emptyText = computed(() => {
  if (trash.value) return '回收站是空的'
  if (searchKey.value) return `没有匹配的用户`
  if (status.value !== 'all') return `暂无「${currentTab.value.label}」的用户`
  return '暂无用户'
})

// ---------- 展示辅助 ----------
function isSelf(item) {
  return currentUid.value > 0 && Number(item?.id) === currentUid.value
}

function isProtected(item) {
  return isProtectedUser(item, currentUid.value)
}

function protectedText(item) {
  return protectedReason(item, currentUid.value)
}

const groupsOf = userGroupsOf

function isBanned(item) {
  return isUserBanned(item)
}

function banCountOf(item) {
  return Number(item?.result?.ban?.ban_count ?? item?.ban_count ?? 0) || 0
}

function userStatusClass(item) {
  const status = Number(item?.status)
  if (status === USER_STATUS_FROZEN) return 'is-frozen'
  if (status === USER_STATUS_AUDIT) return 'is-audit'
  return 'is-normal'
}

function userStatusIcon(item) {
  const status = Number(item?.status)
  if (status === USER_STATUS_FROZEN) return 'bi bi-snow'
  if (status === USER_STATUS_AUDIT) return 'bi bi-hourglass-split'
  return 'bi bi-person-check'
}

function banLine(item) {
  const record = banRecordOf(item)
  if (!record) return '该账号处于封禁状态'
  const parts = [banTypeText(record.ban_type), banDurationText(record.duration)]
  if (record.reason) parts.push(`原因：${record.reason}`)
  if (Number(record.expires_at) > 0) parts.push(`到期：${formatTime(record.expires_at)}`)
  return parts.join(' · ')
}

function timeText(item) {
  if (trash.value) return `删除于 ${fromNow(item.delete_time)}`
  return `注册于 ${fromNow(item.create_time)}`
}

// ---------- 数据加载 ----------
// 请求序号：快速切换筛选 / 搜索时丢弃过期响应，避免旧数据覆盖新结果
let reqSeq = 0

async function load() {
  const run = ++reqSeq
  loading.value = true
  try {
    const res = await listUsers(
      userListParams({
        key: trash.value ? USER_TRASH_KEY : status.value,
        page: page.value,
        limit: pageSize,
        keyword: searchKey.value,
        searchField: searchField.value,
        order: trash.value ? USER_TRASH_ORDER : sortKey.value
      })
    )
    if (run !== reqSeq) return
    list.value = res.data?.data || []
    total.value = res.data?.count || 0
    clearSelection()
  } catch {
    if (run !== reqSeq) return
    list.value = []
    total.value = 0
  } finally {
    if (run === reqSeq) loading.value = false
  }
}

function reload() {
  page.value = 1
  load()
}

function changePage(p) {
  if (p < 1 || p === page.value) return
  page.value = p
  load()
}

const doSearch = debounce(() => {
  searchKey.value = keyword.value
  reload()
}, 350)

// ---------- 筛选联动 ----------
function switchTab(key) {
  if (!trash.value && status.value === key) return
  trash.value = false
  status.value = key
  admin?.setActive(key)
  reload()
}

function toggleTrash() {
  trash.value = !trash.value
  admin?.setActive(trash.value ? USER_TRASH_KEY : status.value)
  reload()
}

// 父级统计卡片点击后的回调（key 与 tabs / trash 对应）
function applyFilter(key) {
  if (key === USER_TRASH_KEY) {
    if (trash.value && page.value === 1) return
    trash.value = true
    reload()
    return
  }
  const next = tabs.some((t) => t.key === key) ? key : 'all'
  if (!trash.value && status.value === next) return
  trash.value = false
  status.value = next
  reload()
}

admin?.registerFilter(applyFilter)
onUnmounted(() => admin?.unregisterFilter?.(applyFilter))

// ---------- 选中 ----------
// 系统管理员与当前登录账号不可批量操作（后端会拒绝），直接排除在可选范围外
const selectableUsers = computed(() => list.value.filter((u) => !isProtected(u)))
const selectedSet = computed(() => new Set(selectedIds.value))
const pageAllSelected = computed(
  () => selectableUsers.value.length > 0 && selectableUsers.value.every((u) => selectedSet.value.has(u.id))
)
const someSelected = computed(() => selectedIds.value.length > 0 && !pageAllSelected.value)

const selectAllRef = ref(null)

// 部分选中时展示半选态（indeterminate 只能通过 DOM 属性设置）
watchEffect(() => {
  if (selectAllRef.value) selectAllRef.value.indeterminate = someSelected.value
})

function isSelected(id) {
  return selectedSet.value.has(id)
}

function toggleSelect(id) {
  if (isProtected({ id })) return
  const next = new Set(selectedIds.value)
  if (next.has(id)) next.delete(id)
  else next.add(id)
  selectedIds.value = [...next]
}

function toggleSelectAll() {
  selectedIds.value = pageAllSelected.value ? [] : selectableUsers.value.map((u) => u.id)
}

function clearSelection() {
  selectedIds.value = []
}

// ---------- 确认弹窗 ----------
const confirm = reactive({
  visible: false,
  title: '操作确认',
  message: '',
  confirmText: '确定',
  danger: false,
  loading: false,
  action: null
})

function openConfirm({ title, message, confirmText = '确定', danger = false, action }) {
  confirm.title = title
  confirm.message = message
  confirm.confirmText = confirmText
  confirm.danger = danger
  confirm.action = action
  confirm.visible = true
}

async function runConfirm() {
  if (typeof confirm.action !== 'function') {
    confirm.visible = false
    return
  }
  confirm.loading = true
  try {
    const ok = await confirm.action()
    if (ok !== false) confirm.visible = false
  } catch {
    // 请求失败时保持弹窗打开，错误提示已由请求拦截器统一给出
  } finally {
    confirm.loading = false
  }
}

// ---------- 增删改统一收尾 ----------
// removedCount：本次从当前页移除的条数；当前页被清空时自动回退一页
async function afterMutation(removedCount = 0) {
  if (removedCount > 0 && list.value.length <= removedCount && page.value > 1) {
    page.value -= 1
  }
  await load()
  refreshStats()
}

function refreshStats() {
  admin?.refreshStats?.()
}

// ---------- 单条操作 ----------
async function changeStatus(item, value) {
  if (Number(item.status) === Number(value)) return
  busy.value = true
  try {
    const wasAudit = Number(item.status) === USER_STATUS_AUDIT
    await setUserStatus(item.id, value)
    item.status = value
    if (value === USER_STATUS_FROZEN) toast.success('账号已冻结')
    else if (value === USER_STATUS_AUDIT) toast.success('已标记为待审核')
    else toast.success(wasAudit ? '审核通过，账号已可登录' : '账号已解冻')
    // 状态筛选下该条目可能已不属于当前标签
    if (status.value !== 'all') await afterMutation(0)
    else refreshStats()
  } catch {
    /* 拦截器已提示 */
  } finally {
    busy.value = false
  }
}

function askUnban(item) {
  openConfirm({
    title: '解除封禁',
    message: `确定解除用户「${item.nickname || item.id}」的封禁吗？解封后其账号恢复正常使用。`,
    confirmText: '解除封禁',
    action: async () => {
      await unbanUser({ uid: Number(item.id) })
      toast.success('已解除封禁')
      await afterMutation(0)
    }
  })
}

function askRemove(item) {
  openConfirm({
    title: '删除用户',
    message: `确定删除用户「${item.nickname || item.id}」吗？删除后该账号无法登录，可在回收站找回。`,
    confirmText: '删除',
    danger: true,
    action: async () => {
      await removeUsers([item.id])
      toast.success('已移入回收站')
      await afterMutation(1)
    }
  })
}

function askForceDelete(item) {
  openConfirm({
    title: '彻底删除',
    message: `确定彻底删除用户「${item.nickname || item.id}」吗？此操作不可恢复！`,
    confirmText: '彻底删除',
    danger: true,
    action: async () => {
      await forceDeleteUsers([item.id])
      toast.success('已彻底删除')
      await afterMutation(1)
    }
  })
}

async function restore(item) {
  busy.value = true
  try {
    await restoreUsers([item.id])
    toast.success('已恢复')
    await afterMutation(1)
  } catch {
    /* 拦截器已提示 */
  } finally {
    busy.value = false
  }
}

// ---------- 批量操作 ----------
// 逐条调用（后端 status 仅支持单条），统计成功/失败
async function batchStatus(value) {
  const ids = [...selectedIds.value]
  if (!ids.length) return
  busy.value = true
  let ok = 0
  try {
    for (const id of ids) {
      try {
        await setUserStatus(id, value)
        const target = list.value.find((u) => Number(u.id) === Number(id))
        if (target) target.status = value
        ok += 1
      } catch {
        /* 单条失败不影响其它 */
      }
    }
  } finally {
    busy.value = false
  }
  clearSelection()
  toast.success(`操作完成：成功 ${ok} 位，失败 ${ids.length - ok} 位`)
  // 有失败条目或处于状态筛选下，重新拉取保证列表与统计准确
  if (ok !== ids.length || status.value !== 'all') await afterMutation(0)
  else refreshStats()
}

function askBatchRemove() {
  const ids = [...selectedIds.value]
  openConfirm({
    title: '批量删除',
    message: `确定删除选中的 ${ids.length} 位用户吗？删除后可在回收站找回。`,
    confirmText: '删除',
    danger: true,
    action: async () => {
      await removeUsers(ids)
      toast.success(`已删除 ${ids.length} 位`)
      clearSelection()
      await afterMutation(ids.length)
    }
  })
}

async function batchRestore() {
  const ids = [...selectedIds.value]
  if (!ids.length) return
  busy.value = true
  try {
    await restoreUsers(ids)
    toast.success(`已恢复 ${ids.length} 位`)
    clearSelection()
    await afterMutation(ids.length)
  } catch {
    /* 拦截器已提示 */
  } finally {
    busy.value = false
  }
}

function askBatchForceDelete() {
  const ids = [...selectedIds.value]
  openConfirm({
    title: '批量彻底删除',
    message: `确定彻底删除选中的 ${ids.length} 位用户吗？此操作不可恢复！`,
    confirmText: '彻底删除',
    danger: true,
    action: async () => {
      await forceDeleteUsers(ids)
      toast.success(`已彻底删除 ${ids.length} 位`)
      clearSelection()
      await afterMutation(ids.length)
    }
  })
}

function askClearRecycle() {
  openConfirm({
    title: '清空回收站',
    message: '确定清空回收站吗？回收站内所有用户将被彻底删除，不可恢复！',
    confirmText: '清空',
    danger: true,
    action: async () => {
      await clearUserRecycle()
      toast.success('回收站已清空')
      page.value = 1
      await afterMutation(0)
    }
  })
}

// ---------- 新建 / 编辑用户 ----------
const avatarFileRef = ref(null)
const uploading = ref(false)

const edit = reactive({
  visible: false,
  loading: false,
  mode: 'create',
  // 弹窗标题（与表单里的「头衔」edit.title 区分开，避免互相覆盖）
  dialogTitle: '',
  id: 0,
  account: '',
  nickname: '',
  email: '',
  phone: '',
  avatar: '',
  title: '',
  gender: '',
  description: '',
  remark: '',
  source: 'default',
  password: '',
  status: USER_STATUS_NORMAL
})

function resetEdit() {
  edit.id = 0
  edit.dialogTitle = ''
  edit.account = ''
  edit.nickname = ''
  edit.email = ''
  edit.phone = ''
  edit.avatar = ''
  edit.title = ''
  edit.gender = ''
  edit.description = ''
  edit.remark = ''
  edit.source = 'default'
  edit.password = ''
  edit.status = USER_STATUS_NORMAL
}

function openCreate() {
  resetEdit()
  edit.mode = 'create'
  edit.dialogTitle = '新建用户'
  edit.visible = true
}

function openEdit(item) {
  resetEdit()
  edit.mode = 'edit'
  edit.id = Number(item.id)
  edit.account = item.account || ''
  edit.nickname = item.nickname || ''
  edit.email = item.email || ''
  edit.phone = item.phone || ''
  edit.avatar = item.avatar || ''
  edit.title = item.title || ''
  edit.gender = item.gender === 'boy' || item.gender === 'girl' ? item.gender : ''
  edit.description = item.description || ''
  edit.remark = item.remark || ''
  edit.source = item.source || 'default'
  edit.status = [USER_STATUS_NORMAL, USER_STATUS_FROZEN, USER_STATUS_AUDIT].includes(Number(item.status))
    ? Number(item.status)
    : USER_STATUS_NORMAL
  edit.dialogTitle = `编辑用户 #${item.id}`
  edit.visible = true
}

function pickAvatar() {
  avatarFileRef.value?.click()
}

async function onAvatarChange(e) {
  const file = e.target.files?.[0]
  e.target.value = ''
  if (!file) return
  if (!file.type.startsWith('image/')) {
    toast.warning('请选择图片文件')
    return
  }
  if (file.size > 5 * 1024 * 1024) {
    toast.warning('图片不能超过 5MB')
    return
  }
  uploading.value = true
  try {
    const fd = new FormData()
    fd.append('files', file)
    const res = await uploadAttachments(fd)
    const url = res.data?.results?.[0]?.full_url || res.data?.results?.[0]?.url || ''
    if (!url) throw new Error('empty')
    edit.avatar = url
    toast.success('头像已上传')
  } catch {
    toast.error('头像上传失败')
  } finally {
    uploading.value = false
  }
}

function validateEdit() {
  const nickname = edit.nickname.trim()
  if (!nickname) {
    toast.warning('请输入昵称')
    return false
  }
  if (!/^[\u4e00-\u9fa5A-Za-z0-9_-]{1,32}$/.test(nickname)) {
    toast.warning('昵称只能是汉字、字母、数字、下划线或中划线，且不超过 32 位')
    return false
  }
  const account = edit.account.trim()
  if (account && !/^[A-Za-z0-9]{4,32}$/.test(account)) {
    toast.warning('账号只能由字母和数字组成，长度 4-32 位')
    return false
  }
  const email = edit.email.trim()
  if (edit.mode === 'create' && !email) {
    toast.warning('请输入邮箱')
    return false
  }
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    toast.warning('邮箱格式不正确')
    return false
  }
  const password = edit.password.trim()
  if (password && (password.length < 6 || password.length > 32)) {
    toast.warning('密码长度需为 6-32 位')
    return false
  }
  if (edit.description.length > 256) {
    toast.warning('个人简介最多 256 字')
    return false
  }
  return true
}

async function saveUser() {
  if (!validateEdit()) return

  const payload = {
    nickname: edit.nickname.trim(),
    avatar: edit.avatar.trim(),
    title: edit.title.trim(),
    gender: edit.gender,
    description: edit.description.trim()
  }
  // 管理员专属字段（后端仅 root 允许更新，非管理员会被静默忽略）
  // 留空则不提交，避免把「未填写」当成「要清空」触发后端的唯一性/格式校验
  const account = edit.account.trim()
  if (account) payload.account = account
  const email = edit.email.trim()
  if (email) payload.email = email
  const phone = edit.phone.trim()
  if (phone) payload.phone = phone
  const remark = edit.remark.trim()
  if (remark) payload.remark = remark
  const source = edit.source.trim()
  if (source) payload.source = source

  const password = edit.password.trim()
  if (password) payload.password = password

  edit.loading = true
  try {
    if (edit.mode === 'create') {
      payload.status = Number(edit.status)
      await createUser(payload)
      toast.success('用户已创建')
    } else {
      payload.id = edit.id
      // 系统管理员状态不允许修改，避免连带触发后端保护逻辑
      if (Number(edit.id) !== 1) payload.status = Number(edit.status)
      await updateUser(payload)
      toast.success('修改已保存')
    }
    edit.visible = false
    await afterMutation(0)
  } catch {
    // 失败提示由请求拦截器统一给出（如账号/邮箱已存在）
  } finally {
    edit.loading = false
  }
}

// ---------- 封禁 ----------
const ban = reactive({
  visible: false,
  loading: false,
  uid: 0,
  nickname: '',
  all: true,
  bits: [],
  durationMode: 'auto',
  reason: '违反社区规定',
  evidence: '',
  deleteContent: false,
  banAppeal: false,
  freezeUser: true
})

// 勾选「全面封禁」时取全部权限位；否则按勾选项按位或
const banTypeMask = computed(() => {
  if (ban.all) return BAN_TYPE_ALL
  return ban.bits.reduce((sum, bit) => sum | Number(bit), 0)
})

function openBan(item) {
  ban.uid = Number(item.id)
  ban.nickname = item.nickname || ''
  ban.all = true
  ban.bits = []
  ban.durationMode = 'auto'
  ban.reason = '违反社区规定'
  ban.evidence = ''
  ban.deleteContent = false
  ban.banAppeal = false
  ban.freezeUser = true
  ban.visible = true
}

async function submitBan() {
  if (!banTypeMask.value) {
    toast.warning('请至少选择一项限制，或勾选「全面封禁」')
    return
  }
  if (!ban.reason.trim()) {
    toast.warning('请输入封禁原因')
    return
  }

  const payload = {
    uid: ban.uid,
    ban_type: banTypeMask.value,
    reason: ban.reason.trim(),
    evidence: ban.evidence.trim(),
    delete_content: ban.deleteContent ? 1 : 0,
    ban_appeal: ban.banAppeal ? 1 : 0,
    freeze_user: ban.freezeUser ? 1 : 0
  }
  if (ban.durationMode === 'auto') {
    payload.auto_gradient = true
  } else {
    // 必须传字符串：后端对数字 0 会按「空值」处理并回落为自动梯度
    payload.duration = String(ban.durationMode)
  }

  ban.loading = true
  try {
    await banUser(payload)
    toast.success('已封禁该用户')
    ban.visible = false
    await afterMutation(0)
  } catch {
    /* 拦截器已提示 */
  } finally {
    ban.loading = false
  }
}

// ---------- 权限组 ----------
const groups = reactive({
  visible: false,
  loading: false,
  fetching: false,
  uid: 0,
  nickname: '',
  all: [],
  selected: []
})

async function openGroups(item) {
  groups.uid = Number(item.id)
  groups.nickname = item.nickname || ''
  groups.all = []
  groups.selected = userGroupsOf(item).map((g) => Number(g.id))
  groups.visible = true
  groups.fetching = true
  try {
    const res = await listAuthGroups()
    groups.all = res.data?.data || []
  } catch {
    groups.all = []
  } finally {
    groups.fetching = false
  }
}

async function saveGroups() {
  groups.loading = true
  try {
    await setUserAuthGroups(groups.uid, groups.selected)
    toast.success('权限组已更新')
    groups.visible = false
    await load()
  } catch {
    /* 拦截器已提示 */
  } finally {
    groups.loading = false
  }
}

onMounted(load)

onUnmounted(() => {
  reqSeq += 1
})
</script>

<style scoped>
.user-list {
  display: flex;
  flex-direction: column;
}

/* ---------- 头部 ---------- */
.list-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 16px;
}
.block-title {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
}
.block-desc {
  margin: 4px 0 0;
  font-size: 12px;
  color: var(--text-muted);
}
.head-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}

/* ---------- 筛选栏 ---------- */
.list-filter {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
  padding-bottom: 14px;
  border-bottom: 1px solid var(--border-soft);
}
.status-tabs {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}
.status-tab {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  /* 与筛选栏内的下拉 / 搜索框 / 按钮等高 */
  height: var(--control-h-sm);
  padding: 0 14px;
  font-size: 13px;
  border-radius: var(--radius-sm);
  border: 1px solid transparent;
  background: var(--bg-muted);
  color: var(--text-soft);
  cursor: pointer;
  transition: all 0.15s;
}
.status-tab:hover {
  color: var(--primary);
}
.status-tab.active {
  background: var(--primary);
  color: #fff;
}
.filter-right {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  margin-left: auto;
}
.search-box {
  position: relative;
  width: 200px;
}
.search-box .bi {
  position: absolute;
  left: 10px;
  top: 50%;
  transform: translateY(-50%);
  font-size: 13px;
  color: var(--text-light);
}
.search-input {
  width: 100%;
  height: var(--control-h-sm);
  padding: 0 12px 0 30px;
  font-size: 13px;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  background: var(--bg-card);
  color: var(--text);
  outline: none;
  transition: border-color 0.2s, box-shadow 0.2s;
}
.search-input:focus {
  border-color: var(--primary);
  box-shadow: 0 0 0 3px var(--accent-ring);
}

/* ---------- 批量操作栏 ---------- */
.batch-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 12px;
  padding: 10px 12px;
  background: var(--accent-wash);
  border: 1px solid var(--accent-soft);
  border-radius: var(--radius);
}
.batch-count {
  font-size: 13px;
  color: var(--text-soft);
}
.batch-count strong {
  color: var(--primary-deep);
}
.batch-actions {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 6px;
}

/* ---------- 回收站提示 ---------- */
.trash-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 12px;
  padding: 10px 12px;
  font-size: 12px;
  color: var(--warning);
  background: var(--gold-wash);
  border-radius: var(--radius);
}

/* ---------- 列表 ---------- */
.loading {
  padding: 40px;
  text-align: center;
  color: var(--text-muted);
}
.empty-row {
  padding: 12px 0;
}

.list-head-row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 8px 4px;
}
.list-head-text {
  font-size: 12px;
  color: var(--text-muted);
}

.user-items {
  display: flex;
  flex-direction: column;
}
.user-row {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 16px 8px;
  border-bottom: 1px dashed var(--border-soft);
  border-radius: var(--radius-sm);
  transition: background 0.15s;
}
.user-row:last-child {
  border-bottom: none;
}
.user-row.selected {
  background: var(--accent-wash);
}

.pick {
  display: flex;
  align-items: center;
  align-self: center;
  cursor: pointer;
}
.pick input {
  width: 15px;
  height: 15px;
  accent-color: var(--primary);
  cursor: pointer;
}
.pick input:disabled {
  cursor: not-allowed;
  opacity: 0.4;
}

.user-avatar {
  width: 46px;
  height: 46px;
  flex-shrink: 0;
  align-self: center;
  border-radius: 50%;
  object-fit: cover;
  background: var(--bg-muted);
  border: 1px solid var(--border);
}

.user-main {
  flex: 1;
  min-width: 0;
}
.user-name-row {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 6px;
}
.user-name {
  font-size: 15px;
  font-weight: 600;
  color: var(--text);
}

.flag {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  padding: 1px 8px;
  font-size: 11px;
  border-radius: 3px;
}
.flag.is-admin {
  color: var(--warning);
  background: var(--gold-wash);
}
.flag.is-self {
  color: var(--primary);
  background: var(--accent-soft);
}
.flag.is-group {
  color: var(--text-muted);
  background: var(--bg-muted);
}

.status-chip {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  padding: 1px 8px;
  font-size: 11px;
  border-radius: 3px;
}
.status-chip.is-normal {
  color: var(--success);
  background: rgba(108, 154, 77, 0.12);
}
.status-chip.is-audit {
  color: #0ea5e9;
  background: rgba(14, 165, 233, 0.12);
}
.status-chip.is-frozen {
  color: var(--warning);
  background: var(--gold-wash);
}
.status-chip.is-ban {
  color: var(--danger);
  background: var(--accent-soft);
}

.user-contact {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px;
  margin-bottom: 8px;
  font-size: 12px;
  color: var(--text-soft);
}
.contact-item {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}
.contact-item.is-empty {
  color: var(--text-light);
}

.user-meta {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 10px;
  font-size: 12px;
  color: var(--text-muted);
}
.meta-chip {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  padding: 2px 8px;
  background: var(--bg-muted);
  border-radius: 3px;
}
.meta-text {
  display: inline-flex;
  align-items: center;
  gap: 3px;
}
.meta-text.is-warn {
  color: var(--warning);
}

.ban-line {
  display: flex;
  align-items: center;
  gap: 4px;
  margin: 8px 0 0;
  font-size: 12px;
  line-height: 1.6;
  color: var(--danger);
  word-break: break-word;
}

.user-actions {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 4px;
  flex-shrink: 0;
  align-self: center;
  justify-content: flex-end;
}
.user-actions .danger:hover:not(:disabled) {
  border-color: var(--danger);
  color: var(--danger);
}
.user-actions .ok:hover:not(:disabled) {
  border-color: var(--success);
  color: var(--success);
}
.user-actions .btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* ---------- 账号状态单选（正常 / 待审核 / 冻结） ---------- */
.status-switch {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  padding: 2px;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  background: var(--bg-muted);
}
.status-option {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 22px;
  border-radius: 3px;
  color: var(--text-light);
  cursor: pointer;
  transition: background 0.15s, color 0.15s;
}
/* 原生单选框只保留语义与键盘操作，视觉交给 .status-option */
.status-radio {
  position: absolute;
  width: 1px;
  height: 1px;
  opacity: 0;
  pointer-events: none;
}
.status-option:hover:not(.active):not(.is-disabled) {
  background: var(--bg-card);
  color: var(--primary);
}
.status-option:focus-within {
  outline: 2px solid var(--primary);
  outline-offset: 1px;
}
.status-option.is-disabled {
  cursor: not-allowed;
  opacity: 0.6;
}
.status-option.active.is-normal {
  background: rgba(108, 154, 77, 0.14);
  color: var(--success);
}
.status-option.active.is-audit {
  background: rgba(14, 165, 233, 0.14);
  color: #0ea5e9;
}
.status-option.active.is-frozen {
  background: var(--gold-wash);
  color: var(--warning);
}

/* ---------- 弹窗表单 ---------- */
.dialog-tip {
  margin: 0 0 16px;
  padding: 10px 12px;
  font-size: 13px;
  line-height: 1.7;
  color: var(--text-soft);
  background: var(--bg-muted);
  border-radius: var(--radius);
}
.dialog-tip strong {
  color: var(--text);
}
.dialog-empty {
  padding: 24px 0;
  text-align: center;
  font-size: 13px;
  color: var(--text-muted);
}

.form-section + .form-section {
  margin-top: 18px;
  padding-top: 16px;
  border-top: 1px dashed var(--border-soft);
}
.section-title {
  margin: 0 0 12px;
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.06em;
  color: var(--text-muted);
}
/* 弹窗内字段间距略收紧，避免分组叠加后表单过长 */
.form-section .form-item {
  margin-bottom: 14px;
}
.form-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0 12px;
}
.form-hint {
  margin: 6px 0 0;
  font-size: 12px;
  line-height: 1.6;
  color: var(--text-muted);
}

.check-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 4px 12px;
  margin-top: 8px;
}
.check-grid.is-block {
  grid-template-columns: 1fr;
  margin-top: 0;
}
.check-line {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 5px 0;
  font-size: 13px;
  color: var(--text-soft);
  cursor: pointer;
}
.check-line input {
  width: 15px;
  height: 15px;
  flex-shrink: 0;
  accent-color: var(--primary);
  cursor: pointer;
}
.check-line.is-danger span {
  color: var(--danger);
}
.group-key {
  padding: 0 6px;
  font-size: 11px;
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  color: var(--primary-deep);
  background: var(--accent-soft);
  border-radius: 3px;
}
.root-flag {
  margin-left: 6px;
  padding: 0 6px;
  font-size: 11px;
  color: var(--warning);
  background: var(--gold-wash);
  border-radius: 3px;
}

.avatar-row {
  display: flex;
  align-items: flex-start;
  gap: 12px;
}
.avatar-box {
  position: relative;
  width: 64px;
  height: 64px;
  flex-shrink: 0;
  border-radius: 50%;
  overflow: hidden;
  border: 1px solid var(--border);
  background: var(--bg-muted);
}
.avatar-box img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.avatar-empty {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
  font-size: 11px;
  color: var(--text-light);
  cursor: pointer;
  transition: color 0.2s;
}
.avatar-empty:hover {
  color: var(--primary);
}
.avatar-del {
  position: absolute;
  right: 0;
  top: 0;
  width: 18px;
  height: 18px;
  border: none;
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.55);
  color: #fff;
  font-size: 11px;
  line-height: 1;
  cursor: pointer;
}
.avatar-fields {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.avatar-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

@media (max-width: 768px) {
  .list-filter {
    gap: 8px;
  }
  .filter-right {
    width: 100%;
    margin-left: 0;
  }
  .search-box {
    width: 100%;
  }
  .user-row {
    flex-wrap: wrap;
  }
  .user-main {
    flex: 1 1 60%;
  }
  .user-actions {
    width: 100%;
  }
  .form-grid,
  .check-grid {
    grid-template-columns: 1fr;
  }
}
</style>
