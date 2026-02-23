import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  base: '/',
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
  server: {
    port: 7200,
    proxy: {
      '/api': {
        target: 'http://localhost:7210',
        changeOrigin: true,
      },
      '/ws': {
        target: 'ws://localhost:7210',
        ws: true,
      },
    },
  },
})
