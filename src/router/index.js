import { createRouter, createWebHistory } from 'vue-router'
import { progressStart, progressDone } from '@/utils/progress'
import { applyRouteTitle } from '@/utils/pageTitle'
import { closeLightbox } from '@/utils/lightbox'

const routes = [
  // 安装向导：未安装时后端 Install 中间件会把首页 302 到这里（见 app/middleware/install.go）。
  // 独立于所有布局，且不依赖任何 /api 数据（未安装时 /api 会被拦住）。
  {
    path: '/install',
    name: 'install',
    component: () => import('@/views/install/Index.vue'),
    meta: { title: '安装向导' }
  },
  // 文档站：独立布局（独立侧边栏 + 独立内容区，与 /user 同级）
  // 必须放在 `/` 之前：MainLayout 下最后有 `:key` 兜底路由，否则 /docs 会被它吞掉
  //路径规则：/docs 为项目列表，/docs/:项目 为项目概览，/docs/:项目/:目录/:页面 为正文
    {
      path: '/docs',
      component: () => import('@/views/docs/Layout.vue'),
      children: [
        { path: '', name: 'docs', component: () => import('@/views/docs/Projects.vue') },
        {
          path: ':version',
          name: 'docs-version',
          component: () => import('@/views/docs/Home.vue'),
          props: true
        },
      {
        path: ':version/:group/:slug',
        name: 'docs-detail',
        component: () => import('@/views/docs/Page.vue'),
        props: true
      }
    ]
  },
  {
    path: '/',
    component: () => import('@/layouts/MainLayout.vue'),
    children: [
      { path: '', name: 'home', component: () => import('@/views/home/Index.vue') },
      { path: 'articles', name: 'articles', component: () => import('@/views/article/List.vue') },
      { path: 'archives/:id', name: 'article-detail', component: () => import('@/views/article/Detail.vue') },
      { path: 'archives', name: 'archives', component: () => import('@/views/article/Archives.vue') },
      // 独立的话题云页已并入话题广场（/topics：热度榜 + 搜索 + 我关注的，侧栏的「话题广场」入口也指向它）
      // 旧地址保留重定向，避免老书签 / 站内自定义导航链接失效
      { path: 'tags', name: 'tags', redirect: '/topics' },
      // 话题（Hashtag）：广场 + 聚合页
      // 旧的 /tag/:key 统一重定向到话题页（话题页同时含动态与文章，是话题页的超集）
      { path: 'topics', name: 'topics', component: () => import('@/views/topic/Index.vue') },
      { path: 'topic/:key', name: 'topic', component: () => import('@/views/topic/Detail.vue'), props: true },
      { path: 'tag/:key', name: 'tag', redirect: (to) => ({ path: `/topic/${to.params.key}` }) },
      { path: 'categories', name: 'categories', component: () => import('@/views/article/CategoryList.vue') },
      { path: 'category/:key', name: 'category', component: () => import('@/views/article/CategoryDetail.vue'), props: true },
      // 动态列表页已下线（views/moments 只保留详情页）：列表场景由首页「发现」与 /feed 聚合流承担。
      // 旧地址 /moments 原本是「发动态」页，所以重定向到首页并带 compose=1，落地直接打开发布弹窗
      // （首页 onMounted / watch 处理，见 views/home/Index.vue 的 openComposeFromQuery）
      { path: 'moments', name: 'moments', redirect: { name: 'home', query: { compose: '1' } } },
      { path: 'moments/:id', name: 'moment-detail', component: () => import('@/views/moments/Detail.vue'), props: true },
      // 聚合流（关注 / 推荐 / 热门）：按关注关系算的个性化数据，必须登录
      // （后端 feed 接口同样是 path=all&type=login，见 app/model/auth-rules.go）
      { path: 'feed', name: 'feed', component: () => import('@/views/feed/Index.vue'), meta: { auth: true } },
      { path: 'links', name: 'links', component: () => import('@/views/links/Index.vue') },
      // 搜索 / 签到：原先是弹窗，现改为独立页面（支持 /search?q=xxx&scope=article 直达）
      { path: 'search', name: 'search', component: () => import('@/views/Search.vue') },
      { path: 'checkin', name: 'checkin', component: () => import('@/views/Checkin.vue') },
      // 勋章馆 / 佩戴榜：公开的荣誉墙（按稀有度分组，带持有人数与正在佩戴的用户）
      { path: 'badges', name: 'badges', component: () => import('@/views/badge/Index.vue') },
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
      // 独立页面 /page/:id：按 id 直达（作者页 / 评论通知 / 打赏通知都用 id 形式）
      { path: 'page/:id', name: 'page-detail', component: () => import('@/views/page/Index.vue'), props: true },
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
      // 「我的」聚合页：手机端底栏「我的」的落地页（导航入口 + 信息展示，不承载具体的设置表单）
    { path: '', name: 'user-home', component: () => import('@/views/user/Index.vue'), meta: { title: '我的' } },
      { path: 'profile', name: 'user-profile', component: () => import('@/views/user/Profile.vue') },
      { path: 'settings', name: 'user-settings', component: () => import('@/views/user/Settings.vue') },
      // 「联系方式」页已下线：邮箱 / 手机号改绑并入「账号安全」，个人网站设置并入「个人资料」；
      // 旧地址保留为重定向，避免书签 / 外部链接 404
      { path: 'contact', name: 'user-contact', redirect: '/user/profile' },
      { path: 'security', name: 'user-security', component: () => import('@/views/user/Security.vue') },
      { path: 'exp', name: 'user-exp', component: () => import('@/views/user/Exp.vue') },
      { path: 'integral', name: 'user-integral', component: () => import('@/views/user/Integral.vue') },
      // 我的装扮：查看/佩戴已拥有的头像框与头衔（商城只负责兑换，管理集中在这里）
      { path: 'decorations', name: 'user-decorations', component: () => import('@/views/user/Decorations.vue') },
      // 我的勋章：已获得的勋章 + 未完成的任务条件与进度
      { path: 'badges', name: 'user-badges', component: () => import('@/views/user/Badges.vue') },
      { path: 'notifications', name: 'user-notifications', component: () => import('@/views/user/Notifications.vue') },
      // 拉黑与举报：我的拉黑列表（可解除）+ 我提交的举报与处理进展（可撤回）
      { path: 'blocks', name: 'user-blocks', component: () => import('@/views/user/Blocks.vue') },
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
      // 文档站管理：文档库（项目列表） → 项目内目录/页面 → 独立整页编辑器
      // 三层平级路由：pageOfPath() 会把它们都归到 /admin/docs，共用一个权限点
      { path: 'docs', name: 'admin-docs', component: () => import('@/views/admin/DocsLibrary.vue'), meta: { title: '文档库' } },
      { path: 'docs/:slug', name: 'admin-docs-project', component: () => import('@/views/admin/Docs.vue'), meta: { title: '文档管理' } },
      { path: 'docs/:slug/write', name: 'admin-docs-write', component: () => import('@/views/admin/DocsWrite.vue'), meta: { title: '新建文档' } },
      { path: 'docs/:slug/:id/edit', name: 'admin-docs-edit', component: () => import('@/views/admin/DocsWrite.vue'), meta: { title: '编辑文档' } },
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
      { path: 'tags', name: 'admin-tags', component: () => import('@/views/admin/TagList.vue'), meta: { title: '话题管理' } },
      { path: 'level', name: 'admin-level', component: () => import('@/views/admin/Level.vue'), meta: { title: '等级管理' } },
      { path: 'exp', name: 'admin-exp', component: () => import('@/views/admin/Exp.vue'), meta: { title: '经验管理' } },
      { path: 'goods', name: 'admin-goods', component: () => import('@/views/admin/Goods.vue'), meta: { title: '商品管理' } },
      { path: 'integral', name: 'admin-integral', component: () => import('@/views/admin/Integral.vue'), meta: { title: '积分管理' } },
      // 装扮管理：头像框 / 头衔等装扮的增删改查、批量发放与回收（关联商城商品自动同步）
      { path: 'decoration', name: 'admin-decoration', component: () => import('@/views/admin/Decoration.vue'), meta: { title: '装扮管理' } },
      // 勋章：任务条件（发布文章 / 注册满 N 天…）自动发放 + 手动发放与收回
      { path: 'badges', name: 'admin-badges', component: () => import('@/views/admin/Badges.vue'), meta: { title: '勋章管理' } },
      // 签到配置（独立模块：奖励项 / 周期 / 里程碑 / 月全勤 / 随机奖励 / 补签）
      { path: 'checkin', name: 'admin-checkin', component: () => import('@/views/admin/Checkin.vue'), meta: { title: '签到管理' } },
      // 举报管理：处理用户提交的举报（属实可同时移除内容，封禁仍走用户管理）
      { path: 'reports', name: 'admin-reports', component: () => import('@/views/admin/Reports.vue'), meta: { title: '举报管理' } },
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
      // 日志解析：只读查看 runtime/ 下的系统日志与通知日志（后端 app/api/controller/log.go）
      { path: 'logs', name: 'admin-logs', component: () => import('@/views/admin/Logs.vue'), meta: { title: '日志' } },
      // 数据统计：消费服务端 socket 每秒推送的实时状态（app/socket/controller/status.go）
      { path: 'stats', name: 'admin-stats', component: () => import('@/views/admin/Stats.vue'), meta: { title: '数据统计' } },
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
      // 第三方登录回调页（QQ / GitHub / Gitee 授权后跳回，见 views/auth/OAuth.vue）
      // 必须与其他 auth 子页同一个回调地址，因此不带 query（平台信息记在 sessionStorage）
      { path: 'oauth', name: 'auth-oauth', component: () => import('@/views/auth/OAuth.vue') }
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
  // 灯箱是全局单例状态（utils/lightbox），跨布局切换时可能残留：
  // 例如在后台点了轮播图 / 举报证据图，当时没有灯箱组件接管，状态一直停在 visible，
  // 切回前台布局后就会「凭空」弹出来。这里每次路由切换都强制关闭。
  closeLightbox()
})

export default router