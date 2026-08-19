import { createRouter, createWebHistory } from 'vue-router'

const routes = [
  {
    path: '/',
    component: () => import('@/layouts/MainLayout.vue'),
    children: [
      { path: '', name: 'home', component: () => import('@/views/home/Index.vue') },
      { path: 'articles', name: 'articles', component: () => import('@/views/article/List.vue') },
      { path: 'archives/:id', name: 'article-detail', component: () => import('@/views/article/Detail.vue') },
      { path: 'archives', name: 'archives', component: () => import('@/views/article/Archives.vue') },
      { path: 'tags', name: 'tags', component: () => import('@/views/article/TagList.vue') },
      { path: 'tag/:key', name: 'tag', component: () => import('@/views/article/TagDetail.vue'), props: true },
      { path: 'categories', name: 'categories', component: () => import('@/views/article/CategoryList.vue') },
      { path: 'category/:key', name: 'category', component: () => import('@/views/article/CategoryDetail.vue'), props: true },
      { path: 'moments', name: 'moments', component: () => import('@/views/moments/Index.vue') },
      { path: 'moments/:id', name: 'moment-detail', component: () => import('@/views/moments/Detail.vue'), props: true },
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
    path: '/admin',
    component: () => import('@/views/admin/Layout.vue'),
    meta: { auth: true },
    children: [
      { path: '', redirect: '/admin/dashboard' },
      { path: 'dashboard', name: 'admin-dashboard', component: () => import('@/views/admin/Dashboard.vue'), meta: { title: '概览' } },
      // 创作
      { path: 'article/write', name: 'admin-article-write', component: () => import('@/views/admin/ArticleWrite.vue'), meta: { title: '写文章' } },
      { path: 'article', name: 'admin-article', component: () => import('@/views/admin/ArticleList.vue'), meta: { title: '文章' } },
      { path: 'article/group', name: 'admin-article-group', component: () => import('@/views/admin/ArticleGroup.vue'), meta: { title: '文章分类' } },
      { path: 'pages', name: 'admin-pages', component: () => import('@/views/admin/PageList.vue'), meta: { title: '页面' } },
      { path: 'pages/write', name: 'admin-pages-write', component: () => import('@/views/admin/PageWrite.vue'), meta: { title: '写页面' } },
      { path: 'moments', name: 'admin-moments', component: () => import('@/views/admin/MomentList.vue'), meta: { title: '动态' } },
      // 管理
      { path: 'users', name: 'admin-users', component: () => import('@/views/admin/UserList.vue'), meta: { title: '用户' } },
      { path: 'comment', name: 'admin-comment', component: () => import('@/views/admin/CommentList.vue'), meta: { title: '评论' } },
      { path: 'placard', name: 'admin-placard', component: () => import('@/views/admin/Placard.vue'), meta: { title: '公告' } },
      { path: 'banner', name: 'admin-banner', component: () => import('@/views/admin/Banner.vue'), meta: { title: '轮播图' } },
      { path: 'tags', name: 'admin-tags', component: () => import('@/views/admin/TagList.vue'), meta: { title: '标签' } },
      { path: 'level', name: 'admin-level', component: () => import('@/views/admin/Level.vue'), meta: { title: '等级' } },
      { path: 'exp', name: 'admin-exp', component: () => import('@/views/admin/Exp.vue'), meta: { title: '经验' } },
      { path: 'message', name: 'admin-message', component: () => import('@/views/admin/Message.vue'), meta: { title: '消息' } },
      { path: 'links', name: 'admin-links', component: () => import('@/views/admin/LinkList.vue'), meta: { title: '友链' } },
      { path: 'links/group', name: 'admin-links-group', component: () => import('@/views/admin/LinkGroup.vue'), meta: { title: '友链分组' } },
      { path: 'attachment', name: 'admin-attachment', component: () => import('@/views/admin/Attachment.vue'), meta: { title: '附件' } },
      { path: 'system', name: 'admin-system', component: () => import('@/views/admin/SystemConfig.vue'), meta: { title: '系统设置' } },
      // 安全
      { path: 'auth/rules', name: 'admin-auth-rules', component: () => import('@/views/admin/AuthRules.vue'), meta: { title: '权限规则' } },
      { path: 'auth/group', name: 'admin-auth-group', component: () => import('@/views/admin/AuthGroup.vue'), meta: { title: '权限组' } },
      { path: 'api/keys', name: 'admin-api-keys', component: () => import('@/views/admin/ApiKeys.vue'), meta: { title: 'API 密钥' } },
      { path: 'auth/pages', name: 'admin-auth-pages', component: () => import('@/views/admin/AuthPages.vue'), meta: { title: '权限页面' } },
      { path: 'ip/black', name: 'admin-ip-black', component: () => import('@/views/admin/IpBlack.vue'), meta: { title: 'IP 黑名单' } },
      { path: 'ip/white', name: 'admin-ip-white', component: () => import('@/views/admin/IpWhite.vue'), meta: { title: 'IP 白名单' } },
      { path: 'qps/warn', name: 'admin-qps-warn', component: () => import('@/views/admin/QpsWarn.vue'), meta: { title: 'QPS 告警' } }
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