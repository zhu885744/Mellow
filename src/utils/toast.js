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
    z-index: 9999;
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
  const colors = {
    info: { bg: '#fff', border: '#e8e6dd', color: '#2a2a2a' },
    success: { bg: '#f0f7eb', border: '#c2d9b3', color: '#3d6b2c' },
    error: { bg: '#fbecec', border: '#f0c2c2', color: '#a3362f' },
    warning: { bg: '#fff5e0', border: '#e8d3a0', color: '#8a6e44' }
  }
  const c1 = colors[type] || colors.info
  el.style.cssText = `
    padding: 10px 18px;
    background: ${c1.bg};
    border: 1px solid ${c1.border};
    border-radius: 8px;
    color: ${c1.color};
    box-shadow: 0 4px 16px rgba(60, 50, 30, 0.08);
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