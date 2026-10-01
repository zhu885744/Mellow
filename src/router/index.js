import { createRouter, createWebHistory } from 'vue-router'
import { progressStart, progressDone } from '@/utils/progress'
import { applyRouteTitle } from '@/utils/pageTitle'

const routes = [
  // 安装向导：未安装时后端 Install 中间件会把首页 302 到这里（见 app/middleware/install.go）。
  // 独立于所有布局，且不依赖任何 /api 数据（未安装时 /api 会被拦住）。
  {
    path: '/install',
    name: 'install',
    component: () => import('@/views/install/Index.vue'),
    meta: { title: '安装向导' }
  },
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
      // 搜索 / 签到：原先是弹窗，现改为独立页面（支持 /search?q=xxx&scope=article 直达）
      { path: 'search', name: 'search', component: () => import('@/views/Search.vue') },
      { path: 'checkin', name: 'checkin', component: () => import('@/views/Checkin.vue') },
      { path: 'goods', name: 'goods', component: () => import('@/views/goods/Index.vue') },
      { path: 'about', name: 'about', component: () => import('@/views/page/Index.vue'), props: { pageKey: 'about' } },
      // 用户协议 / 隐私协议：内容取自站点配置 Mellow_functions.auth_dialog_agreement
      // （与登录弹窗里的协议弹窗同一份内容；必须注册在下面的 /:key 兜底路由之前）
      {
        path: 'agreement',
        name: 'agreement',
        component: () => import('@/views/Agreement.vue'),
        props: { type: 'user' },
        // 标签标题会显示成「用户协议 - 站点名」（与页面 H1 一致）
        meta: { title: '用户协议' }
      },
      {
        path: 'privacy',
        name: 'privacy',
        component: () => import('@/views/Agreement.vue'),
        props: { type: 'privacy' },
        meta: { title: '隐私协议' }
      },
      // 用户主页 /author/:id（必须在 /:key 之前，避免被兜底路由拦截）
      { path: 'author/:id', name: 'author', component: () => import('@/views/user/Author.vue'), props: true },
      // 独立页面 /:key（必须放在最后，避免与其他固定路径冲突）
      { path: ':key', name: 'page', component: () => import('@/views/page/Index.vue'), props: (route) => ({ pageKey: route.params.key }) },
    ]
  },
  // 用户中心：与 /admin 一样是独立于前台 MainLayout 的顶级路由，拥有自己的完整布局
  {
    path: '/user',
    component: () => import('@/views/user/Layout.vue'),
    meta: { auth: true },
    children: [
      { path: '', redirect: '/user/profile' },
      { path: 'profile', name: 'user-profile', component: () => import('@/views/user/Profile.vue') },
      { path: 'settings', name: 'user-settings', component: () => import('@/views/user/Settings.vue') },
      { path: 'contact', name: 'user-contact', component: () => import('@/views/user/Contact.vue') },
      { path: 'reward', name: 'user-reward', component: () => import('@/views/user/Reward.vue') },
      { path: 'security', name: 'user-security', component: () => import('@/views/user/Security.vue') },
      { path: 'exp', name: 'user-exp', component: () => import('@/views/user/Exp.vue') },
      { path: 'integral', name: 'user-integral', component: () => import('@/views/user/Integral.vue') },
      { path: 'notifications', name: 'user-notifications', component: () => import('@/views/user/Notifications.vue') },
      // 站点配置（管理员）：已迁至后台 /admin/system 的「网站设置」模块，旧地址保留为重定向
      {
        path: 'site',
        name: 'user-site',
        redirect: { path: '/admin/system', query: { tab: 'site' } },
        meta: { auth: true }
      }
    ]
  },
  // 创作中心：与 /admin 一样是独立于前台 MainLayout 的顶级路由，拥有自己的完整布局
  {
    path: '/manage',
    component: () => import('@/views/manage/Layout.vue'),
    meta: { auth: true },
    children: [
      { path: '', name: 'manage', component: () => import('@/views/manage/Index.vue') },
      { path: 'moments', name: 'manage-moments', component: () => import('@/views/manage/Moments.vue') },
      { path: 'posts', name: 'manage-posts', component: () => import('@/views/manage/Posts.vue') },
      { path: 'posts/write', name: 'manage-post-write', component: () => import('@/views/manage/PostWrite.vue') },
      { path: 'posts/edit/:id', name: 'manage-post-edit', component: () => import('@/views/manage/PostWrite.vue') },
      { path: 'links', name: 'manage-links', component: () => import('@/views/manage/Links.vue') }
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
      { path: 'article/write', name: 'admin-article-write', component: () => import('@/views/admin/ArticleWrite.vue'), meta: { title: '撰写文章' } },
      { path: 'article/edit/:id', name: 'admin-article-edit', component: () => import('@/views/admin/ArticleWrite.vue'), meta: { title: '编辑文章' } },
      // 文章管理：Articles.vue 承载统计概览，ArticleList.vue 为列表子路由（子页通过 inject 联动筛选）
      // 注意：article/write 与 article/edit/:id 是平级路由，不受此处嵌套影响
      {
        path: 'article',
        component: () => import('@/views/admin/Articles.vue'),
        meta: { title: '文章管理' },
        children: [
          { path: '', name: 'admin-article', component: () => import('@/views/admin/ArticleList.vue'), meta: { title: '文章管理' } }
        ]
      },
      { path: 'article/group', name: 'admin-article-group', component: () => import('@/views/admin/ArticleGroup.vue'), meta: { title: '文章分类' } },
      { path: 'pages', name: 'admin-pages', component: () => import('@/views/admin/PageList.vue'), meta: { title: '独立页面' } },
      { path: 'pages/write', name: 'admin-pages-write', component: () => import('@/views/admin/PageWrite.vue'), meta: { title: '撰写独立页面' } },
      { path: 'pages/edit/:id', name: 'admin-pages-edit', component: () => import('@/views/admin/PageWrite.vue'), meta: { title: '编辑独立页面' } },
      // 动态管理：Moments.vue 承载统计概览，MomentList.vue 为列表子路由（子页通过 inject 联动筛选）
      {
        path: 'moments',
        component: () => import('@/views/admin/Moments.vue'),
        meta: { title: '动态管理' },
        children: [
          { path: '', name: 'admin-moments', component: () => import('@/views/admin/MomentList.vue'), meta: { title: '动态管理' } }
        ]
      },
      // 管理
      // 用户管理：Users.vue 承载统计概览，UserList.vue 为列表子路由（子页通过 inject 联动筛选）
      {
        path: 'users',
        component: () => import('@/views/admin/Users.vue'),
        meta: { title: '用户管理' },
        children: [
          { path: '', name: 'admin-users', component: () => import('@/views/admin/UserList.vue'), meta: { title: '用户管理' } }
        ]
      },
      // 评论管理：Comments.vue 承载统计概览，CommentList.vue 为列表子路由（子页通过 inject 联动筛选）
      {
        path: 'comment',
        component: () => import('@/views/admin/Comments.vue'),
        meta: { title: '评论管理' },
        children: [
          { path: '', name: 'admin-comment', component: () => import('@/views/admin/CommentList.vue'), meta: { title: '评论管理' } }
        ]
      },
      { path: 'placard', name: 'admin-placard', component: () => import('@/views/admin/Placard.vue'), meta: { title: '公告管理' } },
      { path: 'banner', name: 'admin-banner', component: () => import('@/views/admin/Banner.vue'), meta: { title: '轮播管理' } },
      { path: 'tags', name: 'admin-tags', component: () => import('@/views/admin/TagList.vue'), meta: { title: '标签管理' } },
      { path: 'level', name: 'admin-level', component: () => import('@/views/admin/Level.vue'), meta: { title: '等级管理' } },
      { path: 'exp', name: 'admin-exp', component: () => import('@/views/admin/Exp.vue'), meta: { title: '经验管理' } },
      { path: 'goods', name: 'admin-goods', component: () => import('@/views/admin/Goods.vue'), meta: { title: '商品管理' } },
      { path: 'integral', name: 'admin-integral', component: () => import('@/views/admin/Integral.vue'), meta: { title: '积分管理' } },
      // 签到配置（独立模块：奖励项 / 周期 / 里程碑 / 月全勤 / 随机奖励 / 补签）
      { path: 'checkin', name: 'admin-checkin', component: () => import('@/views/admin/Checkin.vue'), meta: { title: '签到管理' } },
      { path: 'message', name: 'admin-message', component: () => import('@/views/admin/Message.vue'), meta: { title: '消息管理' } },
      // 友链管理：Links.vue 承载统计概览，LinkList.vue 为列表子路由（子页通过 inject 联动筛选）
      {
        path: 'links',
        component: () => import('@/views/admin/Links.vue'),
        meta: { title: '友链管理' },
        children: [
          { path: '', name: 'admin-links', component: () => import('@/views/admin/LinkList.vue'), meta: { title: '友链管理' } }
        ]
      },
      { path: 'links/group', name: 'admin-links-group', component: () => import('@/views/admin/LinkGroup.vue'), meta: { title: '友链分组' } },
      { path: 'attachment', name: 'admin-attachment', component: () => import('@/views/admin/Attachment.vue'), meta: { title: '附件管理' } },
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
      { path: 'forgot', name: 'forgot', component: () => import('@/views/auth/Forgot.vue') },
      // 注册邮箱验证落地页：邮件里的链接形如 /auth/verify?token=xxx
      { path: 'verify', name: 'verify-email', component: () => import('@/views/auth/VerifyEmail.vue') }
    ]
  },
  // 小黑屋（封禁公示）：独立于前台 MainLayout 的顶级路由，页面自己撑满视口，
  // 不带左右栏 / 顶栏 / 页脚等任何布局与导航组件（与 /404 同级，路径仍是 /blackroom）
  { path: '/blackroom', name: 'blackroom', component: () => import('@/views/Blackroom.vue'), meta: { title: '小黑屋' } },
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
  progressStart()
  if (to.meta.auth) {
    const userStr = localStorage.getItem('blog_user')
    if (!userStr || userStr === 'null') {
      next({ name: 'login', query: { redirect: to.fullPath } })
      return
    }
  }
  next()
})

router.afterEach((to) => {
  progressDone()
  // 浏览器标签标题：meta.title（后台各页已用它作为页面名）- 站点名
  // 每次切换路由都会重算，因此不会出现「停在上一页标题」的情况，见 utils/pageTitle.js
  applyRouteTitle(to)
})

export default router