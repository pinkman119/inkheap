import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  base: './',
  plugins: [vue()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    port: 5173,
    open: false,
    proxy: {
      // 代理上传的静态资源到后端，开发环境前端(5173)可直接通过 /files 访问
      '/files': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
      // 代理 API 请求到后端（含 RSS：/api/feed.xml），与线上 Nginx 转发行为保持一致
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
  build: {
    target: 'es2018',
    cssCodeSplit: true,
    chunkSizeWarningLimit: 700,
  },
})
