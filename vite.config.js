import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  base: '/pinewood-derby-report/',  // GitHub Pages repo name
  optimizeDeps: {
    exclude: ['sql.js']
  },
  build: {
    outDir: 'dist',
    sourcemap: true
  }
})
