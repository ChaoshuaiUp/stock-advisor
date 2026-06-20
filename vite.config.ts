import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  // GitHub Pages 使用 https://<username>.github.io/<repo-name>/ 路径
  // 如果绑定自定义域名（如 www.example.com），将 base 改为 '/' 即可
  base: '/stock-advisor/',
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 3000,
    proxy: {
      // 将所有 /api 请求转发到本地代理服务
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        // 代理超时配置
        timeout: 10000,
        configure: (proxy) => {
          proxy.on('error', (err) => {
            // 代理服务不可用时静默处理（前端会降级到 mock 数据）
            if (process.env.NODE_ENV !== 'test') {
              console.warn('[vite proxy] 代理服务不可用，将降级到 mock 数据:', err.message);
            }
          });
        },
      },
    },
  },
});
