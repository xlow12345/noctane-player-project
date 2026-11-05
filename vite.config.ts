import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

const host = process.env.TAURI_DEV_HOST

export default defineConfig({
  plugins: [react(), tailwindcss()],
  clearScreen: false,
  server: {
    host: host || '127.0.0.1',
    port: 1420,
    strictPort: true,
    watch: {
      ignored: ['**/target/**'],
    },
    ...(host
      ? {
          hmr: {
            host,
            port: 1421,
          },
        }
      : {}),
  },
})
