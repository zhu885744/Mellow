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

app.mount('#app')