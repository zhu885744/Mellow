import { createRouter, createWebHistory } from 'vue-router'

const routes = [
  {
    path: '/',
    component: () => import('@/layouts/MainLayout.vue'),
    children: [
      { path: '', name: 'home', component: () => import('@/views/home/Index.vue') },
      { path: 'articles', name: 'articles', component: () => import('@/views/article/List.vue') },
      { path: 'articles/:id', name: 'article-detail', component: () => import('@/views/article/Detail.vue'), props: true },
      { path: 'moments', name: 'moments', component: () => import('@/views/moments/Index.vue') },
      { path: 'links', name: 'links', component: () => import('@/views/links/Index.vue') },
      { path: 'archives', name: 'archives', component: () => import('@/views/article/Archives.vue') },
      { path: 'settings', name: 'settings', component: () => import('@/views/functions.vue'), meta: { auth: true } },
      { path: 'page/:key', name: 'page', component: () => import('@/views/page/Index.vue'), props: true },
      { path: 'about', name: 'about', component: () => import('@/views/page/Index.vue'), props: { key: 'about' } },
      {
        path: 'user',
        component: () => import('@/views/user/Layout.vue'),
        meta: { auth: true },
        children: [
          { path: '', redirect: '/user/profile' },
          { path: 'profile', name: 'user-profile', component: () => import('@/views/user/Profile.vue') },
          { path: 'security', name: 'user-security', component: () => import('@/views/user/Security.vue') },
          { path: 'collections', name: 'user-collections', component: () => import('@/views/user/Collections.vue') },
          { path: 'likes', name: 'user-likes', component: () => import('@/views/user/Likes.vue') },
          { path: 'notifications', name: 'user-notifications', component: () => import('@/views/user/Notifications.vue') },
          { path: 'exp', name: 'user-exp', component: () => import('@/views/user/Exp.vue') }
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
  scrollBehavior(to, from, saved) {
    if (saved) return saved
    return { top: 0 }
  }
})

router.beforeEach((to, from, next) => {
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