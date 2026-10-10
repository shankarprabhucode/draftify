/// <reference types="vitest/config" />
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig, type Plugin } from 'vite'

/** Dev only: serve /app (no trailing slash) like Vercel does in production. */
const appIndex = (): Plugin => ({
  name: 'app-index',
  configureServer(server) {
    server.middlewares.use((req, _res, next) => {
      if (req.url === '/app' || req.url?.startsWith('/app?')) req.url = '/app/index.html' + req.url.slice(4)
      next()
    })
  },
})

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss(), appIndex()],
  // Multi-page: no SPA fallback, so /app resolves to app/index.html in dev too.
  appType: 'mpa',
  build: {
    rollupOptions: {
      // Two pages: the marketing site at / and the app at /app.
      input: { site: 'index.html', app: 'app/index.html' },
    },
  },
  server: {
    // Forward /api/* to the FastAPI server so the browser never deals with CORS.
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/test/setup.ts',
    css: false,
  },
})
