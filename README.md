# INIS 博客主题

基于 Vue 3 + Vite + 纯 HTML/CSS/JS 开发的三栏轻量博客主题，对接 INIS 后端 API。

## 功能模块

- 首页（导航卡片 + 最新文章）
- 文章列表 / 文章详情（含评论）
- 动态（Moments）瀑布流
- 友链（按分组）
- 登录 / 注册 / 找回密码 / 重置密码
- 用户中心（资料、收藏、点赞、动态、通知、签到、注销）

## 技术栈

- **Vue 3** + Vue Router + Pinia
- **Vite** 构建
- **Axios** 请求
- **markdown-it** 渲染
- 纯 CSS（CSS 变量 + 响应式）

## 启动

```bash
npm install
npm run dev
```

默认开发端口 `5173`，通过 `vite.config.js` 中的 `proxy` 转发 `/api` 到后端 `http://localhost:8000`。

## 构建

```bash
npm run build
```

生成静态文件至 `dist/`，可作为静态资源部署至任何 CDN / Nginx。

## 后端约定

- 基础路径：`/api/{controller}/{method}`
- 鉴权方式：Cookie + JWT（`token`），由 `comm/login` 颁发
- 响应：`{ code, msg, data }`
- 状态码：200 成功 / 401 未登录 / 403 无权 / 412 Token 缺失

## 目录结构

```
src/
├── api/            # axios 封装与各控制器请求模块
├── assets/         # 全局样式
├── components/     # 通用组件
├── layouts/        # 三栏布局
├── router/         # 路由
├── stores/         # pinia 状态（用户、通知）
├── utils/          # 工具（时间、markdown 渲染等）
└── views/          # 页面
    ├── home/
    ├── article/
    ├── moments/
    ├── links/
    ├── auth/       # 登录、注册、找回密码
    └── user/       # 用户中心
```
