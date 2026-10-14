import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'
import 'bootstrap-icons/font/bootstrap-icons.css'
import './assets/styles.css'
import { useUserStore } from './stores/user'
import { useThemeStore } from './stores/theme'

const app = createApp(App)
const pinia = createPinia()

app.use(pinia)
app.use(router)

// 恢复主题设置（index.html 内联脚本已预设，这里同步到 store 并监听系统变化）
useThemeStore().init()

// 应用启动时恢复登录态并拉取站点信息
const userStore = useUserStore()
userStore.restore()
userStore.ensureLogin()
userStore.fetchSiteInfo()

// v-html 渲染出来的正文（评论 / 动态 / 文章里的 @提及、#话题#）用的是普通 <a>，
// 直接点击会整页刷新；这里统一拦成 SPA 跳转。
// 只拦自己渲染的 .mention / .hashtag，避免影响 router-link（它自带跳转，重复处理会跳两次）。
document.addEventListener('click', (event) => {
  if (event.defaultPrevented || event.button !== 0) return
  if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return

  const link = event.target?.closest?.('a.mention[href^="/author/"], a.hashtag[href^="/topic/"]')
  if (!link) return

  event.preventDefault()
  router.push(link.getAttribute('href'))
})

app.mount('#app')