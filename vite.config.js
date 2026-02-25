import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: true,   // expose on LAN (0.0.0.0)
    port: 5173,
    proxy: {
      // Proxy REST API calls to the backend
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
      // Proxy WebSocket connections to the backend
      '/ws': {
        target: 'ws://localhost:3001',
        ws: true,
        changeOrigin: true,
      },
    },
  },
})
