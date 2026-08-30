/**
 * 简易 toast 工具（避免引入额外 UI 库）
 */
let container = null

function getContainer() {
  if (container) return container
  container = document.createElement('div')
  container.id = 'toast-container'
  container.style.cssText = `
    position: fixed;
    top: 24px;
    left: 50%;
    transform: translateX(-50%);
    z-index: 99999;
    display: flex;
    flex-direction: column;
    gap: 8px;
    pointer-events: none;
  `
  document.body.appendChild(container)
  return container
}

function showToast(message, type = 'info', duration = 2400) {
  const c = getContainer()
  const el = document.createElement('div')
  // 使用 CSS 变量，自动适配明暗主题
  const colors = {
    info: { bg: 'var(--bg-card)', border: 'var(--border)', color: 'var(--text)' },
    success: { bg: 'var(--bg-card)', border: 'var(--success)', color: 'var(--success)' },
    error: { bg: 'var(--bg-card)', border: 'var(--danger)', color: 'var(--danger)' },
    warning: { bg: 'var(--bg-card)', border: 'var(--warning)', color: 'var(--warning)' }
  }
  const c1 = colors[type] || colors.info
  el.style.cssText = `
    padding: 10px 18px;
    background: ${c1.bg};
    border: 1px solid ${c1.border};
    border-radius: 8px;
    color: ${c1.color};
    box-shadow: var(--shadow);
    font-size: 14px;
    max-width: 360px;
    pointer-events: auto;
    animation: toastIn 0.25s ease-out;
  `
  el.textContent = message
  c.appendChild(el)
  setTimeout(() => {
    el.style.transition = 'opacity 0.3s, transform 0.3s'
    el.style.opacity = '0'
    el.style.transform = 'translateY(-6px)'
    setTimeout(() => el.remove(), 300)
  }, duration)
}

// 注入一次性动画
if (typeof document !== 'undefined' && !document.getElementById('toast-style')) {
  const style = document.createElement('style')
  style.id = 'toast-style'
  style.textContent = `@keyframes toastIn { from { opacity: 0; transform: translateY(-8px); } to { opacity: 1; transform: translateY(0); } }`
  document.head.appendChild(style)
}

export const toast = {
  info: (m) => showToast(m, 'info'),
  success: (m) => showToast(m, 'success'),
  error: (m) => showToast(m, 'error'),
  warning: (m) => showToast(m, 'warning')
}