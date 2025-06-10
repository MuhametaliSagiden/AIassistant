import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: {
    minify: false // отключить минификацию
    // или использовать esbuild вместо terser:
    // minify: 'esbuild'
  }
})
