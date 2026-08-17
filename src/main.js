import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'
import 'bootstrap-icons/font/bootstrap-icons.css'
import './assets/styles.css'
import { useUserStore } from './stores/user'

const app = createApp(App)
const pinia = createPinia()

app.use(pinia)
app.use(router)

// 应用启动时恢复登录态并拉取站点信息
const userStore = useUserStore()
userStore.restore()
userStore.ensureLogin()
userStore.fetchSiteInfo()

app.mount('#app')