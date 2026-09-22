/**
 * 权限规则（auth-rules）领域公共逻辑
 *
 * 规则类型与请求方法的取值、展示文案、筛选条件统一在这里维护，
 * 列表与统计共用同一份定义，避免口径分叉。
 */

// 列表字段：hash 用于与权限分组的授权内容对照
export const AUTH_RULE_FIELD =
  'id,name,method,route,type,hash,cost,remark,create_time,update_time,delete_time'

/**
 * 规则类型：共三种（见 app/api/middleware/rule.go 的判定分支）
 * - common  公共接口：中间件直接放行，不校验登录态
 * - login   需登录：已登录即放行，不校验权限点
 * - default 默认：需具备对应权限点 [METHOD][route]，否则返回「无权限！」
 *
 * 说明：后端初始化数据里还有 type=root（如 exp/give、积分卡密接口），
 * 但中间件并未对它做特殊判定，行为与 default 完全一致（只是语义标注），
 * 因此这里不单列；库里若存在 root，列表会原样展示该值，不会丢数据。
 */
export const AUTH_RULE_TYPES = [
  { value: 'default', label: '默认（需权限点）', color: 'var(--text-muted)' },
  { value: 'common', label: '公共（免登录）', color: 'var(--success)' },
  { value: 'login', label: '需登录', color: '#0ea5e9' }
]

// 请求方法（后端会把 method 统一转大写后参与 hash 计算）
export const AUTH_RULE_METHODS = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH']

/** 类型下拉 */
export const AUTH_RULE_TYPE_OPTIONS = [
  { value: '', label: '全部类型' },
  ...AUTH_RULE_TYPES.map(({ value, label }) => ({ value, label }))
]

/** 方法下拉 */
export const AUTH_RULE_METHOD_OPTIONS = [
  { value: '', label: '全部方法' },
  ...AUTH_RULE_METHODS.map((m) => ({ value: m, label: m }))
]

/** 搜索字段白名单（后端 like 参数只支持「字段名|值」单字段匹配） */
export const AUTH_RULE_SEARCH_FIELDS = [
  { value: 'name', label: '规则名称' },
  { value: 'route', label: '路由' },
  { value: 'remark', label: '备注' }
]

/**
 * 类型文案
 * 未知类型（如后端标注用的 root）原样返回，避免把真实数据展示成别的类型
 */
export function authRuleTypeLabel(item) {
  const type = String(item?.type || 'default')
  return AUTH_RULE_TYPES.find((t) => t.value === type)?.label || type
}

/** 方法统一转大写展示 */
export function authRuleMethodText(item) {
  return String(item?.method || 'GET').toUpperCase()
}

/**
 * 构造筛选条件（JSON 字符串）
 * 类型与方法可叠加；都为空时返回 null（调用方不要传 where）
 */
export function authRuleWhereJSON(type, method) {
  const where = {}
  if (type) where.type = type
  if (method) where.method = method
  return Object.keys(where).length ? JSON.stringify(where) : null
}

/** 搜索关键字清理：剔除会干扰后端 LIKE「字段名|值」格式的字符 */
export function sanitizeAuthRuleKeyword(keyword) {
  return String(keyword ?? '')
    .replace(/['"\\%_|]/g, '')
    .trim()
}
