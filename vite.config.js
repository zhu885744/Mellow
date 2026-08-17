import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'
import path from 'path'

export default defineConfig(({ mode }) => {
  // 读取 .env 中的后端地址（VITE_API_URI 等）
  const env = loadEnv(mode, process.cwd(), '')
  const API_URI = env.VITE_API_URI || 'https://cs.zhuxu.asia'
  const SOCKET_URI = env.VITE_SOCKET || 'wss://cs.zhuxu.asia/socket'

  return {
    plugins: [vue()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src')
      }
    },
    server: {
      port: 5173,
      host: '0.0.0.0',
      proxy: {
        '/api': {
          target: API_URI,
          changeOrigin: true,
          // 后端登录写入的 Set-Cookie 带 Domain=cs.zhuxu.asia，
          // 浏览器在 localhost 下会拒绝保存，需改写为空（即当前域），开发态才能保持登录态
          cookieDomainRewrite: '',
          cookiePathRewrite: '/'
        },
        // 静态资源（含表情图片、上传附件等）也转发到后端
        '/assets': {
          target: API_URI,
          changeOrigin: true,
          cookieDomainRewrite: '',
          cookiePathRewrite: '/'
        },
        '/socket': {
          target: SOCKET_URI,
          ws: true,
          changeOrigin: true
        },
        // dev 类接口（如 /dev/info/time 服务器时间，用于登录加密盐派生），不走 /api 前缀
        '/dev': {
          target: API_URI,
          changeOrigin: true,
          cookieDomainRewrite: '',
          cookiePathRewrite: '/'
        }
      }
    },
    build: {
      outDir: 'dist',
      sourcemap: false,
      chunkSizeWarningLimit: 1500
    }
  }
})
