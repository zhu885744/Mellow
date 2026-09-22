/**
 * 附件（attachment）领域公共逻辑
 *
 * 后台附件管理的类型分组、图标、体积格式化统一在这里维护，
 * 列表与统计共用同一份扩展名分组，避免口径分叉。
 */

// 列表字段：不含 file_hash（无需展示），保留定位与展示需要的全部字段
export const ATTACHMENT_FIELD =
  'id,uuid,original_name,save_name,save_path,full_url,file_size,mime_type,file_ext,storage_driver,uploader_id,target_type,target_id,create_time,update_time,delete_time'

/** 扩展名分组：用于类型筛选（where.file_ext 的 $in / $nin） */
export const ATTACHMENT_EXT_GROUPS = {
  image: ['png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp', 'svg', 'ico', 'avif', 'tiff'],
  video: ['mp4', 'webm', 'avi', 'mov', 'mkv', 'flv', 'wmv', 'm3u8'],
  audio: ['mp3', 'wav', 'ogg', 'flac', 'm4a', 'aac', 'wma'],
  doc: ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt', 'md', 'csv', 'rtf'],
  archive: ['zip', 'rar', '7z', 'tar', 'gz', 'bz2']
}

/** 类型下拉（value 与 ATTACHMENT_EXT_GROUPS 的 key 对应，other 需排除已知类型） */
export const ATTACHMENT_TYPE_OPTIONS = [
  { value: '', label: '全部类型' },
  { value: 'image', label: '图片' },
  { value: 'video', label: '视频' },
  { value: 'audio', label: '音频' },
  { value: 'doc', label: '文档' },
  { value: 'archive', label: '压缩包' },
  { value: 'other', label: '其他' }
]

/** 类型文案 */
const ATTACHMENT_TYPE_LABELS = {
  image: '图片',
  video: '视频',
  audio: '音频',
  doc: '文档',
  archive: '压缩包',
  other: '其他'
}

/** 类型 -> Bootstrap Icons */
const ATTACHMENT_TYPE_ICONS = {
  image: 'bi bi-file-earmark-image',
  video: 'bi bi-file-earmark-play',
  audio: 'bi bi-file-earmark-music',
  doc: 'bi bi-file-earmark-text',
  archive: 'bi bi-file-earmark-zip',
  other: 'bi bi-file-earmark'
}

/** 扩展名归一化（去点、转小写） */
export function normalizeExt(ext) {
  return String(ext ?? '')
    .trim()
    .replace(/^\./, '')
    .toLowerCase()
}

/** 判断附件类型：图片 / 视频 / 音频 / 文档 / 压缩包 / 其他 */
export function attachmentTypeOf(item) {
  const ext = normalizeExt(item?.file_ext)
  for (const [type, list] of Object.entries(ATTACHMENT_EXT_GROUPS)) {
    if (list.includes(ext)) return type
  }
  return 'other'
}

/** 类型文案 */
export function attachmentTypeLabel(item) {
  return ATTACHMENT_TYPE_LABELS[attachmentTypeOf(item)] || '其他'
}

/** 类型图标 */
export function attachmentIcon(item) {
  return ATTACHMENT_TYPE_ICONS[attachmentTypeOf(item)] || ATTACHMENT_TYPE_ICONS.other
}

/** 是否可直接用 <img> 预览（svg 按代码处理，这里同样可预览） */
export function isPreviewableImage(item) {
  return attachmentTypeOf(item) === 'image'
}

/**
 * 构造类型筛选的 where 条件（JSON 字符串）
 *
 * 已知类型用 file_ext 的 $in；「其他」用 $nin 排除全部已知扩展名。
 * 无条件时返回 null（调用方不要传 where）。
 */
export function attachmentWhereJSON(type) {
  if (!type) return null
  if (type === 'other') {
    const known = Object.values(ATTACHMENT_EXT_GROUPS).flat()
    return JSON.stringify({ file_ext: { $nin: known } })
  }
  const list = ATTACHMENT_EXT_GROUPS[type]
  if (!list?.length) return null
  return JSON.stringify({ file_ext: { $in: list } })
}

/** 体积格式化：1024 进制，保留一位小数（字节不保留） */
export function formatFileSize(bytes) {
  const size = Number(bytes || 0)
  if (!Number.isFinite(size) || size <= 0) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  const index = Math.min(Math.floor(Math.log(size) / Math.log(1024)), units.length - 1)
  const value = size / Math.pow(1024, index)
  return `${index === 0 ? Math.round(value) : value.toFixed(1)} ${units[index]}`
}

/** 搜索关键字清理：剔除会干扰后端 LIKE「字段名|值」格式的字符 */
export function sanitizeAttachmentKeyword(keyword) {
  return String(keyword ?? '')
    .replace(/['"\\%_|]/g, '')
    .trim()
}
