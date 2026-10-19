/**
 * 后台菜单（侧边栏 / 概览页快捷跳转）共享口径
 *
 * 页面清单来自 auth-pages 接口（动态，含名称 / 图标 / 权限 hash），
 * 这里只负责「分组顺序 + 权限过滤 + 图标解析」三件事：
 * - 侧边栏（views/admin/Layout.vue）与概览页快捷跳转（views/admin/Dashboard.vue）
 *   共用同一份结果，避免出现「侧边栏有、快捷入口没有」或权限过滤不一致；
 * - 新增后台页面时只需在 ADMIN_MENU_GROUPS 里补一条路径（想固定在「概览」下方则加到 ADMIN_PINNED）。
 */
import { adminAllowedPaths } from '@/utils/helper'
import { cache } from '@/utils/cache'

// 分组定义：与参考主题一致（创作 / 管理 / 安全）
export const ADMIN_MENU_GROUPS = [
  {
    name: 'create',
    label: '创作',
    items: [
      '/admin/article/write', '/admin/article', '/admin/article/group',
      '/admin/pages', '/admin/pages/write', '/admin/docs', '/admin/moments'
    ]
  },
  {
    name: 'manage',
    label: '管理',
    items: [
      '/admin/users', '/admin/comment', '/admin/placard', '/admin/banner',
      '/admin/tags', '/admin/level', '/admin/exp', '/admin/goods', '/admin/integral',
      '/admin/decoration', '/admin/checkin', '/admin/message', '/admin/reports',
      '/admin/links', '/admin/links/group', '/admin/attachment', '/admin/logs', '/admin/system'
    ]
  },
  {
    name: 'security',
    label: '安全',
    items: [
      '/admin/auth/rules', '/admin/auth/group', '/admin/api/keys', '/admin/auth/pages',
      '/admin/ip/black', '/admin/ip/white', '/admin/qps/warn'
    ]
  }
]

/**
 * 置顶入口：固定显示在侧边栏「概览」正下方，**不参与**创作 / 管理 / 安全分组
 * （侧边栏不显示它的分组标题；概览页快捷跳转里以 label 作为分组标题）
 * 数据统计是实时资源 / 数据库 / 在线用户，属于「看板」性质，与概览同级更顺手
 */
export const ADMIN_PINNED = {
  name: 'pinned',
  label: '置顶',
  items: ['/admin/stats']
}

// 置顶路径：从分组里排除，避免同一个页面上两处出现
const PINNED_PATHS = new Set(ADMIN_PINNED.items)

// icon 名称 → Bootstrap Icons（仅用于展示；auth-pages 自带 svg 优先）
const FALLBACK_ICONS = {
  article: 'bi bi-file-earmark-text',
  group: 'bi bi-collection',
  user: 'bi bi-people',
  comment: 'bi bi-chat-square-text',
  bell: 'bi bi-bell',
  banner: 'bi bi-images',
  tag: 'bi bi-tag',
  level: 'bi bi-bar-chart',
  link: 'bi bi-link-45deg',
  system: 'bi bi-gear',
  open: 'bi bi-box-arrow-up-right',
  rule: 'bi bi-shield-check',
  key: 'bi bi-key',
  qps: 'bi bi-speedometer2',
  black: 'bi bi-shield-x',
  white: 'bi bi-shield-plus',
  file: 'bi bi-paperclip'
}

/**
 * 解析菜单图标：
 * 1. 后端已是 Bootstrap Icons 类名（"bi bi-bag" 或 "bi-bag"）→ 直接使用；
 * 2. 旧版短名（article / group …）→ 查 FALLBACK_ICONS 映射；
 * 3. 其余 → 兜底圆圈。
 * 这样新老数据库（auth-pages.icon 两种形态）都能正确展示。
 */
export function resolveAdminIcon(name) {
  if (typeof name !== 'string' || !name.trim()) return 'bi bi-circle'
  const value = name.trim()
  if (value.includes('bi-')) return value.startsWith('bi ') ? value : `bi ${value}`
  return FALLBACK_ICONS[value] || 'bi bi-circle'
}

