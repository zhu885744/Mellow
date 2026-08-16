import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import path from 'path'

export default defineConfig({
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
        target: 'https://cs.zhuxu.asia',
        changeOrigin: true
      },
      // 静态资源（含表情图片、上传附件等）也转发到后端
      '/assets': {
        target: 'https://cs.zhuxu.asia',
        changeOrigin: true
      },
      '/socket': {
        target: 'wss://cs.zhuxu.asia',
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
})
