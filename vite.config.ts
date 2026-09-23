import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath, URL } from 'node:url'

// Vite 配置：注册 Vue 插件，配置 @ 别名指向 src
export default defineConfig({
  // 相对路径打包：部署到 GitHub Pages 任意子目录（/仓库名/）都能正常加载资源
  base: './',
  plugins: [vue()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    }
  },
  server: {
    port: 5173
  }
})