/**
 * 菜单上下文：页面字典 + 允许访问的 path 集合（null = 拥有全部页面）
 */
function menuContext(user, flat) {
  const list = Array.isArray(flat) ? flat : []
  if (!list.length) return null

  return {
    allowedPaths: adminAllowedPaths(user, list),
    byPath: Object.fromEntries(list.map((p) => [p.path, p]))
  }
}

/**
 * 取出一批 path 对应的菜单项（仅保留系统实际存在 + 当前账号有权限的页面）
 */
function pickMenuItems(paths, allowedPaths, byPath) {
  return paths
    .filter((path) => byPath[path]) // 仅保留系统实际存在的页面
    .filter((path) => !allowedPaths || allowedPaths.has(path)) // 按权限过滤
    .map((path) => {
      const page = byPath[path]
      const svg = page.svg || (typeof page.icon === 'string' && page.icon.includes('<svg') ? page.icon : '')
      return {
        path,
        name: page.name || path,
        icon: svg ? '' : resolveAdminIcon(page.icon),
        isSvg: !!svg,
        svg
      }
    })
}

/**
 * 构建后台菜单（已按当前账号权限过滤，仅保留系统实际存在的页面）
 *
 * 置顶页面（ADMIN_PINNED）会从分组里排除，它由 buildAdminPinnedItems 单独提供，
 * 避免同一个页面在侧边栏出现两次。
 *
 * @param {object} user 当前登录用户（权限取自 user.result.auth / user.auth）
 * @param {Array}  flat auth-pages 扁平列表
 * @returns {Array<{name:string,label:string,children:Array}>}
 */
export function buildAdminMenus(user, flat) {
  const ctx = menuContext(user, flat)
  if (!ctx) return []

  return ADMIN_MENU_GROUPS
    .map((group) => ({
      name: group.name,
      label: group.label,
      children: pickMenuItems(group.items.filter((path) => !PINNED_PATHS.has(path)), ctx.allowedPaths, ctx.byPath)
    }))
    .filter((group) => group.children.length)
}

/**
 * 构建置顶入口（固定显示在「概览」下方，与普通菜单同一套权限过滤 / 图标解析）
 */
export function buildAdminPinnedItems(user, flat) {
  const ctx = menuContext(user, flat)
  if (!ctx) return []

  return pickMenuItems(ADMIN_PINNED.items, ctx.allowedPaths, ctx.byPath)
}

/**
 * 菜单 path → 「最长前缀匹配」的后台页面
 * 例：/admin/article/edit/3 → /admin/article
 */
export function pageOfPath(flat, path) {
  const list = Array.isArray(flat) ? flat : []
  let matched = null
  list.forEach((page) => {
    if ((path === page.path || path.startsWith(`${page.path}/`)) && (!matched || page.path.length > matched.path.length)) {
      matched = page
    }
  })
  return matched
}

// ---------- 最近访问（概览页快捷跳转专用，存 localStorage） ----------
const RECENT_KEY = 'admin-recent-paths'
const RECENT_LIMIT = 6

/**
 * 记录一次后台页面访问（只记菜单级 path，编辑页等子路由会被归一到菜单页）
 */
export function rememberAdminPath(path) {
  if (typeof path !== 'string' || !path.startsWith('/admin/') || path === '/admin/dashboard') return

  const history = getRecentAdminPaths().filter((item) => item !== path)
  history.unshift(path)
  cache.set(RECENT_KEY, history.slice(0, RECENT_LIMIT))
}

/**
 * 读取最近访问列表（最新在前）
 */
export function getRecentAdminPaths() {
  const value = cache.get(RECENT_KEY)
  if (!Array.isArray(value)) return []
  return value.filter((item) => typeof item === 'string' && item.startsWith('/admin/')).slice(0, RECENT_LIMIT)
}
