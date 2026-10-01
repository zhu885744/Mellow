/**
 * Mellow 运行时配置
 *
 * 字段说明：
 * - apiUri    后端根地址。
 *             留空 '' 表示「与当前站点同源」——主题由后端自身托管时，
 *             请求会自动打到 /api，即后端自己的地址，换域名/换端口都不用改；
 *             前后端不同源时再填绝对地址，如 'https://api.example.com'。
 * - socketUri socket 地址，如 'wss://api.example.com/socket'；留空表示同源。
 */
window.__INIS_CONFIG__ = {
  apiUri: '',
  socketUri: ''
}