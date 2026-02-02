import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(() => ({
  plugins: [react()],
  // For GitHub Pages project sites you may need a subpath base (e.g. /b4thegame/).
  // For custom domains and most hosts, base should be '/'.
  base: process.env.VITE_BASE || (process.env.GITHUB_ACTIONS ? '/b4thegame/' : '/'),
  server: {
    proxy: {
      '/api': 'http://127.0.0.1:3000'
    }
  }
}))
