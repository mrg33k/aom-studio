import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        dashboard: resolve(__dirname, 'dashboard.html'),
        'outreach-plan': resolve(__dirname, 'outreach-plan.html'),
        'growth-plan': resolve(__dirname, 'growth-plan.html'),
        'system': resolve(__dirname, 'system.html'),
        'v2': resolve(__dirname, 'v2.html'),
      },
    },
  },
})
