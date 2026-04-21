import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // 检测是否在 Electron 环境中
  const isElectron = process.env.ELECTRON_MODE === 'true'
  
  return {
    plugins: [react()],
    // Electron 环境下使用相对路径，网页版使用绝对路径
    base: isElectron ? './' : '/renyuan/',
    server: {
      port: 5175,
      // Electron 环境下允许外部访问
      host: isElectron ? '127.0.0.1' : 'localhost'
    },
    build: {
      // Electron 生产构建配置
      outDir: 'dist',
      assetsDir: 'assets',
      // 确保生成的资源使用相对路径
      assetsInlineLimit: 0,
      rollupOptions: {
        output: {
          // 确保 chunk 文件名稳定
          entryFileNames: 'assets/[name]-[hash].js',
          chunkFileNames: 'assets/[name]-[hash].js',
          assetFileNames: (assetInfo) => {
            const info = assetInfo.name || ''
            if (info.endsWith('.css')) {
              return 'assets/[name]-[hash][extname]'
            }
            return 'assets/[name]-[hash][extname]'
          }
        }
      }
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src')
      }
    },
    // 优化依赖预构建
    optimizeDeps: {
      include: ['react', 'react-dom', 'xlsx']
    }
  }
})
