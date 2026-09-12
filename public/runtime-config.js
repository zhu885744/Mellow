/**
 * Mellow 运行时配置
 *
 * 该文件会被 Vite 原样拷贝到打包产物 dist/ 目录，
 * 与 index.html 一起部署到后端 public 目录后，可以随时修改本文件，
 * 无需重新打包前端。
 *
 * 字段说明：
 * - apiUri    后端根地址。
 *             留空 '' 表示「与当前站点同源」——主题由后端自身托管时，
 *             请求会自动打到 /api，即后端自己的地址，换域名/换端口都不用改；
 *             前后端不同源时再填绝对地址，如 'https://api.example.com'。
 * - socketUri socket 地址，如 'wss://api.example.com/socket'；留空表示同源。
 *
 * 取值优先级：本文件 > 打包时的 .env（VITE_API_URI / VITE_SOCKET）。
 * 注意：删除字段 = 继续沿用打包时的 .env 配置；显式留空 = 强制同源。
 */
window.__INIS_CONFIG__ = {
  apiUri: '',
  socketUri: ''
}
