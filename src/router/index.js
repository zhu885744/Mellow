import { createRouter, createWebHistory } from 'vue-router'

const routes = [
  {
    path: '/',
    component: () => import('@/layouts/MainLayout.vue'),
    children: [
      { path: '', name: 'home', component: () => import('@/views/home/Index.vue') },
      { path: 'articles', name: 'articles', component: () => import('@/views/article/List.vue') },
      { path: 'archives/:id', name: 'article-detail', component: () => import('@/views/article/Detail.vue'), props: true },
      { path: 'archives', name: 'archives', component: () => import('@/views/article/Archives.vue') },
      { path: 'tags', name: 'tags', component: () => import('@/views/article/TagList.vue') },
      { path: 'tag/:key', name: 'tag', component: () => import('@/views/article/TagDetail.vue'), props: true },
      { path: 'categories', name: 'categories', component: () => import('@/views/article/CategoryList.vue') },
      { path: 'category/:key', name: 'category', component: () => import('@/views/article/CategoryDetail.vue'), props: true },
      { path: 'moments', name: 'moments', component: () => import('@/views/moments/Index.vue') },
      { path: 'links', name: 'links', component: () => import('@/views/links/Index.vue') },
      { path: 'settings', name: 'settings', component: () => import('@/views/functions.vue'), meta: { auth: true } },
      { path: 'about', name: 'about', component: () => import('@/views/page/Index.vue'), props: { key: 'about' } },
      // 用户主页 /author/:id（必须在 /:key 之前，避免被兜底路由拦截）
      { path: 'author/:id', name: 'author', component: () => import('@/views/user/Author.vue'), props: true },
      // 独立页面 /:key（必须放在最后，避免与其他固定路径冲突）
      { path: ':key', name: 'page', component: () => import('@/views/page/Index.vue'), props: true },
      {
        path: 'user',
        component: () => import('@/views/user/Layout.vue'),
        meta: { auth: true },
        children: [
          { path: '', redirect: '/user/profile' },
          { path: 'profile', name: 'user-profile', component: () => import('@/views/user/Profile.vue') },
          { path: 'contact', name: 'user-contact', component: () => import('@/views/user/Contact.vue') },
          { path: 'security', name: 'user-security', component: () => import('@/views/user/Security.vue') },
          { path: 'collections', name: 'user-collections', component: () => import('@/views/user/Collections.vue') },
          { path: 'likes', name: 'user-likes', component: () => import('@/views/user/Likes.vue') },
          { path: 'notifications', name: 'user-notifications', component: () => import('@/views/user/Notifications.vue') }
        ]
      }
    ]
  },
  {
    path: '/auth',
    component: () => import('@/layouts/AuthLayout.vue'),
    children: [
      { path: 'login', name: 'login', component: () => import('@/views/auth/Login.vue') },
      { path: 'register', name: 'register', component: () => import('@/views/auth/Register.vue') },
      { path: 'forgot', name: 'forgot', component: () => import('@/views/auth/Forgot.vue') }
    ]
  },
  { path: '/:pathMatch(.*)*', name: 'not-found', component: () => import('@/views/NotFound.vue') }
]

const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior(_to, _from, saved) {
    if (saved) return saved
    return { top: 0 }
  }
})

router.beforeEach((to, _from, next) => {
  if (to.meta.auth) {
    const userStr = localStorage.getItem('blog_user')
    if (!userStr || userStr === 'null') {
      next({ name: 'login', query: { redirect: to.fullPath } })
      return
    }
  }
  next()
})

export default router