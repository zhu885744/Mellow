import { defineStore } from 'pinia'

const THEME_KEY = 'mellow_theme'

function systemPrefersDark() {
  return typeof window !== 'undefined' &&
    window.matchMedia?.('(prefers-color-scheme: dark)').matches
}

/**
 * 主题状态：light / dark / auto（跟随系统）
 * 实际生效主题写入 <html data-theme>，配合 index.html 内联脚本避免刷新闪烁
 */
export const useThemeStore = defineStore('theme', {
  state: () => ({
    mode: 'auto'
  }),
  getters: {
    resolved: (state) => {
      if (state.mode === 'auto') return systemPrefersDark() ? 'dark' : 'light'
      return state.mode
    },
    isDark() {
      return this.resolved === 'dark'
    }
  },
  actions: {
    init() {
      try {
        const saved = localStorage.getItem(THEME_KEY)
        if (saved === 'light' || saved === 'dark' || saved === 'auto') {
          this.mode = saved
        }
      } catch {
        /* localStorage 不可用时保持 auto */
      }
      this.apply()
      // 跟随系统：auto 模式下系统切换主题时实时响应
      window.matchMedia?.('(prefers-color-scheme: dark)')
        .addEventListener?.('change', () => {
          if (this.mode === 'auto') this.apply()
        })
    },
    set(mode) {
      this.mode = mode
      try {
        localStorage.setItem(THEME_KEY, mode)
      } catch {
        /* 忽略持久化失败 */
      }
      this.apply()
    },
    /** 循环切换：auto -> light -> dark -> auto */
    cycle() {
      const next = this.mode === 'auto' ? 'light' : this.mode === 'light' ? 'dark' : 'auto'
      this.set(next)
    },
    apply() {
      document.documentElement.dataset.theme = this.resolved
    }
  }
})
