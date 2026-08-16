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
          changeOrigin: true
        },
        // 静态资源（含表情图片、上传附件等）也转发到后端
        '/assets': {
          target: API_URI,
          changeOrigin: true
        },
        '/socket': {
          target: SOCKET_URI,
          ws: true,
          changeOrigin: true
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
