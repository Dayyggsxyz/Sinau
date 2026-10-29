import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { fileURLToPath, URL } from 'node:url'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  server: {
    proxy: {
      // Hanya untuk `npm run dev`: meneruskan /ai-proxy/* ke server AI sehingga browser
      // tidak terkena batasan CORS. Build produksi tidak memakai proxy ini.
      '/ai-proxy': {
        target: 'https://ai.zelai.qzz.io',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/ai-proxy/, ''),
      },
    },
  },
})
